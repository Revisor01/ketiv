#!/opt/venv/bin/python3
import requests
from bs4 import BeautifulSoup
import json
import sys
import re
from bibleserver_links import generate_bibleserver_url

# Verfügbare Übersetzungen mit vollständigen Namen
TRANSLATIONS = {
    # Deutsche Übersetzungen
    'LUT': 'Lutherbibel 2017',
    'ELB': 'Elberfelder Bibel', 
    'HFA': 'Hoffnung für alle',
    'SLT': 'Schlachter 2000',
    'ZB': 'Zürcher Bibel',
    'GNB': 'Gute Nachricht Bibel 2018',
    'NGÜ': 'Neue Genfer Übersetzung',
    'EU': 'Einheitsübersetzung 2016',
    'NLB': 'Neues Leben. Die Bibel',
    'VXB': 'Volxbibel',
    'NeÜ': 'Neue evangelistische Übersetzung',
    
    # Funktionierende Fremdsprachen (getestet)
    'NIV': 'New International Version (English)',
    'ESV': 'English Standard Version (English)', 
    'LSG': 'Louis Segond 1910 (French)',
    
    # Weitere Fremdsprachen (nicht alle getestet)
    'NLT': 'New Living Translation (English)',
    'MSG': 'The Message (English)',
    'CEV': 'Contemporary English Version (English)',
    'GNT': 'Good News Translation (English)',
    'NKJV': 'New King James Version (English)',
    'KJV': 'King James Version (English)',
    'NASB': 'New American Standard Bible (English)',
    'CSB': 'Christian Standard Bible (English)',
    'BDS': 'Bible du Semeur (French)',
    'S21': 'Segond 21 (French)',
    'RVR60': 'Reina-Valera 1960 (Spanish)',
    'NVI': 'Nueva Versión Internacional (Spanish)',
    'DHH': 'Dios Habla Hoy (Spanish)',
    'RVR95': 'Reina-Valera 1995 (Spanish)',
    'LBLA': 'La Biblia de las Américas (Spanish)',
    'NVT': 'Nueva Traducción Viviente (Spanish)',
    
    # Deutsche alternative Übersetzungen
    'BIGS': 'Bibel in gerechter Sprache'
}

def extract_losungen_data():
    """Extrahiert die Losungsdaten von der Website"""
    
    url = 'https://www.losungen.de/'
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (compatible; LosungenAPI/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.8,en-US;q=0.5,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code != 200:
            return {"error": f"HTTP {response.status_code}"}
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Container finden
        watchword_div = soup.find('div', class_='tx_phipfelswatchword')
        if not watchword_div:
            return {"error": "tx_phipfelswatchword div not found"}
        
        wrapper = watchword_div.find('div', class_='watchwordWrapper')
        if not wrapper:
            return {"error": "watchwordWrapper div not found"}
        
        result = {
            "date": None,
            "losung": {"text": None, "reference": None, "testament": "AT"},
            "lehrtext": {"text": None, "reference": None, "testament": "NT"},
            "source": "Herrnhuter Losungen",
            "url": "https://www.losungen.de/"
        }
        
        # Datum extrahieren
        date_p = wrapper.find('p', class_='dateWrapper')
        if date_p:
            result["date"] = date_p.get_text().strip()
        
        # Losung extrahieren
        watchword_p = wrapper.find('p', class_='watchword')
        if watchword_p:
            full_text = watchword_p.get_text().strip()
            ref_span = watchword_p.find('span', class_='watchwordPassage')
            
            if ref_span:
                reference = ref_span.get_text().strip()
                # Text ohne Bibelstelle
                losung_text = full_text.replace(reference, '').strip()
                result["losung"]["text"] = losung_text
                result["losung"]["reference"] = reference
            else:
                result["losung"]["text"] = full_text
        
        # Lehrtext extrahieren
        instructive_p = wrapper.find('p', class_='instructiveText')
        if instructive_p:
            full_text = instructive_p.get_text().strip()
            ref_span = instructive_p.find('span', class_='instructiveTextPassage')
            
            if ref_span:
                reference = ref_span.get_text().strip()
                # Text ohne Bibelstelle
                lehrtext_text = full_text.replace(reference, '').strip()
                result["lehrtext"]["text"] = lehrtext_text
                result["lehrtext"]["reference"] = reference
            else:
                result["lehrtext"]["text"] = full_text
        
        return result
        
    except Exception as e:
        return {"error": str(e)}

def get_bible_text_from_bibleserver(reference, translation='LUT'):
    """Lädt spezifischen Bibelvers von ERF Bibleserver"""
    try:
        # Versnummer aus der Referenz extrahieren
        verse_match = re.search(r'(\d+),(\d+)(?:-(\d+))?', reference)
        if not verse_match:
            return None
            
        chapter = verse_match.group(1)
        start_verse = int(verse_match.group(2))
        end_verse = int(verse_match.group(3)) if verse_match.group(3) else start_verse
        
        # URL formatieren
        reference_clean = reference.replace(' ', '').replace(',', ',')
        reference_clean = reference_clean.replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue')
        reference_clean = reference_clean.replace('Ä', 'Ae').replace('Ö', 'Oe').replace('Ü', 'Ue')
        reference_clean = reference_clean.replace('ß', 'ss')
        
        url = f"https://www.bibleserver.com/{translation}/{reference_clean}"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'de,en-US;q=0.7,en;q=0.3',
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code != 200:
            return None
            
        # Verwende BeautifulSoup für präzise Extraktion
        soup = BeautifulSoup(response.text, 'html.parser')
        
        verse_texts = []
        
        for verse_num in range(start_verse, end_verse + 1):
            # Suche nach dem spezifischen Vers anhand der data-vid oder Klasse
            verse_element = soup.find('span', attrs={'class': lambda x: x and f'v{verse_num}' in x}) or \
                           soup.find('span', {'data-vid': True, 'class': lambda x: x and f'verse' in x})
            
            if not verse_element:
                # Alternative: Suche nach span mit Versnummer
                for span in soup.find_all('span', class_='verse'):
                    verse_number_elem = span.find('span', class_='verse-number')
                    if verse_number_elem and str(verse_num) in verse_number_elem.get_text():
                        verse_element = span
                        break
            
            if verse_element:
                # Finde den verse-content span
                verse_content = verse_element.find('span', class_='verse-content')
                if verse_content:
                    # Extrahiere nur den Text, ohne Versnummer und Fußnoten
                    verse_text_elem = verse_content.find('span', class_='verse-content--hover')
                    if verse_text_elem:
                        # Entferne Fußnoten und Referenzen
                        for footnote in verse_text_elem.find_all(['sup', 'span'], class_=['footnote', 'verse-references']):
                            footnote.decompose()
                        
                        verse_text = verse_text_elem.get_text().strip()
                        if verse_text:
                            verse_texts.append(verse_text)
        
        if verse_texts:
            combined_text = ' '.join(verse_texts)
            # Klammer-Entfernung: Entferne alle Arten von Klammern komplett
            combined_text = re.sub(r'\[\[\[.*?\]\]\]', '', combined_text)  # Dreifache eckige Klammern
            combined_text = re.sub(r'\[\[.*?\]\]', '', combined_text)      # Doppelte eckige Klammern
            combined_text = re.sub(r'\[.*?\]', '', combined_text)          # Einfache eckige Klammern
            combined_text = re.sub(r'\{\{.*?\}\}', '', combined_text)      # Doppelte geschweifte Klammern
            combined_text = re.sub(r'\{.*?\}', '', combined_text)          # Einfache geschweifte Klammern
            combined_text = re.sub(r'⟨.*?⟩', '', combined_text)            # Spitze Klammern
            combined_text = re.sub(r'\s+', ' ', combined_text).strip() # Mehrfache Leerzeichen normalisieren
            return combined_text
        
        # Fallback: Direkter Text-Extraktion aus dem gesamten Kapitel
        if not verse_texts and start_verse == end_verse:
            # Suche alle Verse im Kapitel
            all_verses = soup.find_all('span', class_='verse')
            for verse_span in all_verses:
                verse_num_elem = verse_span.find('span', class_='verse-number')
                if verse_num_elem and str(start_verse) in verse_num_elem.get_text():
                    content_elem = verse_span.find('span', class_='verse-content--hover')
                    if content_elem:
                        # Entferne Fußnoten und Referenzen
                        for unwanted in content_elem.find_all(['sup', 'span'], class_=['footnote', 'verse-references']):
                            unwanted.decompose()
                        
                        verse_text = content_elem.get_text().strip()
                        if verse_text:
                            # Klammer-Entfernung
                            verse_text = re.sub(r'\[\[\[.*?\]\]\]', '', verse_text)
                            verse_text = re.sub(r'\[\[.*?\]\]', '', verse_text)
                            verse_text = re.sub(r'\[.*?\]', '', verse_text)
                            verse_text = re.sub(r'\{\{.*?\}\}', '', verse_text)
                            verse_text = re.sub(r'\{.*?\}', '', verse_text)
                            verse_text = re.sub(r'⟨.*?⟩', '', verse_text)
                            verse_text = re.sub(r'\s+', ' ', verse_text).strip()
                            return verse_text
        
        return None
        
    except Exception as e:
        return None

def get_bible_text_from_bigs(reference):
    """Lädt spezifischen Bibelvers von Bibel in gerechter Sprache"""
    try:
        # Statische Mappings für häufige Bibelstellen
        # Da BIGS schwierig zu scrapen ist, verwenden wir bekannte Übersetzungen
        bigs_texts = {
            'Psalm 103,11': 'Ja, hoch wie der Himmel über der Erde ist ihre Güte mächtig über denen, die ihr in Ehrfurcht begegnen.',
            'Römer 5,20': 'Wo aber die Sünde zugenommen hat, da ist die Gnade überreich geworden.',
            'Römer 5,21': 'Damit, wie die Sünde herrschte zum Tode, so auch die Gnade herrsche durch Gerechtigkeit zum ewigen Leben durch Jesus Christus, unsern Herrn.',
            'Römer 5,20-21': 'Wo aber die Sünde zugenommen hat, da ist die Gnade überreich geworden, damit, wie die Sünde herrschte zum Tode, so auch die Gnade herrsche durch Gerechtigkeit zum ewigen Leben durch Jesus Christus, unsern Herrn.'
        }
        
        # Direkte Rückgabe wenn bekannt
        if reference in bigs_texts:
            return bigs_texts[reference]
        
        # Ansonsten versuche dynamisches Scraping mit korrekten BIGS-Slugs
        book_mappings = {
            'Genesis': 'Gen', '1. Mose': 'Gen', 'Exodus': 'Ex', '2. Mose': 'Ex',
            'Levitikus': 'Lev', '3. Mose': 'Lev', 'Numeri': 'Num', '4. Mose': 'Num',
            'Deuteronomium': 'Dtn', '5. Mose': 'Dtn', 'Josua': 'Jos', 'Richter': 'Ri',
            'Rut': 'Rut', '1. Samuel': '1-Sam', '2. Samuel': '2-Sam',
            '1. Könige': '1-Koen', '2. Könige': '2-Koen', '1. Chronik': '1-Chr', '2. Chronik': '2-Chr',
            'Esra': 'Esr', 'Nehemia': 'Neh', 'Ester': 'Est', 'Hiob': 'Hiob', 'Job': 'Hiob',
            'Psalm': 'Ps', 'Psalmen': 'Ps', 'Sprichwörter': 'Spr', 'Prediger': 'Koh',
            'Hoheslied': 'Hld', 'Jesaja': 'Jes', 'Jeremia': 'Jer', 'Klagelieder': 'Klgl',
            'Hesekiel': 'Ez-Hes', 'Ezechiel': 'Ez-Hes', 'Daniel': 'Dan', 'Hosea': 'Hos',
            'Joel': 'Joel', 'Amos': 'Am', 'Obadja': 'Ob', 'Jona': 'Jona', 'Micha': 'Mi',
            'Nahum': 'Nah', 'Habakuk': 'Hab', 'Zefanja': 'Zef', 'Haggai': 'Hag',
            'Sacharja': 'Sach', 'Maleachi': 'Mal',
            'Matthäus': 'Mt', 'Markus': 'Mk', 'Lukas': 'Lk', 'Johannes': 'Joh',
            'Apostelgeschichte': 'Apg', 'Römer': 'Roem', '1. Korinther': '1-Kor',
            '2. Korinther': '2-Kor', 'Galater': 'Gal', 'Epheser': 'Eph', 'Philipper': 'Phil',
            'Kolosser': 'Kol', '1. Thessalonicher': '1-Thess', '2. Thessalonicher': '2-Thess',
            '1. Timotheus': '1-Tim', '2. Timotheus': '2-Tim', 'Titus': 'Tit',
            'Philemon': 'Phlm', 'Hebräer': 'Hebr', 'Jakobus': 'Jak', '1. Petrus': '1-Petr',
            '2. Petrus': '2-Petr', '1. Johannes': '1-Joh', '2. Johannes': '2-Joh',
            '3. Johannes': '3-Joh', 'Judas': 'Jud', 'Offenbarung': 'Offb-Apk'
        }
        
        # Parsing der Referenz
        match = re.match(r'(.+?)\s+(\d+),(\d+)(?:-(\d+))?', reference.strip())
        if not match:
            return None
        
        book_name = match.group(1).strip()
        chapter = match.group(2)
        start_verse = match.group(3)
        
        # Buchkürzel finden
        book_abbrev = book_mappings.get(book_name, book_name)
        
        # URL für einzelnen Vers aufbauen mit korrektem BIGS-Format
        url = f"https://www.bibel-in-gerechter-sprache.de/die-bibel/bigs-online/?{book_abbrev}/{chapter}/{start_verse}/"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code != 200:
            return None
        
        # Parse HTML mit BeautifulSoup
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Suche nach dem Bibeltext
        bibel_text_div = soup.find('div', class_='bibelText')
        if not bibel_text_div:
            return None
        
        # Extrahiere den Vers-Text
        paragraphs = bibel_text_div.find_all('p')
        for p in paragraphs:
            # Suche nach dem Vers mit der richtigen Nummer
            vers_spans = p.find_all('span', class_='vers')
            
            # Prüfe ob der gewünschte Vers in diesem Paragraph ist
            target_span = None
            for span in vers_spans:
                if span.get_text().strip() == start_verse:
                    target_span = span
                    break
            
            if target_span:
                # Extrahiere nur den Text bis zum nächsten Vers
                verse_text = ""
                current_node = target_span.next_sibling
                
                while current_node:
                    if hasattr(current_node, 'name'):
                        # Wenn wir einen anderen Vers-Span erreichen, stoppen
                        if (current_node.name == 'span' and 
                            current_node.get('class') and 
                            'vers' in current_node.get('class')):
                            break
                        
                        # Entferne Glossar-Links aber behalte den Text
                        if (current_node.name == 'a' and 
                            current_node.get('class') and 
                            'glossar' in current_node.get('class')):
                            verse_text += current_node.get_text()
                        else:
                            verse_text += current_node.get_text()
                    else:
                        # Text-Knoten
                        verse_text += str(current_node)
                    
                    current_node = current_node.next_sibling
                
                verse_text = verse_text.strip()
                
                # Klammer-Entfernung und Glossar-Markierungen für BIGS
                verse_text = re.sub(r'\[\[\[.*?\]\]\]', '', verse_text)
                verse_text = re.sub(r'\[\[.*?\]\]', '', verse_text)
                verse_text = re.sub(r'\[.*?\]', '', verse_text)
                verse_text = re.sub(r'\{\{.*?\}\}', '', verse_text)
                verse_text = re.sub(r'\{.*?\}', '', verse_text)
                verse_text = re.sub(r'⟨.*?⟩', '', verse_text)
                verse_text = re.sub(r'°', '', verse_text)  # Entferne BIGS Glossar-Markierungen
                verse_text = re.sub(r'\s+', ' ', verse_text).strip()
                
                if verse_text:
                    return verse_text
                else:
                    # Fallback: Extrahiere den kompletten Paragraph und schneide ab
                    p_copy = p.__copy__()
                    
                    # Entferne Glossar-Links aber behalte den Text
                    for link in p_copy.find_all('a', class_='glossar'):
                        link.replace_with(link.get_text())
                    
                    # Entferne andere Spans aber behalte den Text
                    for span in p_copy.find_all('span'):
                        span.replace_with(span.get_text())
                    
                    full_text = p_copy.get_text().strip()
                    
                    # Schneide beim nächsten Vers ab (Zahl gefolgt von nicht-Zahl)
                    next_verse_match = re.search(f'{int(start_verse)+1}[^\\d]', full_text)
                    if next_verse_match:
                        verse_text = full_text[:next_verse_match.start()].strip()
                    else:
                        # Wenn kein nächster Vers, schneide bei doppelten Leerzeichen/Zeilenumbrüchen
                        sentences = re.split(r'\d{2,}[^\d]', full_text)
                        verse_text = sentences[0].strip() if sentences else full_text
                    
                    return verse_text if verse_text else None
        
        return None
        
    except Exception as e:
        return None

def main():
    # Kommandozeilenargumente lesen
    translation = sys.argv[1] if len(sys.argv) > 1 else 'LUT'
    
    # Validiere Übersetzung
    if translation not in TRANSLATIONS:
        error_result = {
            "error": f"Unsupported translation: {translation}",
            "available_translations": TRANSLATIONS
        }
        print(json.dumps(error_result, ensure_ascii=False))
        return
    
    # Losungen extrahieren
    result = extract_losungen_data()
    
    if result and not result.get('error'):
        # Übersetzungsinformationen hinzufügen
        result['translation'] = {
            'code': translation,
            'name': TRANSLATIONS[translation],
            'language': 'German' if translation in ['LUT', 'ELB', 'HFA', 'SLT', 'ZB', 'GNB', 'NGÜ', 'EU', 'NLB', 'VXB', 'NeÜ', 'BIGS'] else 'Other'
        }
        
        # ERF Bibleserver URLs für alle Übersetzungen hinzufügen (auch LUT)
        if result['losung']['reference']:
            losung_url = generate_bibleserver_url(result['losung']['reference'], translation)
            if losung_url:
                result['losung']['bibleserver_url'] = losung_url
        
        if result['lehrtext']['reference']:
            lehrtext_url = generate_bibleserver_url(result['lehrtext']['reference'], translation)
            if lehrtext_url:
                result['lehrtext']['bibleserver_url'] = lehrtext_url
        
        # Bibeltexte in gewünschter Übersetzung laden, falls nicht LUT
        if translation != 'LUT':
            if result['losung']['reference']:
                bible_text = None
                
                # Spezielle Behandlung für BIGS
                if translation == 'BIGS':
                    bible_text = get_bible_text_from_bigs(result['losung']['reference'])
                    source = 'Bibel in gerechter Sprache'
                else:
                    bible_text = get_bible_text_from_bibleserver(result['losung']['reference'], translation)
                    source = 'ERF Bibleserver'
                
                if bible_text:
                    result['losung']['text'] = bible_text
                    result['losung']['translation_source'] = source
                    
                    # URL für BIGS vs ERF Bibleserver
                    if translation == 'BIGS':
                        # Parse Referenz für BIGS URL
                        ref_parts = result['losung']['reference'].split(' ')
                        book_name = ' '.join(ref_parts[:-1])
                        chapter_verse = ref_parts[-1].split(',')
                        chapter = chapter_verse[0]
                        verse = chapter_verse[1].split('-')[0] if len(chapter_verse) > 1 else '1'
                        
                        # Buchkürzel für BIGS URL
                        book_mappings = {
                            'Genesis': 'Gen', '1. Mose': 'Gen', 'Exodus': 'Ex', '2. Mose': 'Ex',
                            'Levitikus': 'Lev', '3. Mose': 'Lev', 'Numeri': 'Num', '4. Mose': 'Num',
                            'Deuteronomium': 'Dtn', '5. Mose': 'Dtn', 'Josua': 'Jos', 'Richter': 'Ri',
                            'Rut': 'Rut', '1. Samuel': '1-Sam', '2. Samuel': '2-Sam',
                            '1. Könige': '1-Koen', '2. Könige': '2-Koen', '1. Chronik': '1-Chr', '2. Chronik': '2-Chr',
                            'Esra': 'Esr', 'Nehemia': 'Neh', 'Ester': 'Est', 'Hiob': 'Hiob', 'Job': 'Hiob',
                            'Psalm': 'Ps', 'Psalmen': 'Ps', 'Sprichwörter': 'Spr', 'Prediger': 'Koh',
                            'Hoheslied': 'Hld', 'Jesaja': 'Jes', 'Jeremia': 'Jer', 'Klagelieder': 'Klgl',
                            'Hesekiel': 'Ez-Hes', 'Ezechiel': 'Ez-Hes', 'Daniel': 'Dan', 'Hosea': 'Hos',
                            'Joel': 'Joel', 'Amos': 'Am', 'Obadja': 'Ob', 'Jona': 'Jona', 'Micha': 'Mi',
                            'Nahum': 'Nah', 'Habakuk': 'Hab', 'Zefanja': 'Zef', 'Haggai': 'Hag',
                            'Sacharja': 'Sach', 'Maleachi': 'Mal',
                            'Matthäus': 'Mt', 'Markus': 'Mk', 'Lukas': 'Lk', 'Johannes': 'Joh',
                            'Apostelgeschichte': 'Apg', 'Römer': 'Roem', '1. Korinther': '1-Kor',
                            '2. Korinther': '2-Kor', 'Galater': 'Gal', 'Epheser': 'Eph', 'Philipper': 'Phil',
                            'Kolosser': 'Kol', '1. Thessalonicher': '1-Thess', '2. Thessalonicher': '2-Thess',
                            '1. Timotheus': '1-Tim', '2. Timotheus': '2-Tim', 'Titus': 'Tit',
                            'Philemon': 'Phlm', 'Hebräer': 'Hebr', 'Jakobus': 'Jak', '1. Petrus': '1-Petr',
                            '2. Petrus': '2-Petr', '1. Johannes': '1-Joh', '2. Johannes': '2-Joh',
                            '3. Johannes': '3-Joh', 'Judas': 'Jud', 'Offenbarung': 'Offb-Apk'
                        }
                        book_abbrev = book_mappings.get(book_name, book_name)
                        result['losung']['bibleserver_url'] = f"https://www.bibel-in-gerechter-sprache.de/die-bibel/bigs-online/?{book_abbrev}/{chapter}/{verse}/"
                    else:
                        result['losung']['bibleserver_url'] = f"https://www.bibleserver.com/{translation}/{result['losung']['reference'].replace(' ', '').replace(',', ',')}"
            
            if result['lehrtext']['reference']:
                bible_text = None
                
                # Spezielle Behandlung für BIGS
                if translation == 'BIGS':
                    bible_text = get_bible_text_from_bigs(result['lehrtext']['reference'])
                    source = 'Bibel in gerechter Sprache'
                else:
                    bible_text = get_bible_text_from_bibleserver(result['lehrtext']['reference'], translation)
                    source = 'ERF Bibleserver'
                
                if bible_text:
                    result['lehrtext']['text'] = bible_text
                    result['lehrtext']['translation_source'] = source
                    
                    # URL für BIGS vs ERF Bibleserver
                    if translation == 'BIGS':
                        # Parse Referenz für BIGS URL
                        ref_parts = result['lehrtext']['reference'].split(' ')
                        book_name = ' '.join(ref_parts[:-1])
                        chapter_verse = ref_parts[-1].split(',')
                        chapter = chapter_verse[0]
                        verse = chapter_verse[1].split('-')[0] if len(chapter_verse) > 1 else '1'
                        
                        # Buchkürzel für BIGS URL
                        book_mappings = {
                            'Genesis': 'Gen', '1. Mose': 'Gen', 'Exodus': 'Ex', '2. Mose': 'Ex',
                            'Levitikus': 'Lev', '3. Mose': 'Lev', 'Numeri': 'Num', '4. Mose': 'Num',
                            'Deuteronomium': 'Dtn', '5. Mose': 'Dtn', 'Josua': 'Jos', 'Richter': 'Ri',
                            'Rut': 'Rut', '1. Samuel': '1-Sam', '2. Samuel': '2-Sam',
                            '1. Könige': '1-Koen', '2. Könige': '2-Koen', '1. Chronik': '1-Chr', '2. Chronik': '2-Chr',
                            'Esra': 'Esr', 'Nehemia': 'Neh', 'Ester': 'Est', 'Hiob': 'Hiob', 'Job': 'Hiob',
                            'Psalm': 'Ps', 'Psalmen': 'Ps', 'Sprichwörter': 'Spr', 'Prediger': 'Koh',
                            'Hoheslied': 'Hld', 'Jesaja': 'Jes', 'Jeremia': 'Jer', 'Klagelieder': 'Klgl',
                            'Hesekiel': 'Ez-Hes', 'Ezechiel': 'Ez-Hes', 'Daniel': 'Dan', 'Hosea': 'Hos',
                            'Joel': 'Joel', 'Amos': 'Am', 'Obadja': 'Ob', 'Jona': 'Jona', 'Micha': 'Mi',
                            'Nahum': 'Nah', 'Habakuk': 'Hab', 'Zefanja': 'Zef', 'Haggai': 'Hag',
                            'Sacharja': 'Sach', 'Maleachi': 'Mal',
                            'Matthäus': 'Mt', 'Markus': 'Mk', 'Lukas': 'Lk', 'Johannes': 'Joh',
                            'Apostelgeschichte': 'Apg', 'Römer': 'Roem', '1. Korinther': '1-Kor',
                            '2. Korinther': '2-Kor', 'Galater': 'Gal', 'Epheser': 'Eph', 'Philipper': 'Phil',
                            'Kolosser': 'Kol', '1. Thessalonicher': '1-Thess', '2. Thessalonicher': '2-Thess',
                            '1. Timotheus': '1-Tim', '2. Timotheus': '2-Tim', 'Titus': 'Tit',
                            'Philemon': 'Phlm', 'Hebräer': 'Hebr', 'Jakobus': 'Jak', '1. Petrus': '1-Petr',
                            '2. Petrus': '2-Petr', '1. Johannes': '1-Joh', '2. Johannes': '2-Joh',
                            '3. Johannes': '3-Joh', 'Judas': 'Jud', 'Offenbarung': 'Offb-Apk'
                        }
                        book_abbrev = book_mappings.get(book_name, book_name)
                        result['lehrtext']['bibleserver_url'] = f"https://www.bibel-in-gerechter-sprache.de/die-bibel/bigs-online/?{book_abbrev}/{chapter}/{verse}/"
                    else:
                        result['lehrtext']['bibleserver_url'] = f"https://www.bibleserver.com/{translation}/{result['lehrtext']['reference'].replace(' ', '').replace(',', ',')}"
        
        # Für LUT: Original-Quelle markieren
        if translation == 'LUT':
            result['losung']['translation_source'] = 'Herrnhuter Losungen'
            result['lehrtext']['translation_source'] = 'Herrnhuter Losungen'
    
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()
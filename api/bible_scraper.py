#!/opt/venv/bin/python3
"""
Erweiterte Bible Scraper für BibleScraper Pro
Unterstützt Einzelverse, Versbereiche und verschiedene Quellen
"""

import requests
from bs4 import BeautifulSoup
import json
import sys
import re
from typing import Dict, List, Optional, Tuple

class BibleScraper:
    def __init__(self):
        self.book_mappings = {
            # Altes Testament
            'Genesis': 'Gen', '1. Mose': 'Gen', 'Exodus': 'Ex', '2. Mose': 'Ex',
            'Levitikus': 'Lev', '3. Mose': 'Lev', 'Numeri': 'Num', '4. Mose': 'Num',
            'Deuteronomium': 'Dtn', '5. Mose': 'Dtn', 'Josua': 'Jos', 'Richter': 'Ri',
            'Rut': 'Rut', '1. Samuel': '1-Sam', '2. Samuel': '2-Sam',
            '1. Könige': '1-Koen', '2. Könige': '2-Koen', '1. Chronik': '1-Chr', '2. Chronik': '2-Chr',
            'Esra': 'Esr', 'Nehemia': 'Neh', 'Ester': 'Est', 'Hiob': 'Hiob', 'Job': 'Hiob',
            'Psalm': 'Ps', 'Psalmen': 'Ps', 'Sprüche': 'Spr', 'Sprichwörter': 'Spr', 
            'Prediger': 'Koh', 'Kohelet': 'Koh', 'Hoheslied': 'Hld', 'Hohelied': 'Hld',
            'Jesaja': 'Jes', 'Jeremia': 'Jer', 'Klagelieder': 'Klgl',
            'Hesekiel': 'Ez-Hes', 'Ezechiel': 'Ez-Hes', 'Daniel': 'Dan', 'Hosea': 'Hos',
            'Joel': 'Joel', 'Amos': 'Am', 'Obadja': 'Ob', 'Jona': 'Jona', 'Micha': 'Mi',
            'Nahum': 'Nah', 'Habakuk': 'Hab', 'Zefanja': 'Zef', 'Haggai': 'Hag',
            'Sacharja': 'Sach', 'Maleachi': 'Mal',
            
            # Neues Testament
            'Matthäus': 'Mt', 'Markus': 'Mk', 'Lukas': 'Lk', 'Johannes': 'Joh',
            'Apostelgeschichte': 'Apg', 'Römer': 'Roem', '1. Korinther': '1-Kor',
            '2. Korinther': '2-Kor', 'Galater': 'Gal', 'Epheser': 'Eph', 'Philipper': 'Phil',
            'Kolosser': 'Kol', '1. Thessalonicher': '1-Thess', '2. Thessalonicher': '2-Thess',
            '1. Timotheus': '1-Tim', '2. Timotheus': '2-Tim', 'Titus': 'Tit',
            'Philemon': 'Phlm', 'Hebräer': 'Hebr', 'Jakobus': 'Jak', '1. Petrus': '1-Petr',
            '2. Petrus': '2-Petr', '1. Johannes': '1-Joh', '2. Johannes': '2-Joh',
            '3. Johannes': '3-Joh', 'Judas': 'Jud', 'Offenbarung': 'Offb-Apk'
        }
    
    def parse_reference(self, reference: str) -> Optional[Dict]:
        """Parse Bibelstellen-Referenz mit Unterstützung für Klammern und Buchstaben-Suffixe"""
        # Speichere Original-Referenz
        original_ref = reference
        
        # Finde optionale Verse in Klammern
        optional_verses = []
        parentheses_match = re.findall(r'\(([^)]+)\)', reference)
        if parentheses_match:
            for match in parentheses_match:
                # Extrahiere Verse aus Klammern (z.B. "4b-6" aus "(4b-6)")
                verse_range = re.findall(r'(\d+)[a-z]?(?:-(\d+)[a-z]?)?', match)
                for v in verse_range:
                    start = int(v[0])
                    end = int(v[1]) if v[1] else start
                    optional_verses.extend(range(start, end + 1))
            
            # Entferne Klammern aus Referenz für normales Parsing
            reference = re.sub(r'\([^)]+\)', '', reference)
        
        # Entferne Buchstaben-Suffixe von Versen (z.B. 15a → 15)
        reference = re.sub(r'(\d+)[a-z]', r'\1', reference)
        
        # Normalisiere Leerzeichen und Bindestriche
        reference = re.sub(r'\s*-\s*', '-', reference)
        reference = re.sub(r'\s+', ' ', reference).strip()
        
        # Parse normale Referenz
        pattern = r'^(.+?)\s+(\d+),(\d+)(?:-(\d+))?$'
        match = re.match(pattern, reference)
        
        if match:
            return {
                'book': match.group(1).strip(),
                'chapter': int(match.group(2)),
                'start_verse': int(match.group(3)),
                'end_verse': int(match.group(4)) if match.group(4) else int(match.group(3)),
                'original': original_ref,
                'optional_verses': optional_verses  # Liste der Verse in Klammern
            }
        return None
    
    def scrape_bibleserver(self, reference: Dict, translation: str, testament_override: str = None) -> Optional[Dict]:
        """Scrape von ERF Bibleserver mit Unterstützung für Versbereiche"""
        try:
            book = reference['book']
            chapter = reference['chapter']
            start_verse = reference['start_verse']
            end_verse = reference['end_verse']
            
            # URL formatieren
            ref_str = f"{book} {chapter},{start_verse}"
            if end_verse > start_verse:
                ref_str += f"-{end_verse}"
            
            # Umlaute und Leerzeichen für URL bereinigen
            ref_clean = ref_str.replace(' ', '').replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue')
            ref_clean = ref_clean.replace('Ä', 'Ae').replace('Ö', 'Oe').replace('Ü', 'Ue').replace('ß', 'ss')
            
            url = f"https://www.bibleserver.com/{translation}/{ref_clean}"
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'de,en-US;q=0.7,en;q=0.3',
            }
            
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code != 200:
                return None
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Sammle alle gewünschten Verse
            verse_texts = []
            verses_data = []
            
            # Bei ganzen Kapiteln: Sammle alle verfügbaren Verse
            is_whole_chapter = reference.get('whole_chapter', False)
            
            if is_whole_chapter:
                # Finde alle Verse im Kapitel dynamisch
                all_verse_elements = soup.find_all('span', class_='verse-number')
                verse_numbers = []
                for elem in all_verse_elements:
                    try:
                        verse_num = int(elem.get_text().strip())
                        verse_numbers.append(verse_num)
                    except (ValueError, AttributeError):
                        continue
                
                if verse_numbers:
                    start_verse = min(verse_numbers)
                    end_verse = max(verse_numbers)
            
            for verse_num in range(start_verse, end_verse + 1):
                verse_element = self._find_verse_element(soup, verse_num)
                
                # Bei ganzen Kapiteln: Stoppe wenn keine weiteren Verse gefunden werden
                if is_whole_chapter and verse_element is None and verse_num > start_verse:
                    break
                
                if verse_element:
                    verse_content = verse_element.find('span', class_='verse-content')
                    if verse_content:
                        verse_text_elem = verse_content.find('span', class_='verse-content--hover')
                        if verse_text_elem:
                            # Entferne Fußnoten und Referenzen
                            for unwanted in verse_text_elem.find_all(['sup', 'span'], class_=['footnote', 'verse-references']):
                                unwanted.decompose()
                            
                            verse_text = verse_text_elem.get_text().strip()
                            if verse_text:
                                # Klammer-Entfernung
                                verse_text = self._clean_text(verse_text)
                                
                                # Markiere optionale Verse (nur für Verse-Array, nicht im Text)
                                is_optional = verse_num in reference.get('optional_verses', [])
                                
                                # Prüfe auf Suffixe (a, b, etc.)
                                suffixes = reference.get('suffixes', {})
                                suffix = suffixes.get(str(verse_num)) or suffixes.get(verse_num)
                                
                                # Bei Suffixen: Text am ersten Satzende abschneiden
                                if suffix:
                                    verse_text = self._apply_suffix_to_text(verse_text, suffix)
                                
                                verse_data = {
                                    'number': verse_num,
                                    'text': verse_text,
                                    'optional': is_optional
                                }
                                
                                if suffix:
                                    verse_data['suffix'] = suffix
                                
                                verse_texts.append(verse_text)
                                verses_data.append(verse_data)
            
            if verse_texts:
                combined_text = ' '.join(verse_texts)
                
                return {
                    'reference': reference['original'],
                    'text': combined_text,
                    'translation': {
                        'code': translation,
                        'name': self._get_translation_name(translation),
                        'language': self._get_translation_language(translation)
                    },
                    'source': 'ERF Bibleserver',
                    'url': url,
                    'testament': testament_override or self._get_testament(reference['book']),
                    'verses': verses_data if len(verses_data) > 1 else None
                }
            
            return None
            
        except Exception as e:
            return None
    
    def scrape_bigs(self, reference: Dict, testament_override: str = None) -> Optional[Dict]:
        """Scrape von BIGS mit Unterstützung für Versbereiche"""
        try:
            book = reference['book']
            chapter = reference['chapter']
            start_verse = reference['start_verse']
            end_verse = reference['end_verse']
            
            # Buchkürzel für BIGS
            book_abbrev = self.book_mappings.get(book, book)
            
            # URL für BIGS - bei Versbereichen den Startvers verwenden
            url = f"https://www.bibel-in-gerechter-sprache.de/die-bibel/bigs-online/?{book_abbrev}/{chapter}/{start_verse}/"
            if end_verse > start_verse:
                url = f"https://www.bibel-in-gerechter-sprache.de/die-bibel/bigs-online/?{book_abbrev}/{chapter}/{start_verse}-{end_verse}/"
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            }
            
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code != 200:
                return None
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Suche nach dem Bibeltext
            bibel_text_div = soup.find('div', class_='bibelText')
            if not bibel_text_div:
                return None
            
            # Sammle Verse
            verse_texts = []
            verses_data = []
            
            paragraphs = bibel_text_div.find_all('p')
            for p in paragraphs:
                vers_spans = p.find_all('span', class_='vers')
                
                for vers_span in vers_spans:
                    verse_num_text = vers_span.get_text().strip()
                    try:
                        verse_num = int(verse_num_text)
                    except ValueError:
                        continue
                    
                    # Bei ganzen Kapiteln: Akzeptiere alle gefundenen Verse
                    is_whole_chapter = reference.get('whole_chapter', False)
                    
                    if is_whole_chapter or (start_verse <= verse_num <= end_verse):
                        # Extrahiere Text für diesen Vers
                        verse_text = self._extract_bigs_verse_text(vers_span)
                        if verse_text:
                            verse_text = self._clean_text(verse_text)
                            
                            # Markiere optionale Verse (nur für Verse-Array, nicht im Text) 
                            is_optional = verse_num in reference.get('optional_verses', [])
                            
                            # Prüfe auf Suffixe (a, b, etc.)
                            suffixes = reference.get('suffixes', {})
                            suffix = suffixes.get(str(verse_num)) or suffixes.get(verse_num)
                            
                            # Bei Suffixen: Text am ersten Satzende abschneiden
                            if suffix:
                                verse_text = self._apply_suffix_to_text(verse_text, suffix)
                            
                            verse_data = {
                                'number': verse_num,
                                'text': verse_text,
                                'optional': is_optional
                            }
                            
                            if suffix:
                                verse_data['suffix'] = suffix
                            
                            verse_texts.append(verse_text)
                            verses_data.append(verse_data)
            
            if verse_texts:
                combined_text = ' '.join(verse_texts)
                
                return {
                    'reference': reference['original'],
                    'text': combined_text,
                    'translation': {
                        'code': 'BIGS',
                        'name': 'Bibel in gerechter Sprache',
                        'language': 'German'
                    },
                    'source': 'Bibel in gerechter Sprache',
                    'url': url,
                    'testament': testament_override or self._get_testament(reference['book']),
                    'verses': verses_data if len(verses_data) > 1 else None
                }
            
            return None
            
        except Exception as e:
            return None
    
    def _find_verse_element(self, soup, verse_num):
        """Finde Vers-Element in ERF Bibleserver HTML"""
        # Versuche präzise Selektoren (v{num} am Ende der Klasse)
        selectors = [
            f'span.v{verse_num}',  # Direkte Klasse
            f'span[class~="v{verse_num}"]',  # Exakte Klassen-Übereinstimmung
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                return element
        
        # Fallback: Suche nach span mit exakter Versnummer im Text
        for span in soup.find_all('span', class_='verse'):
            verse_number_elem = span.find('span', class_='verse-number')
            if verse_number_elem:
                # Prüfe auf exakte Übereinstimmung der Versnummer
                verse_text = verse_number_elem.get_text().strip()
                if verse_text == str(verse_num):
                    return span
        
        return None
    
    def _extract_bigs_verse_text(self, vers_span):
        """Extrahiere Text für einen BIGS-Vers"""
        current_node = vers_span.next_sibling
        verse_text = ""
        
        while current_node:
            if hasattr(current_node, 'name'):
                # Stoppe bei nächstem Vers-Span
                if (current_node.name == 'span' and 
                    current_node.get('class') and 
                    'vers' in current_node.get('class')):
                    break
                
                # Sammle Text von Links (ohne Glossar-Markierungen)
                if current_node.name == 'a' and current_node.get('class') and 'glossar' in current_node.get('class'):
                    verse_text += current_node.get_text()
                else:
                    verse_text += current_node.get_text()
            else:
                # Text-Knoten
                verse_text += str(current_node)
            
            current_node = current_node.next_sibling
        
        return verse_text.strip()
    
    def _clean_text(self, text: str) -> str:
        """Bereinige Text von Klammern und Sonderzeichen"""
        # Klammer-Entfernung
        text = re.sub(r'\[\[\[.*?\]\]\]', '', text)  # Dreifache eckige Klammern
        text = re.sub(r'\[\[.*?\]\]', '', text)      # Doppelte eckige Klammern
        text = re.sub(r'\[.*?\]', '', text)          # Einfache eckige Klammern
        text = re.sub(r'\{\{.*?\}\}', '', text)      # Doppelte geschweifte Klammern
        text = re.sub(r'\{.*?\}', '', text)          # Einfache geschweifte Klammern
        text = re.sub(r'⟨.*?⟩', '', text)            # Spitze Klammern
        text = re.sub(r'°', '', text)                # BIGS Glossar-Markierungen
        text = re.sub(r'\s+', ' ', text)             # Mehrfache Leerzeichen normalisieren
        
        return text.strip()
    
    def _apply_suffix_to_text(self, text: str, suffix: str) -> str:
        """Schneide Text bei Suffixen am ersten Satzende ab"""
        if not suffix or suffix not in ['a', 'b', 'c']:
            return text
        
        # Finde das erste Satzende (.!?;)
        import re
        sentence_end_pattern = r'[.!?;]'
        match = re.search(sentence_end_pattern, text)
        
        if match:
            # Schneide beim ersten Satzende ab (inklusive Satzzeichen)
            cut_position = match.end()
            cut_text = text[:cut_position].strip()
            
            # Stelle sicher, dass der Text nicht leer ist
            if len(cut_text) > 10:  # Mindestens ein paar Wörter
                return cut_text
        
        # Fallback: Wenn kein Satzende gefunden wird oder Text zu kurz ist
        # Schneide nach etwa der Hälfte des Textes ab
        words = text.split()
        if len(words) > 4:
            half_words = words[:len(words)//2]
            return ' '.join(half_words) + '...'
        
        return text
    
    def _get_translation_name(self, code: str) -> str:
        """Hole vollständigen Namen der Übersetzung"""
        translations = {
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
            'BIGS': 'Bibel in gerechter Sprache',
            'NIV': 'New International Version',
            'ESV': 'English Standard Version',
            'LSG': 'Louis Segond 1910'
        }
        return translations.get(code, code)
    
    def _get_translation_language(self, code: str) -> str:
        """Hole Sprache der Übersetzung"""
        german_translations = ['LUT', 'ELB', 'HFA', 'SLT', 'ZB', 'GNB', 'NGÜ', 'EU', 'NLB', 'VXB', 'NeÜ', 'BIGS']
        english_translations = ['NIV', 'ESV', 'NLT', 'MSG', 'CEV', 'GNT', 'NKJV', 'KJV', 'NASB', 'CSB']
        french_translations = ['LSG', 'BDS', 'S21']
        
        if code in german_translations:
            return 'German'
        elif code in english_translations:
            return 'English'
        elif code in french_translations:
            return 'French'
        else:
            return 'Other'
    
    def _get_testament(self, book: str) -> str:
        """Bestimme Testament basierend auf Buch"""
        nt_books = [
            'Matthäus', 'Markus', 'Lukas', 'Johannes', 'Apostelgeschichte',
            'Römer', '1. Korinther', '2. Korinther', 'Galater', 'Epheser',
            'Philipper', 'Kolosser', '1. Thessalonicher', '2. Thessalonicher',
            '1. Timotheus', '2. Timotheus', 'Titus', 'Philemon', 'Hebräer',
            'Jakobus', '1. Petrus', '2. Petrus', '1. Johannes', '2. Johannes',
            '3. Johannes', 'Judas', 'Offenbarung'
        ]
        return 'NT' if book in nt_books else 'AT'

def main():
    if len(sys.argv) < 3:
        error_result = {
            "error": "Usage: python3 bible_scraper.py 'reference' 'translation' [testament]",
            "example": "python3 bible_scraper.py 'Johannes 3,16' 'LUT' 'NT'"
        }
        print(json.dumps(error_result, ensure_ascii=False))
        return
    
    reference_str = sys.argv[1]
    translation = sys.argv[2]
    testament_override = sys.argv[3] if len(sys.argv) > 3 else None
    
    scraper = BibleScraper()
    
    # Parse Referenz
    parsed_ref = scraper.parse_reference(reference_str)
    if not parsed_ref:
        error_result = {
            "error": f"Invalid reference format: {reference_str}",
            "expected": "Book Chapter,Verse or Book Chapter,StartVerse-EndVerse"
        }
        print(json.dumps(error_result, ensure_ascii=False))
        return
    
    # Versuche Scraping
    result = None
    
    if translation == 'BIGS':
        result = scraper.scrape_bigs(parsed_ref, testament_override)
    else:
        result = scraper.scrape_bibleserver(parsed_ref, translation, testament_override)
    
    if result:
        print(json.dumps(result, ensure_ascii=False))
    else:
        error_result = {
            "error": f"Failed to scrape {reference_str} in {translation}",
            "reference": parsed_ref
        }
        print(json.dumps(error_result, ensure_ascii=False))

if __name__ == "__main__":
    main()
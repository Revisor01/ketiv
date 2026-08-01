#!/opt/venv/bin/python3
import re

# ERF Bibleserver Übersetzungscodes 
BIBLESERVER_TRANSLATIONS = {
    # Deutsche Übersetzungen
    'LUT': 'LUT',
    'ELB': 'ELB', 
    'HFA': 'HFA',
    'SLT': 'SLT',
    'ZB': 'ZB',
    'GNB': 'GNB',
    'NGÜ': 'NGÜ',
    'EU': 'EU',
    'NLB': 'NLB',
    'NeÜ': 'NeÜ',
    
    # Englische Übersetzungen
    'NIV': 'NIV',
    'ESV': 'ESV',
    'NLT': 'NLT',
    'NASB': 'NASB',
    'CSB': 'CSB',
    'NKJV': 'NKJV',
    'KJV': 'KJV',
    
    # Andere Sprachen haben oft keinen ERF Link
    'LSG': None,  # Französisch nicht auf ERF
    'BIGS': None, # Hat eigene Website
}

def normalize_book_name(book_ref):
    """Normalisiert Buchname für ERF Bibleserver URLs"""
    # Häufige Buchname-Mappings
    book_mappings = {
        # Altes Testament
        '1. Mose': '1.Mose',
        '2. Mose': '2.Mose', 
        '3. Mose': '3.Mose',
        '4. Mose': '4.Mose',
        '5. Mose': '5.Mose',
        'Richter': 'Richter',
        '1. Samuel': '1.Samuel',
        '2. Samuel': '2.Samuel', 
        '1. Könige': '1.Koenige',
        '2. Könige': '2.Koenige',
        '1. Chronik': '1.Chronik',
        '2. Chronik': '2.Chronik',
        'Esra': 'Esra',
        'Nehemia': 'Nehemia',
        'Ester': 'Ester',
        'Hiob': 'Hiob',
        'Psalm': 'Psalm',
        'Sprüche': 'Sprueche',
        'Prediger': 'Prediger',
        'Hohelied': 'Hohelied',
        'Jesaja': 'Jesaja',
        'Jeremia': 'Jeremia',
        'Klagelieder': 'Klagelieder',
        'Hesekiel': 'Hesekiel',
        'Daniel': 'Daniel',
        'Hosea': 'Hosea',
        'Joel': 'Joel',
        'Amos': 'Amos',
        'Obadja': 'Obadja',
        'Jona': 'Jona',
        'Micha': 'Micha',
        'Nahum': 'Nahum',
        'Habakuk': 'Habakuk',
        'Zefanja': 'Zefanja',
        'Haggai': 'Haggai',
        'Sacharja': 'Sacharja',
        'Maleachi': 'Maleachi',
        
        # Neues Testament
        'Matthäus': 'Matthaeus',
        'Markus': 'Markus',
        'Lukas': 'Lukas',
        'Johannes': 'Johannes',
        'Apostelgeschichte': 'Apostelgeschichte',
        'Römer': 'Roemer',
        '1. Korinther': '1.Korinther',
        '2. Korinther': '2.Korinther',
        'Galater': 'Galater',
        'Epheser': 'Epheser',
        'Philipper': 'Philipper',
        'Kolosser': 'Kolosser',
        '1. Thessalonicher': '1.Thessalonicher',
        '2. Thessalonicher': '2.Thessalonicher',
        '1. Timotheus': '1.Timotheus',
        '2. Timotheus': '2.Timotheus',
        'Titus': 'Titus',
        'Philemon': 'Philemon',
        'Hebräer': 'Hebraeer',
        'Jakobus': 'Jakobus',
        '1. Petrus': '1.Petrus',
        '2. Petrus': '2.Petrus',
        '1. Johannes': '1.Johannes',
        '2. Johannes': '2.Johannes',
        '3. Johannes': '3.Johannes',
        'Judas': 'Judas',
        'Offenbarung': 'Offenbarung'
    }
    
    return book_mappings.get(book_ref, book_ref)

def generate_bibleserver_url(reference, translation='LUT'):
    """
    Generiert ERF Bibleserver URLs für Bibelstellen
    
    Args:
        reference: Bibelstelle wie "Johannes 3,16" oder "Psalm 23,1-6"
        translation: Übersetzungscode wie 'LUT', 'HFA', etc.
    
    Returns:
        URL string oder None wenn nicht unterstützt
    """
    # Prüfen ob Übersetzung unterstützt wird
    bibleserver_code = BIBLESERVER_TRANSLATIONS.get(translation)
    if not bibleserver_code:
        return None
    
    # Referenz parsen
    # Format: "Buchname Kapitel,Vers" oder "Buchname Kapitel,Vers-Vers"
    pattern = r'^(.+?)\s+(\d+),(\d+)(?:-(\d+))?$'
    match = re.match(pattern, reference.strip())
    
    if not match:
        return None
    
    book, chapter, verse_start, verse_end = match.groups()
    
    # Buchname für URL normalisieren
    book_normalized = normalize_book_name(book.strip())
    
    # URL zusammenbauen
    base_url = f"https://www.bibleserver.com/{bibleserver_code}"
    
    if verse_end:
        # Versbereich: Johannes3,16-18
        verse_part = f"{chapter},{verse_start}-{verse_end}"
    else:
        # Einzelvers: Johannes3,16
        verse_part = f"{chapter},{verse_start}"
    
    # Vollständige URL
    url = f"{base_url}/{book_normalized}{verse_part}"
    
    return url

def test_bibleserver_links():
    """Testet die URL-Generierung"""
    test_cases = [
        ("Johannes 3,16", "LUT"),
        ("Psalm 23,1-6", "HFA"), 
        ("1. Korinther 13,4-8", "ELB"),
        ("Jeremia 14,22", "LUT"),
        ("1. Johannes 5,11", "NGÜ"),
        ("Matthäus 5,3-12", "ESV"),
    ]
    
    for reference, translation in test_cases:
        url = generate_bibleserver_url(reference, translation)
        print(f"{reference} ({translation}): {url}")

if __name__ == "__main__":
    test_bibleserver_links()
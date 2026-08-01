export interface ParsedReference {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  verseRanges?: Array<{start: number, end: number}>; // For complex ranges like 2-3.11-18
  originalInput: string;
  normalized: string;
}

export class BibleReferenceParser {
  // Bekannte Buch-Abkürzungen und ihre Variationen
  private static bookMappings: { [key: string]: string } = {
    // Genesis
    '1mo': '1. Mose', '1.mo': '1. Mose', '1mose': '1. Mose', '1.mose': '1. Mose',
    'gen': 'Genesis', 'genesis': 'Genesis',
    
    // Exodus  
    '2mo': '2. Mose', '2.mo': '2. Mose', '2mose': '2. Mose', '2.mose': '2. Mose',
    'ex': 'Exodus', 'exodus': 'Exodus',
    
    // Johannes-Evangelium
    'joh': 'Johannes', 'joh.': 'Johannes', 'johannes': 'Johannes',
    'john': 'John',
    
    // 1. Johannes-Brief
    '1joh': '1. Johannes', '1.joh': '1. Johannes', '1.johannes': '1. Johannes',
    '1johannes': '1. Johannes', '1john': '1 John',
    
    // 2. Johannes-Brief  
    '2joh': '2. Johannes', '2.joh': '2. Johannes', '2.johannes': '2. Johannes',
    '2johannes': '2. Johannes', '2john': '2 John',
    
    // 3. Johannes-Brief
    '3joh': '3. Johannes', '3.joh': '3. Johannes', '3.johannes': '3. Johannes', 
    '3johannes': '3. Johannes', '3john': '3 John',
    
    // Weitere häufige Bücher
    'mt': 'Matthäus', 'matt': 'Matthäus', 'matthäus': 'Matthäus', 'matthew': 'Matthew',
    'mk': 'Markus', 'markus': 'Markus', 'mark': 'Mark', 
    'lk': 'Lukas', 'lukas': 'Lukas', 'luke': 'Luke',
    
    // Additional missing books
    '3mo': '3. Mose', '3.mo': '3. Mose', '3mose': '3. Mose', '3.mose': '3. Mose',
    'lev': '3. Mose', 'levitikus': '3. Mose', 'leviticus': 'Leviticus',
    '4mo': '4. Mose', '4.mo': '4. Mose', '4mose': '4. Mose', '4.mose': '4. Mose',
    'num': '4. Mose', 'numeri': '4. Mose', 'numbers': 'Numbers',
    '5mo': '5. Mose', '5.mo': '5. Mose', '5mose': '5. Mose', '5.mose': '5. Mose',
    'dtn': '5. Mose', 'deuteronomium': '5. Mose', 'deut': '5. Mose', 'deuteronomy': 'Deuteronomy',
    'apg': 'Apostelgeschichte', 'acts': 'Acts',
    'röm': 'Römer', 'roemer': 'Römer', 'rom': 'Römer', 'romans': 'Romans',
    '1kor': '1. Korinther', '1.kor': '1. Korinther', '1cor': '1 Corinthians',
    '2kor': '2. Korinther', '2.kor': '2. Korinther', '2cor': '2 Corinthians',
    'gal': 'Galater', 'galater': 'Galater', 'galatians': 'Galatians',
    'eph': 'Epheser', 'epheser': 'Epheser', 'ephesians': 'Ephesians',
    'phil': 'Philipper', 'philipper': 'Philipper', 'philippians': 'Philippians',
    'kol': 'Kolosser', 'kolosser': 'Kolosser', 'col': 'Colossians',
    '1thess': '1. Thessalonicher', '1.thess': '1. Thessalonicher',
    '2thess': '2. Thessalonicher', '2.thess': '2. Thessalonicher',
    '1tim': '1. Timotheus', '1.tim': '1. Timotheus',
    '2tim': '2. Timotheus', '2.tim': '2. Timotheus',
    'tit': 'Titus', 'titus': 'Titus',
    'phlm': 'Philemon', 'philemon': 'Philemon',
    'hebr': 'Hebräer', 'heb': 'Hebräer', 'hebrews': 'Hebrews',
    'jak': 'Jakobus', 'jakobus': 'Jakobus', 'james': 'James',
    '1petr': '1. Petrus', '1.petr': '1. Petrus', '1pet': '1 Peter',
    '2petr': '2. Petrus', '2.petr': '2. Petrus', '2pet': '2 Peter',
    'jud': 'Judas', 'judas': 'Judas', 'jude': 'Jude',
    'offb': 'Offenbarung', 'offenbarung': 'Offenbarung', 'rev': 'Revelation',
    
    // Altes Testament
    'ps': 'Psalm', 'psalm': 'Psalm', 'psalms': 'Psalms',
    'spr': 'Sprüche', 'sprueche': 'Sprüche', 'prov': 'Proverbs',
    'pred': 'Prediger', 'prediger': 'Prediger', 'eccl': 'Ecclesiastes',
    'jes': 'Jesaja', 'jesaja': 'Jesaja', 'isa': 'Isaiah',
    'jer': 'Jeremia', 'jeremia': 'Jeremia', 'jeremiah': 'Jeremiah',
    'hes': 'Hesekiel', 'hesekiel': 'Hesekiel', 'ezek': 'Ezekiel',
    'dan': 'Daniel', 'daniel': 'Daniel',
  };

  /**
   * Parst verschiedene Bibelstellen-Formate
   * Unterstützte Formate:
   * - Johannes 3,16
   * - Joh 3,16-18  
   * - Joh. 3, 16 - 18
   * - 1. Joh 1, 2-12
   * - 1Johannes 1,2-3
   * - 2. Mose 16,2-3.11-18 (verse ranges with gaps)
   * - Mt 21,1–11 (with em dash)
   */
  static parse(input: string): ParsedReference | null {
    if (!input || typeof input !== 'string') {
      return null;
    }

    const trimmed = input.trim();
    
    // Check for complex verse ranges first (e.g., "2. Mose 16,2-3.11-18")
    const complexPattern = /^([1-3]?\.?\s*[a-züäöß]+\.?)\s+(\d+)[,\.]\s*(.+)$/i;
    const complexMatch = trimmed.match(complexPattern);
    
    if (complexMatch) {
      const [, bookPart, chapterStr, versePart] = complexMatch;
      
      // Check if versePart contains periods (indicating gaps)
      if (versePart.includes('.')) {
        const normalizedBook = this.normalizeBook(bookPart.trim());
        if (!normalizedBook) return null;
        
        const chapter = parseInt(chapterStr, 10);
        const verseRanges: Array<{start: number, end: number}> = [];
        
        // Parse ranges like "2-3.11-18"
        const ranges = versePart.split('.');
        let firstStart: number | null = null;
        
        for (const range of ranges) {
          const rangeMatch = range.trim().match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
          if (rangeMatch) {
            const start = parseInt(rangeMatch[1], 10);
            const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : start;
            
            if (firstStart === null) firstStart = start;
            verseRanges.push({ start, end });
          }
        }
        
        if (verseRanges.length > 0 && firstStart !== null) {
          const lastRange = verseRanges[verseRanges.length - 1];
          return {
            book: normalizedBook,
            chapter,
            verseStart: firstStart,
            verseEnd: lastRange.end,
            verseRanges,
            originalInput: input,
            normalized: `${normalizedBook} ${chapter},${versePart}`
          };
        }
      }
    }
    
    // Regex für verschiedene Formate
    // Gruppe 1: Buch (mit optionaler Nummer und Punkt)
    // Gruppe 2: Kapitel  
    // Gruppe 3: Vers-Start
    // Gruppe 4: Optionaler Vers-Ende (nach - oder bis)
    const patterns = [
      // "Johannes 3,16" oder "Joh 3,16-18"  
      /^([1-3]?\.?\s*[a-züäöß]+\.?)\s+(\d+)[,\.]\s*(\d+)(?:\s*[-–bis]\s*(\d+))?/i,
      
      // "1. Johannes 1, 2-12" (mit Leerzeichen)
      /^([1-3]?\.\s*[a-züäöß]+\.?)\s+(\d+)[,\.]\s*(\d+)(?:\s*[-–bis]\s*(\d+))?/i,
      
      // "1Johannes 1,2-3" (ohne Punkt nach Nummer)
      /^([1-3]?[a-züäöß]+\.?)\s+(\d+)[,\.]\s*(\d+)(?:\s*[-–bis]\s*(\d+))?/i,
    ];

    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const [, bookPart, chapterStr, verseStartStr, verseEndStr] = match;
        
        // Buch normalisieren
        const normalizedBook = this.normalizeBook(bookPart.trim());
        if (!normalizedBook) {
          continue; // Unbekanntes Buch, nächstes Pattern versuchen
        }

        const chapter = parseInt(chapterStr, 10);
        const verseStart = parseInt(verseStartStr, 10);
        const verseEnd = verseEndStr ? parseInt(verseEndStr, 10) : undefined;

        // Validierung
        if (chapter < 1 || verseStart < 1) {
          continue;
        }
        
        if (verseEnd && verseEnd < verseStart) {
          continue;
        }

        // Normalisierte Ausgabe erstellen
        const normalized = verseEnd 
          ? `${normalizedBook} ${chapter},${verseStart}-${verseEnd}`
          : `${normalizedBook} ${chapter},${verseStart}`;

        return {
          book: normalizedBook,
          chapter,
          verseStart,
          verseEnd,
          originalInput: input,
          normalized
        };
      }
    }

    return null;
  }

  /**
   * Normalisiert Buchnamen zu Standardform
   */
  private static normalizeBook(bookInput: string): string | null {
    const cleaned = bookInput.toLowerCase()
      .replace(/\s+/g, '') // Leerzeichen entfernen
      .replace(/\./g, ''); // Punkte entfernen für Lookup

    // Direkte Zuordnung versuchen  
    if (this.bookMappings[cleaned]) {
      return this.bookMappings[cleaned];
    }

    // Fuzzy matching für ähnliche Schreibweisen
    for (const [key, value] of Object.entries(this.bookMappings)) {
      if (key.includes(cleaned) || cleaned.includes(key)) {
        return value;
      }
    }

    // Falls nichts gefunden, ursprüngliche Eingabe zurückgeben (capitalized)
    return bookInput.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Validiert eine Bibelstellenreferenz
   */
  static validate(reference: string): boolean {
    const parsed = this.parse(reference);
    return parsed !== null;
  }

  /**
   * Gibt Beispiele für unterstützte Formate zurück
   */
  static getExamples(): string[] {
    return [
      'Johannes 3,16',
      'Joh 3,16-18', 
      'Joh. 3, 16 - 18',
      '1. Joh 1, 2-12',
      '1Johannes 1,2-3',
      'Matthäus 5,1-12',
      'Psalm 23,1',
      'Römer 8,28-39',
      '1. Korinther 13,1-13',
      '2. Mose 16,2-3.11-18'
    ];
  }

  /**
   * Autocomplete-Vorschläge für Buchtyping
   */
  static getSuggestions(partial: string): string[] {
    if (!partial || partial.length < 2) {
      return [];
    }

    const lowerPartial = partial.toLowerCase();
    const suggestions: string[] = [];

    // Durch Buchzuordnungen suchen
    for (const [key, value] of Object.entries(this.bookMappings)) {
      if (key.startsWith(lowerPartial) || value.toLowerCase().startsWith(lowerPartial)) {
        if (!suggestions.includes(value)) {
          suggestions.push(value);
        }
      }
    }

    return suggestions.slice(0, 10); // Maximal 10 Vorschläge
  }
}
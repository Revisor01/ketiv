// API Types
export interface Translation {
  code: string;
  name: string;
  language: string;
}

export interface BibleVerse {
  text: string;
  reference: string;
  testament: 'AT' | 'NT';
  translation_source?: string;
  bibleserver_url?: string;
  url?: string;
}

export interface DailyLosung {
  date: string;
  losung: BibleVerse;
  lehrtext: BibleVerse;
  translation: Translation;
  source: string;
  url: string;
  cached_at?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  source?: string;
}

// Search Types
export interface BibleSearchRequest {
  reference: string;
  translation: string;
  format?: 'text' | 'json' | 'html' | 'markdown';
}

export interface BibleSearchResult {
  reference: string;
  text: string;
  translation: Translation;
  source: string;
  url?: string;
  verses?: Array<{
    number: number;
    text: string;
    excluded?: boolean;
    optional?: boolean;
    suffix?: string;
  }>;
}

// User Types
export interface User {
  id: string;
  username: string;
  email: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  defaultTranslation: string;
  favoriteTranslations: string[];
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
}

// Component Props Types
export interface TranslationSelectorProps {
  selected: string;
  onSelect: (translation: string) => void;
  available: Translation[];
  className?: string;
  /** Zeigt zusätzlich eine "– keine –"-Option (code: '') an, z.B. für optionale Vergleichs-Spalten */
  allowNone?: boolean;
}

export interface BibleTextDisplayProps {
  verse: BibleVerse;
  className?: string;
  showReference?: boolean;
  showSource?: boolean;
}

export interface SearchFormProps {
  onSearch: (request: BibleSearchRequest) => void;
  loading?: boolean;
  className?: string;
}

// Constants
export const AVAILABLE_TRANSLATIONS: Translation[] = [
  { code: 'LUT', name: 'Lutherbibel 2017', language: 'German' },
  { code: 'ELB', name: 'Elberfelder Bibel', language: 'German' },
  { code: 'HFA', name: 'Hoffnung für alle', language: 'German' },
  { code: 'SLT', name: 'Schlachter 2000', language: 'German' },
  { code: 'ZB', name: 'Zürcher Bibel', language: 'German' },
  { code: 'GNB', name: 'Gute Nachricht Bibel 2018', language: 'German' },
  { code: 'NGÜ', name: 'Neue Genfer Übersetzung', language: 'German' },
  { code: 'EU', name: 'Einheitsübersetzung 2016', language: 'German' },
  { code: 'NLB', name: 'Neues Leben. Die Bibel', language: 'German' },
  { code: 'VXB', name: 'Volxbibel', language: 'German' },
  { code: 'NeÜ', name: 'Neue evangelistische Übersetzung', language: 'German' },
  { code: 'BIGS', name: 'Bibel in gerechter Sprache', language: 'German' },
  { code: 'NIV', name: 'New International Version', language: 'English' },
  { code: 'ESV', name: 'English Standard Version', language: 'English' },
  { code: 'LSG', name: 'Louis Segond 1910', language: 'French' },
];
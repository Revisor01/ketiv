<?php
/**
 * Losungen API - Database Version
 * Serves daily readings from database instead of scraping
 */

function logDocker($message) {
    file_put_contents('php://stdout', "[LOSUNGEN API] $message\n");
}

// Startup logging - only once per process
static $startup_logged = false;
if (!$startup_logged) {
    logDocker("Process started - PID: " . getmypid());
    $startup_logged = true;
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'database.php';

// API-Key Validierung
function validateApiKey() {
    $validApiKeys = [
        $_ENV['API_KEY_1'] ?? 'default-key-1',
        $_ENV['API_KEY_2'] ?? 'default-key-2', 
        $_ENV['API_KEY_3'] ?? 'default-key-3'
    ];
    
    // API-Key aus Header oder Query-Parameter
    $providedKey = $_SERVER['HTTP_X_API_KEY'] ?? $_GET['api_key'] ?? null;
    
    if (!$providedKey) {
        return false;
    }
    
    return in_array($providedKey, $validApiKeys);
}

// Simple Rate Limiting
function checkRateLimit() {
    $clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $rateLimitFile = '/tmp/rate_limit_' . md5($clientIp);
    
    if (file_exists($rateLimitFile)) {
        $data = json_decode(file_get_contents($rateLimitFile), true);
        $now = time();
        
        // Reset nach 1 Stunde
        if ($now - $data['start'] > 3600) {
            unlink($rateLimitFile);
            return true;
        }
        
        // Maximal 100 Requests pro Stunde
        if ($data['count'] >= 100) {
            return false;
        }
        
        $data['count']++;
        file_put_contents($rateLimitFile, json_encode($data));
    } else {
        file_put_contents($rateLimitFile, json_encode(['start' => time(), 'count' => 1]));
    }
    
    return true;
}

class LosungenService {
    private $db;
    private $losungenDb;
    private $bibleserverApiKey;
    
    public function __construct() {
        $this->db = getDatabase();
        $this->losungenDb = new LosungenDatabase();
        $this->bibleserverApiKey = $_ENV['BIBLESERVER_API_KEY'] ?? null;
    }
    
    public function getDailyLosung($date = null, $translation = 'LUT') {
        try {
            // Use today if no date specified (German timezone)
            if (!$date) {
                $date = $this->getCurrentGermanDate();
            }
            
            // Validate date format
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                return $this->errorResponse('Invalid date format. Use YYYY-MM-DD');
            }
            
            // Get base Losung data from database
            $losungData = $this->getLosungFromDatabase($date);
            
            if (!$losungData) {
                return $this->errorResponse('Losung nicht gefunden für Datum: ' . $date);
            }
            
            // If translation requested other than LUT, try cache first, then scraper
            if ($translation !== 'LUT') {
                $losungData = $this->enhanceWithCachedTranslations($losungData, $translation, $date);
            }
            
            // Bibelstellen über ERF Bibleserver API in gewünschter Übersetzung laden
            // BIGS needs special URLs even without API key
            if ($this->bibleserverApiKey || $translation === 'BIGS') {
                $losungData = $this->enhanceWithBibleserver($losungData, $translation);
            } else {
                // Even without API key, add translation object
                $losungData['translation'] = [
                    'code' => $translation,
                    'name' => $this->getTranslationName($translation),
                    'language' => $this->getTranslationLanguage($translation)
                ];
            }
            
            // For BIGS, scraper already provides correct URLs, no need to override
            
            logDocker("Successfully served Losung for $date from database with translation $translation");
            
            return $this->successResponse($losungData);
            
        } catch (Exception $e) {
            logDocker("ERROR: " . $e->getMessage());
            return $this->errorResponse('Fehler beim Laden der Losung: ' . $e->getMessage());
        }
    }
    
    private function getLosungFromDatabase($date) {
        $stmt = $this->db->prepare("
            SELECT 
                date,
                weekday,
                holiday,
                ot_text,
                ot_reference,
                nt_text,
                nt_reference
            FROM losungen 
            WHERE date = ?
        ");
        
        $stmt->execute([$date]);
        $losung = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$losung) {
            // Try to find closest available date
            $stmt = $this->db->prepare("
                SELECT 
                    date,
                    weekday, 
                    holiday,
                    ot_text,
                    ot_reference,
                    nt_text,
                    nt_reference
                FROM losungen 
                WHERE ABS(EXTRACT(EPOCH FROM (date - ?::date))) = (
                    SELECT MIN(ABS(EXTRACT(EPOCH FROM (date - ?::date))))
                    FROM losungen
                )
                LIMIT 1
            ");
            
            $stmt->execute([$date, $date]);
            $losung = $stmt->fetch(PDO::FETCH_ASSOC);
        }
        
        if (!$losung) {
            return null;
        }
        
        // Format response to match existing API structure
        return [
            'date' => $losung['date'],
            'formatted_date' => $this->formatGermanDate($losung['date'], $losung['weekday']),
            'weekday' => $losung['weekday'],
            'holiday' => $losung['holiday'],
            
            // Old Testament (Losung)
            'losung' => [
                'text' => $losung['ot_text'],
                'reference' => $losung['ot_reference'],
                'testament' => 'AT',
                'translation_source' => 'Herrnhuter Losungen ' . substr($losung['date'], 0, 4)
            ],

            // New Testament (Lehrtext)
            'lehrtext' => [
                'text' => $losung['nt_text'],
                'reference' => $losung['nt_reference'],
                'testament' => 'NT',
                'translation_source' => 'Herrnhuter Losungen ' . substr($losung['date'], 0, 4)
            ],

            'source' => 'Herrnhuter Losungen ' . substr($losung['date'], 0, 4),
            'fetched_at' => date('c'),
            'url' => 'https://www.losungen.de/'
        ];
    }
    
    private function formatGermanDate($date, $weekday) {
        $germanMonths = [
            1 => 'Januar', 2 => 'Februar', 3 => 'März', 4 => 'April',
            5 => 'Mai', 6 => 'Juni', 7 => 'Juli', 8 => 'August', 
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Dezember'
        ];
        
        $dateObj = new DateTime($date);
        $day = $dateObj->format('j');
        $month = $germanMonths[(int)$dateObj->format('n')];
        $year = $dateObj->format('Y');
        
        return "$weekday, $day. $month $year";
    }
    
    private function successResponse($data) {
        return [
            'success' => true,
            'data' => $data,
            'timestamp' => date('c')
        ];
    }
    
    private function errorResponse($message) {
        return [
            'success' => false,
            'error' => $message,
            'timestamp' => date('c')
        ];
    }
    
    private function enhanceWithCachedTranslations($data, $translation, $date) {
        // Try cache first 
        logDocker("[LOSUNGEN] Checking translation cache for $translation on $date");
        
        try {
            $cachedTranslation = $this->losungenDb->getTranslation($date, $translation);
            
            if ($cachedTranslation) {
                logDocker("[LOSUNGEN] Found cached translation for $translation");
                
                // Use cached translation data
                $data['losung']['text'] = $cachedTranslation['losung']['text'] ?? $data['losung']['text'];
                $data['losung']['translation_source'] = $cachedTranslation['losung']['translation_source'] ?? $translation;
                
                $data['lehrtext']['text'] = $cachedTranslation['lehrtext']['text'] ?? $data['lehrtext']['text'];
                $data['lehrtext']['translation_source'] = $cachedTranslation['lehrtext']['translation_source'] ?? $translation;
                
                // Add cached_at timestamp
                if (isset($cachedTranslation['cached_at'])) {
                    $data['cached_at'] = $cachedTranslation['cached_at'];
                }
                
                return $data;
            }
        } catch (Exception $e) {
            logDocker("[LOSUNGEN] Cache lookup failed: " . $e->getMessage());
        }
        
        // Fallback: Texte für die Referenzen DIESES Datums über die interne
        // Bibelsuche holen (Redis-gecacht) und Ergebnis in den Cache zurückschreiben
        logDocker("[LOSUNGEN] Cache miss for $translation, fetching via bible_search");
        return $this->enhanceWithTranslations($data, $translation, $date);
    }

    private function enhanceWithTranslations($data, $translation, $date) {
        $translated = false;

        foreach (['losung', 'lehrtext'] as $part) {
            $reference = $data[$part]['reference'] ?? '';
            if (!$reference) {
                continue;
            }

            $result = $this->fetchBibleText($reference, $translation);

            if ($result && !empty($result['text'])) {
                $data[$part]['text'] = $result['text'];
                $data[$part]['translation_source'] = $result['translation']['name'] ?? $translation;
                if (!empty($result['url'])) {
                    $data[$part]['bibleserver_url'] = $result['url'];
                }
                $translated = true;
            } else {
                logDocker("[LOSUNGEN] WARNING: No $translation text for $reference, keeping German text");
            }
        }

        if ($translated) {
            $data['translation'] = [
                'code' => $translation,
                'name' => $this->getTranslationName($translation),
                'language' => $this->getTranslationLanguage($translation)
            ];

            // Write-back: nächste Abfrage kommt direkt aus dem Cache
            if ($this->losungenDb->saveTranslation($date, $translation, $data)) {
                logDocker("[LOSUNGEN] Cached $translation for $date");
            }
        }

        return $data;
    }

    /**
     * Interne Abfrage der Bibelsuche (bible_search.php) für eine einzelne Referenz.
     * Nutzt deren Redis-Cache und Scraper-Logik, statt losungen.de erneut zu scrapen.
     */
    private function fetchBibleText($reference, $translation) {
        $apiKey = $_SERVER['HTTP_X_API_KEY'] ?? $_GET['api_key'] ?? '';

        $params = http_build_query([
            'reference' => $reference,
            'translation' => $translation,
            'api_key' => $apiKey,
            'format' => 'json'
        ]);

        $context = stream_context_create([
            'http' => ['timeout' => 20, 'ignore_errors' => true]
        ]);

        $response = @file_get_contents("http://localhost/bible_search.php?$params", false, $context);

        if ($response === false) {
            return null;
        }

        $decoded = json_decode($response, true);

        if (!$decoded || empty($decoded['success'])) {
            return null;
        }

        return $decoded['data'] ?? null;
    }
    
    private function enhanceWithBibleserver($data, $translation) {
        // BIGS doesn't need API key, just URL generation
        if (!$this->bibleserverApiKey && $translation !== 'BIGS') {
            return $data;
        }
        
        // Losung über Bibleserver API in gewünschter Übersetzung laden
        if (!empty($data['losung']['reference'])) {
            $losungUrl = $this->buildBibleserverUrl($data['losung']['reference'], $translation);
            $data['losung']['bibleserver_url'] = $losungUrl;
        }
        
        // Lehrtext über Bibleserver API in gewünschter Übersetzung laden 
        if (!empty($data['lehrtext']['reference'])) {
            $lehrtextUrl = $this->buildBibleserverUrl($data['lehrtext']['reference'], $translation);
            $data['lehrtext']['bibleserver_url'] = $lehrtextUrl;
        }
        
        // Add translation as object
        $data['translation'] = [
            'code' => $translation,
            'name' => $this->getTranslationName($translation),
            'language' => $this->getTranslationLanguage($translation)
        ];
        
        return $data;
    }
    
    private function buildBibleserverUrl($reference, $translation) {
        // Spezielle Behandlung für BIGS
        if ($translation === 'BIGS') {
            return $this->buildBigsUrl($reference);
        }
        
        // Bibelstelle für URL formatieren
        $reference = str_replace(' ', '', $reference);
        $reference = str_replace(',', ',', $reference);
        
        // Umlaute für URL kodieren
        $reference = str_replace('ä', 'ae', $reference);
        $reference = str_replace('ö', 'oe', $reference);
        $reference = str_replace('ü', 'ue', $reference);
        $reference = str_replace('Ä', 'Ae', $reference);
        $reference = str_replace('Ö', 'Oe', $reference);
        $reference = str_replace('Ü', 'Ue', $reference);
        $reference = str_replace('ß', 'ss', $reference);
        
        // URL-encode für Sonderzeichen
        $reference = urlencode($reference);
        
        return "https://www.bibleserver.com/{$translation}/{$reference}";
    }
    
    private function getTranslationName($code) {
        $translations = [
            'LUT' => 'Lutherbibel 2017',
            'ELB' => 'Elberfelder Bibel',
            'HFA' => 'Hoffnung für Alle',
            'SLT' => 'Schlachter 2000',
            'ZB' => 'Zürcher Bibel',
            'GNB' => 'Gute Nachricht Bibel',
            'NGÜ' => 'Neue Genfer Übersetzung',
            'EU' => 'Einheitsübersetzung 2016',
            'NLB' => 'Neues Leben Bibel',
            'VXB' => 'VolxBibel',
            'NeÜ' => 'Neue evangelistische Übersetzung',
            'BIGS' => 'Bibel in gerechter Sprache',
            'NIV' => 'New International Version',
            'ESV' => 'English Standard Version',
            'LSG' => 'Louis Segond'
        ];
        
        return $translations[$code] ?? $code;
    }
    
    private function getTranslationLanguage($code) {
        $languages = [
            'LUT' => 'Deutsch',
            'ELB' => 'Deutsch',
            'HFA' => 'Deutsch',
            'SLT' => 'Deutsch',
            'ZB' => 'Deutsch',
            'GNB' => 'Deutsch',
            'NGÜ' => 'Deutsch',
            'EU' => 'Deutsch',
            'NLB' => 'Deutsch',
            'VXB' => 'Deutsch',
            'NeÜ' => 'Deutsch',
            'BIGS' => 'Deutsch',
            'NIV' => 'English',
            'ESV' => 'English',
            'LSG' => 'Français'
        ];
        
        return $languages[$code] ?? 'Unknown';
    }
    
    private function buildBigsUrl($reference) {
        logDocker("[BIGS] Building URL for reference: $reference");
        // Parse Referenz für BIGS URL - handle "1. Petrus 3,8" format
        if (preg_match('/^(.+?)\s+(\d+),(\d+)(?:-(\d+))?/', $reference, $matches)) {
            $book_name = $matches[1];
            $chapter = $matches[2];
            $verse = $matches[3];
            
            // Korrekte BIGS Slugs aus bigs.txt
            $book_mappings = [
                // Altes Testament
                '1. Mose' => 'Gen', 'Genesis' => 'Gen',
                '2. Mose' => 'Ex', 'Exodus' => 'Ex', 
                '3. Mose' => 'Lev', 'Levitikus' => 'Lev',
                '4. Mose' => 'Num', 'Numeri' => 'Num',
                '5. Mose' => 'Dtn', 'Deuteronomium' => 'Dtn',
                'Josua' => 'Jos',
                'Richter' => 'Ri',
                '1. Samuel' => '1-Sam',
                '2. Samuel' => '2-Sam',
                '1. Könige' => '1-Koen',
                '2. Könige' => '2-Koen',
                'Jesaja' => 'Jes',
                'Jeremia' => 'Jer',
                'Hesekiel' => 'Ez-Hes', 'Ezechiel' => 'Ez-Hes',
                'Hosea' => 'Hos',
                'Joel' => 'Joel',
                'Amos' => 'Am',
                'Obadja' => 'Ob',
                'Jona' => 'Jona',
                'Micha' => 'Mi',
                'Nahum' => 'Nah',
                'Habakuk' => 'Hab',
                'Zefanja' => 'Zef',
                'Haggai' => 'Hag',
                'Sacharja' => 'Sach',
                'Maleachi' => 'Mal',
                'Psalm' => 'Ps', 'Psalmen' => 'Ps',
                'Sprichwörter' => 'Spr',
                'Hiob' => 'Hiob', 'Job' => 'Hiob',
                'Hoheslied' => 'Hld',
                'Rut' => 'Rut',
                'Klagelieder' => 'Klgl',
                'Prediger' => 'Koh', 'Kohelet' => 'Koh',
                'Ester' => 'Est',
                'Daniel' => 'Dan',
                'Esra' => 'Esr',
                'Nehemia' => 'Neh',
                '1. Chronik' => '1-Chr',
                '2. Chronik' => '2-Chr',
                
                // Neues Testament
                'Matthäus' => 'Mt',
                'Markus' => 'Mk', 
                'Lukas' => 'Lk',
                'Johannes' => 'Joh',
                'Apostelgeschichte' => 'Apg',
                'Römer' => 'Roem',
                '1. Korinther' => '1-Kor',
                '2. Korinther' => '2-Kor',
                'Galater' => 'Gal',
                'Epheser' => 'Eph',
                'Philipper' => 'Phil',
                'Kolosser' => 'Kol',
                '1. Thessalonicher' => '1-Thess',
                '2. Thessalonicher' => '2-Thess',
                '1. Timotheus' => '1-Tim',
                '2. Timotheus' => '2-Tim',
                'Titus' => 'Tit',
                'Philemon' => 'Phlm',
                'Hebräer' => 'Hebr',
                'Jakobus' => 'Jak',
                '1. Petrus' => '1-Petr',
                '2. Petrus' => '2-Petr',
                '1. Johannes' => '1-Joh',
                '2. Johannes' => '2-Joh',
                '3. Johannes' => '3-Joh',
                'Judas' => 'Jud',
                'Offenbarung' => 'Offb-Apk'
            ];
            
            $book_abbrev = $book_mappings[$book_name] ?? $book_name;
            $url = "https://www.bibel-in-gerechter-sprache.de/die-bibel/bigs-online/?{$book_abbrev}/{$chapter}/{$verse}/";
            logDocker("[BIGS] Generated URL: $url");
            return $url;
        }
        
        // Fallback to ERF if parsing fails
        logDocker("[BIGS] Parse failed, using fallback for: $reference");
        return "https://www.bibleserver.com/BIGS/" . urlencode($reference);
    }
    
    private function getCurrentGermanDate() {
        // Set timezone to German time (CEST/CET)
        $timezone = new DateTimeZone('Europe/Berlin');
        $now = new DateTime('now', $timezone);
        return $now->format('Y-m-d');
    }
}

// Main execution
try {
    // API-Key prüfen
    if (!validateApiKey()) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Ungültiger API-Key'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // Rate Limiting prüfen
    if (!checkRateLimit()) {
        http_response_code(429);
        echo json_encode([
            'success' => false,
            'error' => 'Rate Limit erreicht. Versuche es später erneut.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // Service erstellen und Losung laden
    $service = new LosungenService();
    $date = $_GET['date'] ?? null;
    $translation = $_GET['translation'] ?? 'LUT';
    
    $result = $service->getDailyLosung($date, $translation);
    
    if ($result['success']) {
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(400);
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
    }
    
} catch (Exception $e) {
    logDocker("FATAL ERROR: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal Server Error'
    ], JSON_UNESCAPED_UNICODE);
}
?>

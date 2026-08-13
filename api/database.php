<?php
/**
 * PostgreSQL Database Handler für Losungen API
 * Verwaltet Cache für tägliche Losungen in allen Übersetzungen
 */

class LosungenDatabase {
    private $pdo = null;
    private $host;
    private $dbname;
    private $username;
    private $password;
    
    public function __construct() {
        $this->host = $_ENV['DB_HOST'] ?? 'localhost';
        $this->dbname = $_ENV['DB_NAME'] ?? 'losungen_db';
        $this->username = $_ENV['DB_USER'] ?? 'losungen_user';
        $this->password = $_ENV['DB_PASSWORD'] ?? '';
    }
    
    /**
     * Verbindung zur Datenbank aufbauen
     */
    private function connect() {
        if ($this->pdo === null) {
            // Eine geteilte PDO-Verbindung pro Request statt mehrerer paralleler
            $this->pdo = getDatabase();
        }
        return $this->pdo;
    }
    
    /**
     * Speichere eine Übersetzung in der Datenbank
     */
    public function saveTranslation($date, $translationCode, $data) {
        try {
            $pdo = $this->connect();
            
            $sql = "INSERT INTO translation_cache (
                date, translation_code, translation_name, language,
                losung_text, losung_reference, losung_testament, losung_source, losung_url,
                lehrtext_text, lehrtext_reference, lehrtext_testament, lehrtext_source, lehrtext_url,
                success, error_message
            ) VALUES (
                :date, :translation_code, :translation_name, :language,
                :losung_text, :losung_reference, :losung_testament, :losung_source, :losung_url,
                :lehrtext_text, :lehrtext_reference, :lehrtext_testament, :lehrtext_source, :lehrtext_url,
                :success, :error_message
            ) ON CONFLICT (date, translation_code) DO UPDATE SET
                translation_name = EXCLUDED.translation_name,
                language = EXCLUDED.language,
                losung_text = EXCLUDED.losung_text,
                losung_reference = EXCLUDED.losung_reference,
                losung_testament = EXCLUDED.losung_testament,
                losung_source = EXCLUDED.losung_source,
                losung_url = EXCLUDED.losung_url,
                lehrtext_text = EXCLUDED.lehrtext_text,
                lehrtext_reference = EXCLUDED.lehrtext_reference,
                lehrtext_testament = EXCLUDED.lehrtext_testament,
                lehrtext_source = EXCLUDED.lehrtext_source,
                lehrtext_url = EXCLUDED.lehrtext_url,
                success = EXCLUDED.success,
                error_message = EXCLUDED.error_message,
                created_at = NOW()";
            
            $stmt = $pdo->prepare($sql);
            
            $success = isset($data['losung']['text']) && isset($data['lehrtext']['text']);
            
            $stmt->execute([
                'date' => $date,
                'translation_code' => $translationCode,
                'translation_name' => $data['translation']['name'] ?? '',
                'language' => $data['translation']['language'] ?? 'Unknown',
                'losung_text' => $data['losung']['text'] ?? null,
                'losung_reference' => $data['losung']['reference'] ?? null,
                'losung_testament' => $data['losung']['testament'] ?? 'AT',
                'losung_source' => $data['losung']['translation_source'] ?? null,
                'losung_url' => $data['losung']['bibleserver_url'] ?? null,
                'lehrtext_text' => $data['lehrtext']['text'] ?? null,
                'lehrtext_reference' => $data['lehrtext']['reference'] ?? null,
                'lehrtext_testament' => $data['lehrtext']['testament'] ?? 'NT',
                'lehrtext_source' => $data['lehrtext']['translation_source'] ?? null,
                'lehrtext_url' => $data['lehrtext']['bibleserver_url'] ?? null,
                'success' => $success,
                'error_message' => $success ? null : 'Incomplete data'
            ]);
            
            return true;
            
        } catch (PDOException $e) {
            error_log("Failed to save translation: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Lade eine Übersetzung aus der Datenbank
     */
    public function getTranslation($date, $translationCode) {
        try {
            $pdo = $this->connect();
            
            $sql = "SELECT * FROM translation_cache 
                    WHERE date = :date AND translation_code = :translation_code 
                    AND success = true";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                'date' => $date,
                'translation_code' => $translationCode
            ]);
            
            $row = $stmt->fetch();
            
            if (!$row) {
                return null;
            }
            
            // Konvertiere Datenbankdaten zurück in API-Format
            return [
                'date' => $row['date'],
                'losung' => [
                    'text' => $row['losung_text'],
                    'reference' => $row['losung_reference'],
                    'testament' => $row['losung_testament'],
                    'translation_source' => $row['losung_source'],
                    'bibleserver_url' => $row['losung_url']
                ],
                'lehrtext' => [
                    'text' => $row['lehrtext_text'],
                    'reference' => $row['lehrtext_reference'],
                    'testament' => $row['lehrtext_testament'],
                    'translation_source' => $row['lehrtext_source'],
                    'bibleserver_url' => $row['lehrtext_url']
                ],
                'translation' => [
                    'code' => $row['translation_code'],
                    'name' => $row['translation_name'],
                    'language' => $row['language']
                ],
                'source' => 'Herrnhuter Losungen',
                'url' => 'https://www.losungen.de/',
                'cached_at' => $row['created_at']
            ];
            
        } catch (PDOException $e) {
            error_log("Failed to get translation: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Lade die Basis-Losung (Herrnhuter Grundbestand) aus der Datenbank
     * Quelle für Bibelstellen statt Scraping von losungen.de
     */
    public function getBaseLosung($date) {
        try {
            $pdo = $this->connect();

            $sql = "SELECT date, weekday, holiday, ot_text, ot_reference, nt_text, nt_reference
                    FROM losungen WHERE date = :date";

            $stmt = $pdo->prepare($sql);
            $stmt->execute(['date' => $date]);

            $row = $stmt->fetch();

            if (!$row) {
                return null;
            }

            return [
                'date' => $row['date'],
                'weekday' => $row['weekday'],
                'holiday' => $row['holiday'],
                'losung' => [
                    'text' => $row['ot_text'],
                    'reference' => $row['ot_reference'],
                    'testament' => 'AT'
                ],
                'lehrtext' => [
                    'text' => $row['nt_text'],
                    'reference' => $row['nt_reference'],
                    'testament' => 'NT'
                ],
                'source' => 'Herrnhuter Losungen',
                'url' => 'https://www.losungen.de/'
            ];

        } catch (PDOException $e) {
            error_log("Failed to get base losung: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Lade alle Übersetzungen für ein Datum
     */
    public function getAllTranslations($date) {
        try {
            $pdo = $this->connect();
            
            $sql = "SELECT * FROM translation_cache 
                    WHERE date = :date AND success = true
                    ORDER BY translation_code";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute(['date' => $date]);
            
            $translations = [];
            
            while ($row = $stmt->fetch()) {
                $translations[$row['translation_code']] = [
                    'date' => $row['date'],
                    'losung' => [
                        'text' => $row['losung_text'],
                        'reference' => $row['losung_reference'],
                        'testament' => $row['losung_testament'],
                        'translation_source' => $row['losung_source'],
                        'bibleserver_url' => $row['losung_url']
                    ],
                    'lehrtext' => [
                        'text' => $row['lehrtext_text'],
                        'reference' => $row['lehrtext_reference'],
                        'testament' => $row['lehrtext_testament'],
                        'translation_source' => $row['lehrtext_source'],
                        'bibleserver_url' => $row['lehrtext_url']
                    ],
                    'translation' => [
                        'code' => $row['translation_code'],
                        'name' => $row['translation_name'],
                        'language' => $row['language']
                    ],
                    'source' => 'Herrnhuter Losungen',
                    'url' => 'https://www.losungen.de/',
                    'cached_at' => $row['created_at']
                ];
            }
            
            return $translations;
            
        } catch (PDOException $e) {
            error_log("Failed to get all translations: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Prüfe ob für ein Datum bereits Daten vorhanden sind
     */
    public function hasDataForDate($date) {
        try {
            $pdo = $this->connect();
            
            $sql = "SELECT COUNT(*) FROM translation_cache 
                    WHERE date = :date AND success = true";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute(['date' => $date]);
            
            return $stmt->fetchColumn() > 0;
            
        } catch (PDOException $e) {
            error_log("Failed to check data for date: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Speichere Original Losungen-Daten
     */
    public function saveDailyLosung($date, $originalData) {
        try {
            $pdo = $this->connect();
            
            $sql = "INSERT INTO daily_losungen (date, original_data) 
                    VALUES (:date, :original_data)
                    ON CONFLICT (date) DO UPDATE SET
                        original_data = EXCLUDED.original_data,
                        updated_at = NOW()";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                'date' => $date,
                'original_data' => json_encode($originalData)
            ]);
            
            return true;
            
        } catch (PDOException $e) {
            error_log("Failed to save daily losung: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Cleanup alte Daten
     */
    public function cleanup() {
        try {
            $pdo = $this->connect();
            
            $sql = "SELECT cleanup_old_translations()";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            
            return $stmt->fetchColumn();
            
        } catch (PDOException $e) {
            error_log("Failed to cleanup: " . $e->getMessage());
            return 0;
        }
    }
    
    /**
     * Statistiken abrufen
     */
    public function getStats() {
        try {
            $pdo = $this->connect();
            
            $sql = "SELECT * FROM daily_translations_summary 
                    ORDER BY date DESC LIMIT 7";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            
            return $stmt->fetchAll();
            
        } catch (PDOException $e) {
            error_log("Failed to get stats: " . $e->getMessage());
            return [];
        }
    }
}

// Global database connection function for compatibility
function getDatabase() {
    static $pdo = null;
    if ($pdo === null) {
        $host = $_ENV['DB_HOST'] ?? 'localhost';
        $dbname = $_ENV['DB_NAME'] ?? 'losungen_db';
        $username = $_ENV['DB_USER'] ?? 'losungen_user';
        $password = $_ENV['DB_PASSWORD'] ?? '';
        
        try {
            $dsn = "pgsql:host={$host};dbname={$dbname};port=5432";
            $pdo = new PDO($dsn, $username, $password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            throw new Exception("Database connection failed");
        }
    }
    return $pdo;
}
?>
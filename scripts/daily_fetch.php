#!/usr/bin/env php
<?php
/**
 * Täglicher Fetch-Job für alle Übersetzungen
 * Lädt alle verfügbaren Übersetzungen und speichert sie in der Datenbank
 * 
 * Verwendung: php daily_fetch.php [YYYY-MM-DD]
 * Ohne Datum wird das heutige Datum verwendet
 */

require_once '/var/www/html/database.php';

// Umgebungsvariablen laden
if (file_exists(__DIR__ . '/../.env')) {
    $envVars = parse_ini_file(__DIR__ . '/../.env');
    foreach ($envVars as $key => $value) {
        $_ENV[$key] = $value;
    }
}

class DailyFetcher {
    private $db;
    private $availableTranslations = [
        // Deutsche Übersetzungen  
        'LUT', 'ELB', 'HFA', 'SLT', 'ZB', 'GNB', 'NGÜ', 'EU', 'NLB', 'VXB', 'NeÜ', 'BIGS',
        // Funktionierende Fremdsprachen
        'NIV', 'ESV', 'LSG',
        // Weitere Fremdsprachen
        'NLT', 'MSG', 'CEV', 'GNT', 'NKJV', 'KJV', 'NASB', 'CSB', 
        'BDS', 'S21', 'RVR60', 'NVI', 'DHH', 'RVR95', 'LBLA', 'NVT'
    ];
    
    public function __construct() {
        $this->db = new LosungenDatabase();
    }
    
    /**
     * Führe täglichen Fetch aus
     */
    public function fetchDaily($date = null) {
        if (!$date) {
            $date = date('Y-m-d');
        }
        
        $startTime = microtime(true);
        $successCount = 0;
        $errorCount = 0;
        $errors = [];
        
        // Log start of daily fetch
        error_log("[LOSUNGEN DAILY] Starting daily fetch for $date - " . count($this->availableTranslations) . " translations");
        
        echo "🔄 Starte täglichen Fetch für {$date}\n";
        echo "📊 Insgesamt " . count($this->availableTranslations) . " Übersetzungen zu laden...\n\n";
        
        // Prüfe ob bereits Daten vorhanden sind
        if ($this->db->hasDataForDate($date)) {
            echo "⚠️  Daten für {$date} bereits vorhanden. Überschreibe...\n";
        }

        // Basis-Losung aus der Datenbank laden (statt losungen.de zu scrapen)
        $base = $this->db->getBaseLosung($date);

        if (!$base) {
            $msg = "Keine Basis-Losung für {$date} in der Datenbank. Jahresdaten importieren: scripts/import_losungen.php";
            error_log("[LOSUNGEN DAILY] ABORT: $msg");
            echo "❌ {$msg}\n";
            return false;
        }

        echo "📖 Basis aus DB: {$base['losung']['reference']} / {$base['lehrtext']['reference']}\n\n";

        foreach ($this->availableTranslations as $index => $translation) {
            $translationStartTime = microtime(true);
            
            try {
                echo sprintf("[%2d/%2d] %4s: ", $index + 1, count($this->availableTranslations), $translation);
                
                // Python-Scraper aufrufen, Bibelstellen aus der Datenbank übergeben
                $pythonScript = '/var/www/html/scraper.py';
                $command = "/opt/venv/bin/python3 {$pythonScript} "
                    . escapeshellarg($translation) . ' '
                    . escapeshellarg($base['losung']['reference']) . ' '
                    . escapeshellarg($base['lehrtext']['reference']) . ' '
                    . escapeshellarg($base['losung']['text']) . ' '
                    . escapeshellarg($base['lehrtext']['text']) . ' '
                    . escapeshellarg($date) . ' 2>&1';
                $output = shell_exec($command);
                
                if (!$output) {
                    throw new Exception("Kein Output vom Python-Scraper");
                }
                
                $data = json_decode($output, true);
                
                if (!$data) {
                    throw new Exception("Invalid JSON response: " . substr($output, 0, 100));
                }
                
                if (isset($data['error'])) {
                    throw new Exception($data['error']);
                }
                
                // In Datenbank speichern
                $saved = $this->db->saveTranslation($date, $translation, $data);
                
                if (!$saved) {
                    throw new Exception("Speichern in Datenbank fehlgeschlagen");
                }
                
                $duration = round((microtime(true) - $translationStartTime) * 1000);
                echo "✅ OK ({$duration}ms)\n";
                $successCount++;
                
                // Kurze Pause um Server zu schonen
                usleep(200000); // 0.2 Sekunden
                
            } catch (Exception $e) {
                $duration = round((microtime(true) - $translationStartTime) * 1000);
                echo "❌ ERROR: " . $e->getMessage() . " ({$duration}ms)\n";
                $errorCount++;
                $errors[$translation] = $e->getMessage();
            }
        }
        
        $totalDuration = round((microtime(true) - $startTime));
        
        echo "\n" . str_repeat("=", 50) . "\n";
        echo "📈 ZUSAMMENFASSUNG\n";
        echo "📅 Datum: {$date}\n";
        echo "✅ Erfolgreich: {$successCount}\n";
        echo "❌ Fehler: {$errorCount}\n";
        echo "⏱️  Gesamtdauer: {$totalDuration}s\n";
        
        if (!empty($errors)) {
            echo "\n🚨 FEHLER-DETAILS:\n";
            foreach ($errors as $translation => $error) {
                echo "  {$translation}: {$error}\n";
            }
        }
        
        // Original-Losung speichern (LUT)
        if ($successCount > 0) {
            try {
                $lutData = $this->db->getTranslation($date, 'LUT');
                if ($lutData) {
                    $this->db->saveDailyLosung($date, $lutData);
                    echo "💾 Original-Losung gespeichert\n";
                }
            } catch (Exception $e) {
                echo "⚠️  Original-Losung konnte nicht gespeichert werden: " . $e->getMessage() . "\n";
            }
        }
        
        // Cleanup alte Daten
        try {
            $deletedCount = $this->db->cleanup();
            echo "🧹 Cleanup: {$deletedCount} alte Einträge entfernt\n";
        } catch (Exception $e) {
            echo "⚠️  Cleanup fehlgeschlagen: " . $e->getMessage() . "\n";
        }
        
        echo "\n🎉 Fetch abgeschlossen!\n";
        
        // Update cron status file for admin panel
        touch(__DIR__ . '/cron_status.php');
        
        // Log completion
        error_log("[LOSUNGEN DAILY] Completed fetch for $date: $successCount/" . count($this->availableTranslations) . " successful in {$totalDuration}s");
        
        if (!empty($errors)) {
            foreach ($errors as $translation => $error) {
                error_log("[LOSUNGEN DAILY] ERROR $translation: $error");
            }
        }
        
        return [
            'date' => $date,
            'success_count' => $successCount,
            'error_count' => $errorCount,
            'errors' => $errors,
            'duration_seconds' => $totalDuration
        ];
    }
}

// CLI-Interface
if (php_sapi_name() === 'cli') {
    $date = $argv[1] ?? null;
    
    // Validiere Datum
    if ($date && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        echo "❌ Ungültiges Datumsformat. Verwende YYYY-MM-DD\n";
        exit(1);
    }
    
    try {
        $fetcher = new DailyFetcher();
        $result = $fetcher->fetchDaily($date);
        
        // Exit-Code basierend auf Erfolg
        exit($result['error_count'] > 0 ? 1 : 0);
        
    } catch (Exception $e) {
        echo "💥 FATALER FEHLER: " . $e->getMessage() . "\n";
        exit(1);
    }
} else {
    echo "Dieses Skript muss über die Kommandozeile ausgeführt werden.\n";
    exit(1);
}
?>
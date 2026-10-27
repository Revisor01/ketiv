#!/usr/bin/env php
<?php
/** Lädt beim Container-Start die Daten für heute, falls sie fehlen. */

require_once '/var/www/html/database.php';

// Kurz warten bis die Datenbank bereit ist
sleep(3);

$today = date('Y-m-d');

try {
    $db = new LosungenDatabase();
    
    // Prüfe ob Daten für heute vorhanden sind
    $hasData = $db->hasDataForDate($today);
    
    if ($hasData) {
        error_log("[LOSUNGEN STARTUP] ✅ Data for $today already exists in database");
        echo "✅ Data for $today already exists - no fetch needed\n";
        exit(0);
    }
    
    error_log("[LOSUNGEN STARTUP] 📥 No data for $today found - starting automatic fetch");
    echo "📥 No data for $today found - starting automatic fetch...\n";
    
    // Führe Daily Fetch aus
    $startTime = microtime(true);
    $command = "/usr/local/bin/php /var/www/html/scripts/daily_fetch.php $today 2>&1";
    $output = shell_exec($command);
    $duration = round((microtime(true) - $startTime), 2);
    
    // Log Ergebnis
    if (strpos($output, '🎉 Fetch abgeschlossen!') !== false) {
        error_log("[LOSUNGEN STARTUP] ✅ Automatic fetch completed successfully in {$duration}s");
        echo "✅ Automatic fetch completed successfully in {$duration}s\n";
        
        // Prüfe nochmal ob Daten jetzt da sind
        $hasDataAfter = $db->hasDataForDate($today);
        if ($hasDataAfter) {
            error_log("[LOSUNGEN STARTUP] 💾 Database now contains data for $today");
            echo "💾 Database now contains data for $today\n";
        } else {
            error_log("[LOSUNGEN STARTUP] ⚠️ Warning: Fetch completed but no data found in database");
            echo "⚠️ Warning: Fetch completed but no data found in database\n";
        }
    } else {
        error_log("[LOSUNGEN STARTUP] ❌ Automatic fetch failed after {$duration}s");
        echo "❌ Automatic fetch failed after {$duration}s\n";
        
        // Log die ersten Zeilen des Outputs für Debugging
        $outputLines = explode("\n", $output);
        $firstLines = array_slice($outputLines, 0, 5);
        foreach ($firstLines as $line) {
            if (trim($line)) {
                error_log("[LOSUNGEN STARTUP] Output: " . trim($line));
            }
        }
    }
    
} catch (Exception $e) {
    error_log("[LOSUNGEN STARTUP] ❌ Startup check failed: " . $e->getMessage());
    echo "❌ Startup check failed: " . $e->getMessage() . "\n";
    exit(1);
}

echo "🚀 Startup check completed\n";
exit(0);
?>
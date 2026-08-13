<?php
/**
 * Jahresimport der Herrnhuter Losungen
 *
 * Liest das offizielle XML-Paket von losungen.de (oder eine lokale Datei)
 * und schreibt die Tageslosungen in die Tabelle `losungen`.
 *
 * Aufruf:
 *   php import_losungen.php 2027                    # Download von losungen.de
 *   php import_losungen.php 2027 /pfad/datei.zip    # lokale ZIP oder XML
 */

// Im Container liegt database.php unter /var/www/html, lokal unter api/
if (file_exists('/var/www/html/database.php')) {
    require_once '/var/www/html/database.php';
} else {
    require_once __DIR__ . '/../api/database.php';
}

class LosungenImporter {
    private $db;
    private $pdo;

    public function __construct() {
        $this->db = new LosungenDatabase();
        $reflection = new ReflectionClass($this->db);
        $connect = $reflection->getMethod('connect');
        $connect->setAccessible(true);
        $this->pdo = $connect->invoke($this->db);
    }

    /**
     * Holt das XML für ein Jahr: aus lokaler Datei oder von losungen.de
     */
    private function loadXml($year, $localPath = null) {
        if ($localPath) {
            if (!file_exists($localPath)) {
                throw new Exception("Datei nicht gefunden: {$localPath}");
            }
            $path = $localPath;
            echo "📂 Lokale Datei: {$path}\n";
        } else {
            $url = "https://www.losungen.de/fileadmin/media-losungen/download/Losung_{$year}_XML.zip";
            echo "🌐 Lade {$url}\n";

            // losungen.de liefert eine unvollstaendige Zertifikatskette aus,
            // deshalb ohne Peer-Verifikation. Rein privates Projekt.
            $context = stream_context_create([
                'ssl' => ['verify_peer' => false, 'verify_peer_name' => false],
                'http' => ['user_agent' => 'LosungenAPI/1.0', 'timeout' => 60]
            ]);

            $data = @file_get_contents($url, false, $context);
            if ($data === false) {
                throw new Exception("Download fehlgeschlagen. Datei von Hand laden und Pfad übergeben.");
            }

            $path = sys_get_temp_dir() . "/Losung_{$year}_XML.zip";
            file_put_contents($path, $data);
            echo "✅ " . number_format(strlen($data)) . " Bytes geladen\n";
        }

        // XML direkt oder aus ZIP extrahieren
        if (strtolower(pathinfo($path, PATHINFO_EXTENSION)) === 'xml') {
            return file_get_contents($path);
        }

        $xmlContent = class_exists('ZipArchive')
            ? $this->extractWithZipArchive($path)
            : $this->extractWithUnzip($path);

        if (!$xmlContent) {
            throw new Exception("Keine XML-Datei im ZIP gefunden");
        }

        return $xmlContent;
    }

    /**
     * ZIP-Extraktion über die PHP-Erweiterung
     */
    private function extractWithZipArchive($path) {
        $zip = new ZipArchive();
        if ($zip->open($path) !== true) {
            throw new Exception("ZIP konnte nicht geöffnet werden: {$path}");
        }

        $xmlContent = null;
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = $zip->getNameIndex($i);
            if (strtolower(pathinfo($name, PATHINFO_EXTENSION)) === 'xml') {
                echo "📄 Enthaltene XML: {$name}\n";
                $xmlContent = $zip->getFromIndex($i);
                break;
            }
        }
        $zip->close();

        return $xmlContent;
    }

    /**
     * ZIP-Extraktion über das unzip-Binary (ext-zip ist im Image nicht vorhanden)
     */
    private function extractWithUnzip($path) {
        $list = shell_exec('unzip -Z1 ' . escapeshellarg($path) . ' 2>/dev/null');
        if (!$list) {
            throw new Exception("ZIP konnte nicht gelesen werden: {$path}");
        }

        foreach (explode("\n", trim($list)) as $name) {
            if (strtolower(pathinfo($name, PATHINFO_EXTENSION)) === 'xml') {
                echo "📄 Enthaltene XML: {$name}\n";
                return shell_exec('unzip -p ' . escapeshellarg($path) . ' ' . escapeshellarg($name) . ' 2>/dev/null');
            }
        }

        return null;
    }

    /**
     * Importiert ein Jahr, bestehende Einträge werden aktualisiert
     */
    public function import($year, $localPath = null) {
        $xmlContent = $this->loadXml($year, $localPath);

        $xml = simplexml_load_string($xmlContent);
        if ($xml === false) {
            throw new Exception("XML konnte nicht geparst werden");
        }

        $entries = $xml->Losungen;
        echo "📊 " . count($entries) . " Tageseinträge gefunden\n\n";

        $sql = "INSERT INTO losungen (date, weekday, holiday, ot_text, ot_reference, nt_text, nt_reference)
                VALUES (:date, :weekday, :holiday, :ot_text, :ot_reference, :nt_text, :nt_reference)
                ON CONFLICT (date) DO UPDATE SET
                    weekday = EXCLUDED.weekday,
                    holiday = EXCLUDED.holiday,
                    ot_text = EXCLUDED.ot_text,
                    ot_reference = EXCLUDED.ot_reference,
                    nt_text = EXCLUDED.nt_text,
                    nt_reference = EXCLUDED.nt_reference,
                    updated_at = NOW()";

        $stmt = $this->pdo->prepare($sql);

        $imported = 0;
        $skipped = 0;

        foreach ($entries as $entry) {
            $datum = (string)$entry->Datum;
            $date = substr($datum, 0, 10);

            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                echo "⚠️  Ungültiges Datum übersprungen: {$datum}\n";
                $skipped++;
                continue;
            }

            $stmt->execute([
                'date' => $date,
                'weekday' => (string)$entry->Wtag ?: null,
                'holiday' => (string)$entry->Sonntag ?: null,
                'ot_text' => (string)$entry->Losungstext,
                'ot_reference' => (string)$entry->Losungsvers,
                'nt_text' => (string)$entry->Lehrtext,
                'nt_reference' => (string)$entry->Lehrtextvers
            ]);

            $imported++;
        }

        echo "✅ {$imported} Einträge importiert/aktualisiert\n";
        if ($skipped > 0) {
            echo "⚠️  {$skipped} übersprungen\n";
        }

        $check = $this->pdo->prepare("SELECT COUNT(*) FROM losungen WHERE EXTRACT(YEAR FROM date) = :year");
        $check->execute(['year' => $year]);
        echo "📅 Bestand {$year}: " . $check->fetchColumn() . " Tage\n";

        return $imported;
    }
}

// CLI
if (php_sapi_name() === 'cli') {
    $year = $argv[1] ?? null;
    $localPath = $argv[2] ?? null;

    if (!$year || !preg_match('/^\d{4}$/', $year)) {
        echo "Aufruf: php import_losungen.php <Jahr> [lokale-datei.zip|xml]\n";
        echo "Beispiel: php import_losungen.php 2027\n";
        exit(1);
    }

    echo "📥 Import Herrnhuter Losungen {$year}\n\n";

    try {
        $importer = new LosungenImporter();
        $importer->import($year, $localPath);
        echo "\n🎉 Import abgeschlossen\n";
        exit(0);
    } catch (Exception $e) {
        echo "\n❌ Fehler: " . $e->getMessage() . "\n";
        exit(1);
    }
}

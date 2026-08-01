<?php
/**
 * Sunday/Kirchenjahr API Endpoint
 * Liefert alle relevanten Daten für einen Sonntag/Feiertag
 * Optional mit Bibeltexten in gewünschter Übersetzung
 * Optimiert für n8n und externe Integrationen
 */

require_once 'database.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

/**
 * Berechnet die aktuelle Perikopenreihe basierend auf dem Datum
 * Reihe I startete 2018/19, rotiert alle 6 Jahre
 */
function getCurrentPerikopenreihe($date) {
    $dateObj = new DateTime($date);
    $year = (int)$dateObj->format('Y');
    $month = (int)$dateObj->format('n');

    // Kirchenjahr beginnt am 1. Advent (ca. Ende November)
    // Vereinfacht: Ab Dezember = neues Kirchenjahr
    $kirchenjahrStart = $month >= 12 ? $year : $year - 1;

    // Reihe I startete 2018/19
    $reihen = ['I', 'II', 'III', 'IV', 'V', 'VI'];
    $jahresSeit2018 = $kirchenjahrStart - 2018;
    $reiheIndex = (($jahresSeit2018 % 6) + 6) % 6;

    return [
        'reihe' => $reihen[$reiheIndex],
        'reihe_nummer' => $reiheIndex + 1,
        'kirchenjahr' => $kirchenjahrStart . '/' . ($kirchenjahrStart + 1)
    ];
}

/**
 * Findet den nächsten Sonntag ab einem gegebenen Datum
 */
function getNextSunday($date = null) {
    $dateObj = $date ? new DateTime($date) : new DateTime();
    $dayOfWeek = (int)$dateObj->format('w'); // 0 = Sonntag

    if ($dayOfWeek === 0) {
        // Heute ist Sonntag
        return $dateObj->format('Y-m-d');
    }

    // Tage bis zum nächsten Sonntag
    $daysUntilSunday = 7 - $dayOfWeek;
    $dateObj->modify("+{$daysUntilSunday} days");
    return $dateObj->format('Y-m-d');
}

/**
 * Formatiert Datum auf Deutsch
 */
function formatGermanDate($date) {
    $wochentage = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    $monate = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

    $dateObj = new DateTime($date);
    $wochentag = $wochentage[(int)$dateObj->format('w')];
    $tag = $dateObj->format('j');
    $monat = $monate[(int)$dateObj->format('n') - 1];
    $jahr = $dateObj->format('Y');

    return "$wochentag, $tag. $monat $jahr";
}

/**
 * Holt Bibeltext über bible_search.php
 * Gibt das komplette Ergebnis mit Versen zurück (inkl. optional-Markierung)
 */
function fetchBibleText($reference, $translation, $apiKey) {
    if (empty($reference)) {
        return null;
    }

    // Originale Referenz beibehalten - bible_search.php kann Klammer-Notation verarbeiten
    // Interne API-Anfrage
    $baseUrl = 'http://localhost/bible_search.php';
    $params = http_build_query([
        'reference' => $reference,
        'translation' => $translation,
        'api_key' => $apiKey,
        'format' => 'json'
    ]);

    $context = stream_context_create([
        'http' => [
            'timeout' => 15,
            'ignore_errors' => true
        ]
    ]);

    $response = @file_get_contents("$baseUrl?$params", false, $context);

    if ($response === false) {
        return null;
    }

    $data = json_decode($response, true);

    if (!$data || !isset($data['success']) || !$data['success']) {
        return null;
    }

    // Komplettes Ergebnis zurückgeben
    return $data['data'] ?? null;
}

/**
 * Normalisiert Bibelreferenz für Vergleich
 */
function normalizeReference($ref) {
    if (empty($ref)) return '';
    // Entferne Klammern, Leerzeichen, Bindestriche normalisieren
    $normalized = preg_replace('/\([^)]+\)/', '', $ref);
    $normalized = preg_replace('/\s+/', '', $normalized);
    $normalized = strtolower($normalized);
    return $normalized;
}

try {
    $db = getDatabase();

    // Parameter
    $action = $_GET['action'] ?? 'next_sunday';
    $date = $_GET['date'] ?? null;
    $translation = $_GET['translation'] ?? null;
    $apiKey = $_GET['api_key'] ?? $_SERVER['HTTP_X_API_KEY'] ?? null;

    switch ($action) {
        case 'next_sunday':
            // Nächsten Sonntag finden
            $targetDate = getNextSunday($date);
            break;

        case 'date':
            // Spezifisches Datum
            if (!$date || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                throw new Exception('Ungültiges Datum. Format: YYYY-MM-DD');
            }
            $targetDate = $date;
            break;

        case 'today':
            // Heute
            $targetDate = date('Y-m-d');
            break;

        default:
            throw new Exception('Ungültige Aktion. Erlaubt: next_sunday, date, today');
    }

    // Kirchenjahr-Event für das Datum laden
    $stmt = $db->prepare("
        SELECT * FROM church_events
        WHERE event_date = ?
        ORDER BY id
        LIMIT 1
    ");
    $stmt->execute([$targetDate]);
    $event = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$event) {
        // Kein spezielles Event - trotzdem Basis-Infos zurückgeben
        $perikopenInfo = getCurrentPerikopenreihe($targetDate);

        echo json_encode([
            'success' => true,
            'data' => [
                'datum' => $targetDate,
                'datum_formatiert' => formatGermanDate($targetDate),
                'ist_feiertag' => false,
                'name' => null,
                'perikopenreihe' => $perikopenInfo
            ],
            'message' => 'Kein liturgisches Ereignis für dieses Datum'
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }

    // Perikopenreihe berechnen
    $perikopenInfo = getCurrentPerikopenreihe($targetDate);
    $perikopen = $event['perikopen'] ? json_decode($event['perikopen'], true) : null;

    // Aktuellen Predigttext ermitteln
    $aktuellerPredigttext = null;
    if ($perikopen && isset($perikopen[$perikopenInfo['reihe']])) {
        $aktuellerPredigttext = $perikopen[$perikopenInfo['reihe']];
    }

    // Prüfen ob Predigttext identisch mit einer der Lesungen ist
    $predigttextNorm = normalizeReference($aktuellerPredigttext);
    $predigttextIdentischMit = null;

    if ($predigttextNorm === normalizeReference($event['old_testament_reading'])) {
        $predigttextIdentischMit = 'altes_testament';
    } elseif ($predigttextNorm === normalizeReference($event['epistle'])) {
        $predigttextIdentischMit = 'epistel';
    } elseif ($predigttextNorm === normalizeReference($event['gospel'])) {
        $predigttextIdentischMit = 'evangelium';
    }

    // Response zusammenbauen
    $response = [
        'success' => true,
        'data' => [
            // Basis-Infos
            'datum' => $event['event_date'],
            'datum_formatiert' => formatGermanDate($event['event_date']),
            'ist_feiertag' => true,

            // Sonntag/Feiertag
            'name' => $event['summary'],
            'liturgische_farbe' => $event['liturgical_color'],
            'kirchenjahreszeit' => $event['season'],

            // Wochenspruch
            'wochenspruch' => [
                'referenz' => $event['weekly_verse_reference'],
                'text' => $event['weekly_verse']
            ],

            // Psalm
            'wochenpsalm' => [
                'referenz' => $event['psalm'],
                'eg_nummer' => $event['psalm_eg']
            ],

            // Perikopenreihe
            'perikopenreihe' => [
                'aktuell' => $perikopenInfo['reihe'],
                'nummer' => $perikopenInfo['reihe_nummer'],
                'kirchenjahr' => $perikopenInfo['kirchenjahr']
            ],

            // Predigttext
            'predigttext' => [
                'referenz' => $aktuellerPredigttext,
                'identisch_mit' => $predigttextIdentischMit
            ],

            // Lesungen
            'lesungen' => [
                'altes_testament' => [
                    'referenz' => $event['old_testament_reading']
                ],
                'epistel' => [
                    'referenz' => $event['epistle']
                ],
                'evangelium' => [
                    'referenz' => $event['gospel']
                ]
            ],

            // Alle Perikopen
            'perikopen' => $perikopen,

            // Wochenlieder
            'wochenlieder' => [],

            // Links
            'url' => $event['url']
        ],
        'timestamp' => date('c')
    ];

    // Wochenlieder hinzufügen
    if (!empty($event['hymn1'])) {
        $response['data']['wochenlieder'][] = [
            'titel' => $event['hymn1'],
            'eg_nummer' => $event['hymn1_eg']
        ];
    }
    if (!empty($event['hymn2'])) {
        $response['data']['wochenlieder'][] = [
            'titel' => $event['hymn2'],
            'eg_nummer' => $event['hymn2_eg']
        ];
    }

    // Wenn Übersetzung angefordert, Texte laden
    if ($translation && $apiKey) {
        $response['data']['uebersetzung'] = $translation;

        // Texte die wir laden wollen (ohne Duplikate)
        $texteZuLaden = [];

        // Predigttext (wenn nicht identisch mit einer Lesung)
        if (!$predigttextIdentischMit && $aktuellerPredigttext) {
            $texteZuLaden['predigttext'] = $aktuellerPredigttext;
        }

        // AT-Lesung
        if ($event['old_testament_reading']) {
            $texteZuLaden['altes_testament'] = $event['old_testament_reading'];
        }

        // Epistel
        if ($event['epistle']) {
            $texteZuLaden['epistel'] = $event['epistle'];
        }

        // Evangelium
        if ($event['gospel']) {
            $texteZuLaden['evangelium'] = $event['gospel'];
        }

        // Psalm
        if ($event['psalm']) {
            $texteZuLaden['psalm'] = $event['psalm'];
        }

        // Texte laden
        foreach ($texteZuLaden as $key => $referenz) {
            $bibeltext = fetchBibleText($referenz, $translation, $apiKey);

            if ($key === 'predigttext') {
                $response['data']['predigttext']['bibeltext'] = $bibeltext;
            } elseif ($key === 'psalm') {
                $response['data']['wochenpsalm']['bibeltext'] = $bibeltext;
            } else {
                $response['data']['lesungen'][$key]['bibeltext'] = $bibeltext;
            }
        }

        // Wenn Predigttext identisch, Referenz auf den Bibeltext setzen
        if ($predigttextIdentischMit) {
            $response['data']['predigttext']['bibeltext'] = $response['data']['lesungen'][$predigttextIdentischMit]['bibeltext'] ?? null;
        }
    }

    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>

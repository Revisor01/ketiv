<?php
// Zugangsprüfung von church_events.php, sunday.php entfällt. Aufruf: php tests/api/church_events_test.php

const TEST_KEY = 'test-api-key-1';
const TEST_USER = 'testverwaltung';
const TEST_PASSWORD = 'test-passwort-123';

$failures = 0;

function check($name, $condition) {
    global $failures;
    echo ($condition ? 'ok   ' : 'FAIL ') . $name . "\n";
    if (!$condition) {
        $failures++;
    }
}

// Liefert Status, JSON und die Set-Cookie-Zeilen der Antwort.
function call($port, $method, $path, $headers = [], $body = null) {
    $header = "Content-Type: application/json\r\n";
    foreach ($headers as $name => $value) {
        $header .= "$name: $value\r\n";
    }
    $context = stream_context_create(['http' => ['method' => $method, 'header' => $header, 'content' => $body === null ? '' : json_encode($body), 'ignore_errors' => true]]);
    $stream = fopen("http://127.0.0.1:$port$path", 'r', false, $context);
    $meta = stream_get_meta_data($stream)['wrapper_data'];
    $response = stream_get_contents($stream);
    fclose($stream);
    preg_match('#HTTP/\S+ (\d{3})#', $meta[0], $match);
    $cookies = array_values(array_filter($meta, fn($h) => stripos($h, 'Set-Cookie:') === 0));
    return [(int) $match[1], json_decode($response, true), $cookies];
}

$env = [
    'API_KEY_1' => TEST_KEY,
    'ADMIN_USER' => TEST_USER,
    'ADMIN_PASSWORD' => TEST_PASSWORD,
    'DB_HOST' => 'datenbank.invalid',
    'PATH' => getenv('PATH'),
];
$port = random_int(20000, 40000);
$cmd = [PHP_BINARY, '-d', 'variables_order=EGPCS', '-d', 'display_errors=0', '-S', "127.0.0.1:$port", '-t', realpath(__DIR__ . '/../../api')];
$server = proc_open($cmd, [1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']], $pipes, null, $env);
try {
    for ($i = 0; $i < 50 && !@fsockopen('127.0.0.1', $port); $i++) {
        usleep(100000);
    }

    [$status, $json] = call($port, 'GET', '/church_events.php?action=next');
    check('ohne Schlüssel: 401', $status === 401);
    check('ohne Schlüssel: JSON mit success=false', ($json['success'] ?? null) === false && ($json['error'] ?? null) === 'Unauthorized');

    [$status] = call($port, 'GET', '/church_events.php?action=next', ['X-API-Key' => 'falsch']);
    check('falscher Schlüssel: 401', $status === 401);

    [$status] = call($port, 'GET', '/church_events.php?action=next&api_key=falsch');
    check('falscher Schlüssel als Parameter: 401', $status === 401);

    // Ohne erreichbare Datenbank endet eine angenommene Anfrage beim Datenbankfehler.
    [$status, $json] = call($port, 'GET', '/church_events.php?action=next', ['X-API-Key' => TEST_KEY]);
    check('gültiger Schlüssel: Prüfung bestanden, Datenbankfehler 400', $status === 400 && ($json['error'] ?? null) === 'Database connection failed');

    // Der eingebaute PHP-Server leitet fehlende Dateien auf index.php um, daher Datei und Rewrite-Regel statt Statuscode.
    check('sunday.php entfällt: keine Datei', !file_exists(__DIR__ . '/../../api/sunday.php'));
    check('sunday.php entfällt: keine Rewrite-Regel', !str_contains(file_get_contents(__DIR__ . '/../../Dockerfile'), 'sunday'));

    [$status] = call($port, 'OPTIONS', '/church_events.php');
    check('Vorabanfrage ohne Schlüssel: 200', $status === 200);

    [$status, , $cookies] = call($port, 'POST', '/admin.php?action=login', [], ['username' => TEST_USER, 'password' => TEST_PASSWORD]);
    $cookie = null;
    foreach ($cookies as $line) {
        if (preg_match('#Set-Cookie:\s*(ketiv_admin=[^;]+)#i', $line, $m)) {
            $cookie = $m[1];
        }
    }
    check('Anmeldung: 200 mit Sitzungs-Cookie', $status === 200 && $cookie !== null);

    [$status, $json] = call($port, 'GET', '/church_events.php?action=next', ['Cookie' => (string) $cookie]);
    check('Sitzungs-Cookie ohne Schlüssel: Prüfung bestanden, Datenbankfehler 400', $status === 400 && ($json['error'] ?? null) === 'Database connection failed');
} finally {
    proc_terminate($server);
}

echo $failures === 0 ? "Alle Prüfungen bestanden\n" : "$failures Prüfung(en) fehlgeschlagen\n";
exit($failures === 0 ? 0 : 1);

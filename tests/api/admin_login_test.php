<?php
// Startet admin.php im eingebauten PHP-Server und prüft den Login über HTTP.
// Aufruf: php tests/api/admin_login_test.php

const TEST_USER = 'test-admin';
const TEST_PASSWORD = 'test-passwort-123';
const TEST_KEY = 'test-api-key-1';

$failures = 0;

function startServer(array $env) {
    $port = random_int(20000, 40000);
    $docroot = realpath(__DIR__ . '/../../api');
    $cmd = [PHP_BINARY, '-d', 'variables_order=EGPCS', '-S', "127.0.0.1:$port", '-t', $docroot];
    $process = proc_open($cmd, [1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']], $pipes, null, $env);

    for ($i = 0; $i < 50; $i++) {
        if (@fsockopen('127.0.0.1', $port)) {
            return [$process, $port];
        }
        usleep(100000);
    }
    throw new RuntimeException('PHP-Server startet nicht');
}

function request($port, $method, $body = null) {
    $context = stream_context_create(['http' => [
        'method' => $method,
        'header' => "Content-Type: application/json\r\n",
        'content' => $body === null ? '' : json_encode($body),
        'ignore_errors' => true,
    ]]);
    $stream = fopen("http://127.0.0.1:$port/admin.php?action=login", 'r', false, $context);
    $headers = stream_get_meta_data($stream)['wrapper_data'];
    $response = stream_get_contents($stream);
    fclose($stream);
    preg_match('#HTTP/\S+ (\d{3})#', $headers[0], $match);
    return [(int) $match[1], json_decode($response, true)];
}

function check($name, $condition) {
    global $failures;
    echo ($condition ? 'ok   ' : 'FAIL ') . $name . "\n";
    if (!$condition) {
        $failures++;
    }
}

$configured = ['ADMIN_USER' => TEST_USER, 'ADMIN_PASSWORD' => TEST_PASSWORD, 'API_KEY_1' => TEST_KEY, 'PATH' => getenv('PATH')];

[$server, $port] = startServer($configured);
try {
    [$status, $json] = request($port, 'POST', ['username' => TEST_USER, 'password' => TEST_PASSWORD]);
    check('richtige Zugangsdaten: 200', $status === 200);
    check('richtige Zugangsdaten: liefert den API-Schlüssel', ($json['data']['api_key'] ?? null) === TEST_KEY);

    [$status, $json] = request($port, 'POST', ['username' => TEST_USER, 'password' => 'falsch']);
    check('falsches Passwort: 401', $status === 401);
    check('falsches Passwort: kein Schlüssel', !isset($json['data']));

    [$status, $json] = request($port, 'POST', ['username' => 'jemand', 'password' => TEST_PASSWORD]);
    check('falscher Benutzer: 401', $status === 401);

    [$status, $json] = request($port, 'POST', ['username' => TEST_USER, 'password' => ['array']]);
    check('Passwort als Array: 401', $status === 401);

    [$status, $json] = request($port, 'GET');
    check('GET statt POST: 405', $status === 405);
} finally {
    proc_terminate($server);
}

[$server, $port] = startServer(['API_KEY_1' => TEST_KEY, 'PATH' => getenv('PATH')]);
try {
    [$status, $json] = request($port, 'POST', ['username' => '', 'password' => '']);
    check('ohne konfigurierte Zugangsdaten, leere Eingabe: 401', $status === 401);
    check('ohne konfigurierte Zugangsdaten: kein Schlüssel', !isset($json['data']));
} finally {
    proc_terminate($server);
}

echo $failures === 0 ? "Alle Prüfungen bestanden\n" : "$failures Prüfung(en) fehlgeschlagen\n";
exit($failures === 0 ? 0 : 1);

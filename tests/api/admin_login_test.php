<?php
// Prüft Admin-Login und Sitzung über HTTP. Aufruf: php tests/api/admin_login_test.php

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

// Liefert Status, JSON und die Set-Cookie-Zeilen der Antwort.
function request($port, $method, $action, $body = null, $cookie = null) {
    $header = "Content-Type: application/json\r\n" . ($cookie === null ? '' : "Cookie: $cookie\r\n");
    $context = stream_context_create(['http' => [
        'method' => $method,
        'header' => $header,
        'content' => $body === null ? '' : json_encode($body),
        'ignore_errors' => true,
    ]]);
    $stream = fopen("http://127.0.0.1:$port/admin.php?action=$action", 'r', false, $context);
    $headers = stream_get_meta_data($stream)['wrapper_data'];
    $response = stream_get_contents($stream);
    fclose($stream);
    preg_match('#HTTP/\S+ (\d{3})#', $headers[0], $match);
    $cookies = array_values(array_filter($headers, fn($h) => stripos($h, 'Set-Cookie:') === 0));
    return [(int) $match[1], json_decode($response, true), $cookies];
}

function sessionCookie(array $cookies) {
    foreach ($cookies as $line) {
        if (preg_match('#Set-Cookie:\s*(ketiv_admin=[^;]+)#i', $line, $m) && !str_contains($line, 'deleted')) {
            return $m[1];
        }
    }
    return null;
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
    [$status, $json, $cookies] = request($port, 'POST', 'login', ['username' => TEST_USER, 'password' => TEST_PASSWORD]);
    $cookie = sessionCookie($cookies);
    $line = implode("\n", $cookies);
    check('richtige Zugangsdaten: 200', $status === 200);
    check('richtige Zugangsdaten: nennt den Benutzer', ($json['data']['username'] ?? null) === TEST_USER);
    check('richtige Zugangsdaten: liefert keinen API-Schlüssel', !isset($json['data']['api_key']) && !str_contains(json_encode($json), TEST_KEY));
    check('richtige Zugangsdaten: setzt ein Sitzungs-Cookie', $cookie !== null);
    check('Sitzungs-Cookie ist HttpOnly, Secure und SameSite=Strict', stripos($line, 'HttpOnly') !== false && stripos($line, 'Secure') !== false && stripos($line, 'SameSite=Strict') !== false);

    [$status, $json] = request($port, 'GET', 'session', null, $cookie);
    check('Sitzung mit Cookie: 200 und Benutzer', $status === 200 && ($json['data']['username'] ?? null) === TEST_USER);

    [$status] = request($port, 'GET', 'unbekannt', null, $cookie);
    check('Verwaltung mit Cookie ohne Schlüssel: angemeldet (400 für unbekannte Aktion)', $status === 400);

    [$status] = request($port, 'GET', 'unbekannt');
    check('Verwaltung ohne Cookie und Schlüssel: 401', $status === 401);

    [$status] = request($port, 'GET', 'unbekannt', null, 'ketiv_admin=ausgedacht0000000000000000000');
    check('Verwaltung mit ausgedachtem Cookie: 401', $status === 401);

    [$status] = request($port, 'GET', 'session');
    check('Sitzung ohne Cookie: 401', $status === 401);

    [$status] = request($port, 'GET', 'logout', null, $cookie);
    check('Abmelden per GET: 405', $status === 405);

    [$status] = request($port, 'POST', 'logout', null, $cookie);
    check('Abmelden: 200', $status === 200);

    [$status] = request($port, 'GET', 'session', null, $cookie);
    check('Sitzung nach dem Abmelden: 401', $status === 401);

    [$status] = request($port, 'GET', 'unbekannt', null, $cookie);
    check('Verwaltung mit altem Cookie nach dem Abmelden: 401', $status === 401);

    [$status, $json, $cookies] = request($port, 'POST', 'login', ['username' => TEST_USER, 'password' => 'falsch']);
    check('falsches Passwort: 401', $status === 401);
    check('falsches Passwort: kein Schlüssel', !isset($json['data']));
    check('falsches Passwort: kein Sitzungs-Cookie', sessionCookie($cookies) === null);

    [$status] = request($port, 'POST', 'login', ['username' => 'jemand', 'password' => TEST_PASSWORD]);
    check('falscher Benutzer: 401', $status === 401);

    [$status] = request($port, 'POST', 'login', ['username' => TEST_USER, 'password' => ['array']]);
    check('Passwort als Array: 401', $status === 401);

    [$status] = request($port, 'GET', 'login');
    check('GET statt POST: 405', $status === 405);
} finally {
    proc_terminate($server);
}

[$server, $port] = startServer(['API_KEY_1' => TEST_KEY, 'PATH' => getenv('PATH')]);
try {
    [$status, $json, $cookies] = request($port, 'POST', 'login', ['username' => '', 'password' => '']);
    check('ohne konfigurierte Zugangsdaten, leere Eingabe: 401', $status === 401);
    check('ohne konfigurierte Zugangsdaten: kein Sitzungs-Cookie', sessionCookie($cookies) === null);
} finally {
    proc_terminate($server);
}

echo $failures === 0 ? "Alle Prüfungen bestanden\n" : "$failures Prüfung(en) fehlgeschlagen\n";
exit($failures === 0 ? 0 : 1);

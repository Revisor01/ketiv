<?php
// Prüft die Schlüsselprüfung von church_events_update.php über HTTP.
// Aufruf: php tests/api/church_events_update_test.php

const TEST_KEY = 'test-api-key-1';

$failures = 0;

function check($name, $condition) {
    global $failures;
    echo ($condition ? 'ok   ' : 'FAIL ') . $name . "\n";
    if (!$condition) {
        $failures++;
    }
}

function call($port, $method, $key = null) {
    $headers = "Content-Type: application/json\r\n" . ($key === null ? '' : "X-API-Key: $key\r\n");
    $context = stream_context_create(['http' => ['method' => $method, 'header' => $headers, 'content' => '{}', 'ignore_errors' => true]]);
    $stream = fopen("http://127.0.0.1:$port/church_events_update.php", 'r', false, $context);
    $meta = stream_get_meta_data($stream)['wrapper_data'];
    $body = stream_get_contents($stream);
    fclose($stream);
    preg_match('#HTTP/\S+ (\d{3})#', $meta[0], $match);
    return [(int) $match[1], json_decode($body, true), $body];
}

$port = random_int(20000, 40000);
$cmd = [PHP_BINARY, '-d', 'variables_order=EGPCS', '-d', 'display_errors=0', '-S', "127.0.0.1:$port", '-t', realpath(__DIR__ . '/../../api')];
$server = proc_open($cmd, [1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']], $pipes, null, ['API_KEY_1' => TEST_KEY, 'PATH' => getenv('PATH')]);
try {
    for ($i = 0; $i < 50 && !@fsockopen('127.0.0.1', $port); $i++) {
        usleep(100000);
    }

    [$status, $json] = call($port, 'POST');
    check('ohne Schlüssel: 401', $status === 401);
    check('ohne Schlüssel: JSON mit success=false', ($json['success'] ?? null) === false);

    [$status, $json] = call($port, 'POST', 'falsch');
    check('falscher Schlüssel: 401', $status === 401);

    [$status, $json] = call($port, 'GET', TEST_KEY);
    check('gültiger Schlüssel: Prüfung bestanden, GET ergibt 405', $status === 405);
} finally {
    proc_terminate($server);
}

echo $failures === 0 ? "Alle Prüfungen bestanden\n" : "$failures Prüfung(en) fehlgeschlagen\n";
exit($failures === 0 ? 0 : 1);

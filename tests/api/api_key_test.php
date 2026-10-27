<?php
// Nur konfigurierte API-Schlüssel gelten. Aufruf: php tests/api/api_key_test.php

require_once __DIR__ . '/../../api/auth.php';

$failures = 0;

function check($name, $condition) {
    global $failures;
    echo ($condition ? 'ok   ' : 'FAIL ') . $name . "\n";
    if (!$condition) {
        $failures++;
    }
}

function withKeys(array $env, $provided) {
    $_ENV = $env;
    $_GET = $provided === null ? [] : ['api_key' => $provided];
    $_POST = [];
    unset($_SERVER['HTTP_X_API_KEY']);
    return validateApiKey();
}

check('konfigurierter Schlüssel gilt', withKeys(['API_KEY_1' => 'echter-schluessel'], 'echter-schluessel') === true);
check('zweiter Schlüssel gilt', withKeys(['API_KEY_1' => 'a-schluessel', 'API_KEY_2' => 'b-schluessel'], 'b-schluessel') === true);
check('falscher Schlüssel gilt nicht', withKeys(['API_KEY_1' => 'echter-schluessel'], 'falsch') === false);
check('ohne Konfiguration gilt default-key-1 nicht', withKeys([], 'default-key-1') === false);
check('ohne Konfiguration gilt default-key-2 nicht', withKeys([], 'default-key-2') === false);
check('ohne Konfiguration gilt ein leerer Schlüssel nicht', withKeys([], '') === false);
check('ohne Schlüssel kein Zugang', withKeys(['API_KEY_1' => 'echter-schluessel'], null) === false);

$_ENV = [];
$_GET = [];
$_SERVER['HTTP_X_API_KEY'] = 'kopf-schluessel';
$_ENV['API_KEY_3'] = 'kopf-schluessel';
check('Schlüssel im Header gilt', validateApiKey() === true);

// index.php ohne konfigurierte Schlüssel über HTTP: Ersatzschlüssel müssen abgewiesen werden.
$port = random_int(20000, 40000);
$cmd = [PHP_BINARY, '-d', 'variables_order=EGPCS', '-S', "127.0.0.1:$port", '-t', realpath(__DIR__ . '/../../api')];
$server = proc_open($cmd, [1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']], $pipes, null, ['PATH' => getenv('PATH')]);
try {
    for ($i = 0; $i < 50 && !@fsockopen('127.0.0.1', $port); $i++) {
        usleep(100000);
    }
    foreach (['default-key-1', 'default-key-2', 'default-key-3'] as $key) {
        $stream = fopen("http://127.0.0.1:$port/index.php?api_key=$key", 'r', false, stream_context_create(['http' => ['ignore_errors' => true]]));
        $status = (int) substr(stream_get_meta_data($stream)['wrapper_data'][0], 9, 3);
        fclose($stream);
        check("index.php weist $key ab (401)", $status === 401);
    }
} finally {
    proc_terminate($server);
}

echo $failures === 0 ? "Alle Prüfungen bestanden\n" : "$failures Prüfung(en) fehlgeschlagen\n";
exit($failures === 0 ? 0 : 1);

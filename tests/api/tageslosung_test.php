<?php
// Öffentlicher Tageslosung-Endpunkt, auch dass er keine Bibelquelle abfragt. Aufruf: php tests/api/tageslosung_test.php

require_once __DIR__ . '/../../api/lib/tageslosung.php';

$failures = 0;

function check($name, $condition) {
    global $failures;
    echo ($condition ? 'ok   ' : 'FAIL ') . $name . "\n";
    if (!$condition) {
        $failures++;
    }
}

// Daten wie in der Produktionsdatenbank am 27.10.2026 (Losungen 2026).
final class FakeQuelle implements TageslosungQuelle {
    public $aufrufe = 0;
    public $uebersetzungen = [];
    private $tag;

    public function __construct(string $tag = '2026-10-27') {
        $this->tag = $tag;
    }

    public function basis(string $date): ?array {
        $this->aufrufe++;
        if ($date !== $this->tag) {
            return null;
        }
        return [
            'date' => $date, 'weekday' => 'Dienstag', 'holiday' => null,
            'ot_text' => 'Steh auf, Gott, richte die Erde, denn dein Eigentum sind die Nationen alle.',
            'ot_reference' => 'Psalm 82,8',
            'nt_text' => 'Jesus spricht: Ich bin bei euch alle Tage bis an der Welt Ende.',
            'nt_reference' => 'Matthäus 28,20',
        ];
    }

    public function uebersetzung(string $date, string $code): ?array {
        $this->aufrufe++;
        return $this->uebersetzungen["$date:$code"] ?? null;
    }
}

final class FakeBegrenzer implements TageslosungBegrenzer {
    public $rest;
    public $clients = [];

    public function __construct(int $rest) {
        $this->rest = $rest;
    }

    public function erlaubt(string $client): bool {
        $this->clients[] = $client;
        return $this->rest-- > 0;
    }

    public function sekundenBisFrei(): int {
        return 42;
    }
}

final class FakeSpeicher implements TageslosungZwischenspeicher {
    public $daten = [];
    public $ttl = [];

    public function holen(string $key): ?array {
        return $this->daten[$key] ?? null;
    }

    public function ablegen(string $key, array $antwort, int $sekunden): void {
        $this->daten[$key] = $antwort;
        $this->ttl[$key] = $sekunden;
    }
}

// Ahmt die beiden Redis-Befehle nach, die der Begrenzer nutzt.
final class FakeRedis {
    public $werte = [];
    public $ablauf = [];

    public function incr($key) {
        $this->werte[$key] = ($this->werte[$key] ?? 0) + 1;
        return $this->werte[$key];
    }

    public function expire($key, $sekunden) {
        $this->ablauf[$key] = $sekunden;
        return true;
    }
}

function endpunkt($quelle, $begrenzer = null, $speicher = null, $jetzt = '2026-10-27 15:00:00') {
    return new TageslosungEndpunkt(
        function () use ($quelle) { return $quelle; },
        $begrenzer,
        $speicher,
        new DateTimeImmutable($jetzt, new DateTimeZone('Europe/Berlin'))
    );
}

$server = ['REMOTE_ADDR' => '172.18.0.5', 'HTTP_X_REAL_IP' => '203.0.113.7'];

// Erlaubter Fall: heutige Losung ohne Schlüssel.
$quelle = new FakeQuelle();
$r = endpunkt($quelle)->bearbeiten('GET', [], $server);
$json = json_decode($r['body'], true);
check('ohne Schlüssel: 200', $r['status'] === 200);
check('Losung aus der Datenbank', $json['data']['losung']['reference'] === 'Psalm 82,8');
check('Lehrtext aus der Datenbank', $json['data']['lehrtext']['text'] === 'Jesus spricht: Ich bin bei euch alle Tage bis an der Welt Ende.');
check('Standard-Übersetzung LUT', $json['data']['translation']['code'] === 'LUT');
check('Datum formatiert', $json['data']['formatted_date'] === 'Dienstag, 27. Oktober 2026');
check('Bibleserver-Link mit Umschrift', $json['data']['lehrtext']['bibleserver_url'] === 'https://www.bibleserver.com/LUT/Matthaeus28%2C20');
check('Quellenangabe Herrnhut', $json['data']['quelle']['copyright'] === '© Evangelische Brüder-Unität – Herrnhuter Brüdergemeine');
check('Quellenangabe verlinkt herrnhuter.de', $json['data']['quelle']['copyright_url'] === 'https://www.herrnhuter.de');
check('Quellenangabe verlinkt losungen.de', $json['data']['quelle']['info_url'] === 'https://www.losungen.de');
check('Rechteinhaber der Übersetzung', $json['data']['translation']['copyright'] === '© 2016 Deutsche Bibelgesellschaft, Stuttgart');
check('CORS für GET', $r['headers']['Access-Control-Allow-Origin'] === '*');
check('Cache bis Mitternacht (9 h)', $r['headers']['Cache-Control'] === 'public, max-age=32400');
check('ETag gesetzt', preg_match('/^"[0-9a-f]{20}"$/', $r['headers']['ETag']) === 1);
check('JSON-Typ', $r['headers']['Content-Type'] === 'application/json; charset=utf-8');

// ETag: gleiche Fassung ergibt 304 ohne Inhalt.
$r304 = endpunkt(new FakeQuelle())->bearbeiten('GET', [], $server + ['HTTP_IF_NONE_MATCH' => $r['headers']['ETag']]);
check('If-None-Match: 304', $r304['status'] === 304);
check('304 ohne Inhalt', $r304['body'] === '');
$r200 = endpunkt(new FakeQuelle())->bearbeiten('GET', [], $server + ['HTTP_IF_NONE_MATCH' => '"alt"']);
check('anderes ETag: 200', $r200['status'] === 200);

// Gespeicherte Übersetzung; Schreibweise der Codes egal.
$quelle = new FakeQuelle();
$quelle->uebersetzungen['2026-10-27:BIGS'] = [
    'losung_text' => 'Steh auf, Gott, richte die Erde!', 'losung_reference' => 'Psalm 82,8',
    'losung_url' => 'https://www.bibel-in-gerechter-sprache.de/die-bibel/bigs-online/?Ps/82/8/',
    'lehrtext_text' => 'Ich bin bei euch.', 'lehrtext_reference' => 'Matthäus 28,20', 'lehrtext_url' => null,
];
$r = endpunkt($quelle)->bearbeiten('GET', ['translation' => 'bigs'], $server);
$json = json_decode($r['body'], true);
check('BIGS aus dem Zwischenspeicher: 200', $r['status'] === 200);
check('BIGS-Text', $json['data']['losung']['text'] === 'Steh auf, Gott, richte die Erde!');
check('gespeicherter Link bleibt', $json['data']['losung']['bibleserver_url'] === 'https://www.bibel-in-gerechter-sprache.de/die-bibel/bigs-online/?Ps/82/8/');
check('fehlender Link wird gebildet', $json['data']['lehrtext']['bibleserver_url'] === 'https://www.bibleserver.com/BIGS/Matthaeus28%2C20');
check('Code kanonisch', $json['data']['translation']['code'] === 'BIGS');
check('NGÜ klein geschrieben erkannt', TageslosungEndpunkt::kanonischerCode('ngü') === 'NGÜ');

// Nicht gespeicherte Übersetzung: 404, kein Nachladen.
$quelle = new FakeQuelle();
$r = endpunkt($quelle)->bearbeiten('GET', ['translation' => 'HFA'], $server);
check('Übersetzung nicht gespeichert: 404', $r['status'] === 404);
check('404 kurz cachebar', $r['headers']['Cache-Control'] === 'public, max-age=120');

// Verbotene Fälle: Whitelist und Datum.
foreach (['XYZ', 'KJV', '../etc', "LUT' OR 1=1", ''] as $code) {
    $quelle = new FakeQuelle();
    $r = endpunkt($quelle)->bearbeiten('GET', ['translation' => $code], $server);
    check("Übersetzung '$code': 400", $r['status'] === 400);
    check("Übersetzung '$code': Datenbank nicht gefragt", $quelle->aufrufe === 0);
}
$json = json_decode(endpunkt(new FakeQuelle())->bearbeiten('GET', ['translation' => 'XYZ'], $server)['body'], true);
check('400 nennt erlaubte Übersetzungen', $json['erlaubt'] === array_keys(TAGESLOSUNG_UEBERSETZUNGEN));

foreach (['2026-10-31' => 400, '2026-10-23' => 400, '2025-10-27' => 400, '27.10.2026' => 400, '2026-02-30' => 400, '2026-10-30' => 404, '2026-10-24' => 404] as $datum => $erwartet) {
    $r = endpunkt(new FakeQuelle())->bearbeiten('GET', ['date' => $datum], $server);
    check("Datum $datum: $erwartet", $r['status'] === $erwartet);
}
$r = endpunkt(new FakeQuelle('2026-10-26'), null, null, '2026-10-26 23:59:30')->bearbeiten('GET', [], $server);
check('kurz vor Mitternacht: 26.10. ist heute', json_decode($r['body'], true)['data']['date'] === '2026-10-26');
check('kurz vor Mitternacht mindestens 60 s Cache', $r['headers']['Cache-Control'] === 'public, max-age=60');
$r = endpunkt(new FakeQuelle('2026-10-27'), null, null, '2026-10-26T23:30:00Z')->bearbeiten('GET', [], $server);
check('Tageswechsel nach Europe/Berlin, nicht UTC', $r['status'] === 200);

// Methoden.
$r = endpunkt(new FakeQuelle())->bearbeiten('POST', [], $server);
check('POST: 405', $r['status'] === 405);
check('POST: ohne CORS', !isset($r['headers']['Access-Control-Allow-Origin']));
$r = endpunkt(new FakeQuelle())->bearbeiten('OPTIONS', [], $server);
check('OPTIONS: 204 mit CORS', $r['status'] === 204 && $r['headers']['Access-Control-Allow-Methods'] === 'GET, HEAD, OPTIONS');

// Begrenzung je Besucher-IP.
$begrenzer = new FakeBegrenzer(1);
$e = endpunkt(new FakeQuelle(), $begrenzer);
check('erste Anfrage erlaubt', $e->bearbeiten('GET', [], $server)['status'] === 200);
$r = $e->bearbeiten('GET', [], $server);
check('über der Grenze: 429', $r['status'] === 429);
check('429 mit Retry-After', $r['headers']['Retry-After'] === '42');
check('Begrenzer zählt die Besucher-IP, nicht den Proxy', $begrenzer->clients[0] === '203.0.113.7');

$redis = new FakeRedis();
$b = new RedisTageslosungBegrenzer($redis, 3, 600, 1800000000);
check('Redis-Begrenzer: 1-3 erlaubt', $b->erlaubt('a') && $b->erlaubt('a') && $b->erlaubt('a'));
check('Redis-Begrenzer: 4 gesperrt', $b->erlaubt('a') === false);
check('Redis-Begrenzer: andere IP frei', $b->erlaubt('b') === true);
check('Redis-Begrenzer: Schlüssel läuft nach dem Fenster ab', array_values($redis->ablauf) === [600, 600]);
$kaputt = new class {
    public function incr($key) { throw new RuntimeException('weg'); }
};
check('Redis-Begrenzer ohne Redis: nicht sperren', (new RedisTageslosungBegrenzer($kaputt, 1, 600))->erlaubt('a') === true);

// Besucher-IP.
check('IP aus X-Real-IP', tageslosungClientIp(['REMOTE_ADDR' => '172.18.0.5', 'HTTP_X_REAL_IP' => '198.51.100.1']) === '198.51.100.1');
check('IP aus X-Forwarded-For, rechteste öffentliche', tageslosungClientIp(['REMOTE_ADDR' => '172.18.0.5', 'HTTP_X_FORWARDED_FOR' => '1.2.3.4, 198.51.100.9, 172.18.0.1']) === '198.51.100.9');
check('ohne Kopfzeilen REMOTE_ADDR', tageslosungClientIp(['REMOTE_ADDR' => '8.8.8.8']) === '8.8.8.8');

// Zwischenspeicher: zweiter Aufruf fragt die Datenbank nicht mehr.
$speicher = new FakeSpeicher();
$quelle = new FakeQuelle();
endpunkt($quelle, null, $speicher)->bearbeiten('GET', [], $server);
$vorher = $quelle->aufrufe;
$r = endpunkt($quelle, null, $speicher)->bearbeiten('GET', [], $server);
check('Zwischenspeicher: 200', $r['status'] === 200);
check('Zwischenspeicher: keine weitere Datenbankabfrage', $quelle->aufrufe === $vorher);
check('Zwischenspeicher: bis Mitternacht', $speicher->ttl['tageslosung:v1:2026-10-27:LUT'] === 32400);

// Datenbank weg: 503 statt Fehlerseite.
$weg = new TageslosungEndpunkt(function () { throw new Exception('Database connection failed'); }, null, null, new DateTimeImmutable('2026-10-27 15:00:00'));
$r = $weg->bearbeiten('GET', [], $server);
check('Datenbank weg: 503', $r['status'] === 503);
check('503 verrät keine Interna', strpos($r['body'], 'Database') === false);

// Der Endpunkt darf keine Bibelquelle anfragen: kein Netz, kein Prozess, keine Bibelsuche.
$verboten = '/\b(file_get_contents|fopen|curl_\w+|fsockopen|stream_socket_client|shell_exec|exec|system|passthru|popen|proc_open)\s*\(|bible_search|scraper|bibleserver_links/';
foreach (['api/tageslosung.php', 'api/lib/tageslosung.php'] as $datei) {
    $code = preg_replace('#//.*$|/\*.*?\*/#ms', '', file_get_contents(__DIR__ . '/../../' . $datei));
    check("$datei ruft keine Bibelquelle ab", preg_match($verboten, $code) === 0);
}

// Über HTTP: Eingaben werden vor jeder Datenbankverbindung geprüft.
$port = random_int(20000, 40000);
$cmd = [PHP_BINARY, '-d', 'variables_order=EGPCS', '-d', 'display_errors=0', '-S', "127.0.0.1:$port", '-t', realpath(__DIR__ . '/../../api')];
$serverProzess = proc_open($cmd, [1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']], $pipes, null, ['PATH' => getenv('PATH'), 'DB_HOST' => '127.0.0.1', 'REDIS_HOST' => '127.0.0.1']);
try {
    for ($i = 0; $i < 50 && !@fsockopen('127.0.0.1', $port); $i++) {
        usleep(100000);
    }
    $holen = function ($pfad, $methode = 'GET') use ($port) {
        $stream = fopen("http://127.0.0.1:$port$pfad", 'r', false, stream_context_create(['http' => ['method' => $methode, 'ignore_errors' => true]]));
        $kopf = stream_get_meta_data($stream)['wrapper_data'];
        $body = stream_get_contents($stream);
        fclose($stream);
        return [(int) substr($kopf[0], 9, 3), implode("\n", $kopf), json_decode($body, true)];
    };

    [$status, $kopf, $json] = $holen('/tageslosung.php?translation=XYZ');
    check('HTTP: unbekannte Übersetzung 400', $status === 400);
    check('HTTP: 400 als JSON', ($json['success'] ?? null) === false);
    check('HTTP: CORS', stripos($kopf, 'Access-Control-Allow-Origin: *') !== false);

    [$status] = $holen('/tageslosung.php?date=2020-01-01');
    check('HTTP: Datum außerhalb 400', $status === 400);

    [$status, $kopf] = $holen('/tageslosung.php', 'POST');
    check('HTTP: POST 405', $status === 405);
    check('HTTP: POST ohne CORS', stripos($kopf, 'Access-Control-Allow-Origin') === false);

    [$status, , $json] = $holen('/tageslosung.php');
    check('HTTP: ohne Datenbank 503 als JSON', $status === 503 && ($json['success'] ?? null) === false);
} finally {
    proc_terminate($serverProzess);
}

echo $failures === 0 ? "Alle Prüfungen bestanden\n" : "$failures Prüfung(en) fehlgeschlagen\n";
exit($failures === 0 ? 0 : 1);

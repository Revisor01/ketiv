<?php
// GET /api/v1/tageslosung: Tageslosung ohne API-Schlüssel, für das Widget und
// eigene Einbindungen. Beschreibung in docs/openapi.yaml.

require_once __DIR__ . '/database.php';
require_once __DIR__ . '/lib/tageslosung.php';

// Großzügig je Besucher-IP, weil Gemeindenetze viele Besucher hinter einer
// Adresse bündeln. Ein Seitenaufruf braucht höchstens eine Anfrage.
const TAGESLOSUNG_GRENZE = 6000;
const TAGESLOSUNG_FENSTER = 600;

$redis = null;
if (class_exists('Redis')) {
    try {
        $redis = new Redis();
        $redis->connect($_ENV['REDIS_HOST'] ?? 'redis', (int) ($_ENV['REDIS_PORT'] ?? 6379), 0.5);
        $redis->select(2);
    } catch (Throwable $e) {
        error_log('Tageslosung: Redis nicht erreichbar - ' . $e->getMessage());
        $redis = null;
    }
}

$endpunkt = new TageslosungEndpunkt(
    function () {
        return new PdoTageslosungQuelle(getDatabase());
    },
    $redis ? new RedisTageslosungBegrenzer($redis, TAGESLOSUNG_GRENZE, TAGESLOSUNG_FENSTER) : null,
    $redis ? new RedisTageslosungZwischenspeicher($redis) : null,
    new DateTimeImmutable('now')
);

$antwort = $endpunkt->bearbeiten($_SERVER['REQUEST_METHOD'] ?? 'GET', $_GET, $_SERVER);

http_response_code($antwort['status']);
foreach ($antwort['headers'] as $name => $wert) {
    header("$name: $wert");
}
echo $antwort['body'];

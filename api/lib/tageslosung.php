<?php
// Öffentliche Tageslosung ohne API-Schlüssel. Liest nur, was der tägliche Abruf
// bereits gespeichert hat, und fragt nie selbst eine Bibelquelle an: so lässt
// sich der Endpunkt nicht als Umweg zur Bibelsuche missbrauchen.

const TAGESLOSUNG_QUELLE = [
    'name' => 'Die Losungen',
    'copyright' => '© Evangelische Brüder-Unität – Herrnhuter Brüdergemeine',
    'copyright_url' => 'https://www.herrnhuter.de',
    'info_text' => 'Weitere Informationen finden Sie hier.',
    'info_url' => 'https://www.losungen.de',
];

// Nur Übersetzungen, die der tägliche Abruf zuverlässig füllt und deren
// Rechteinhaber sich angeben lassen.
const TAGESLOSUNG_UEBERSETZUNGEN = [
    'LUT' => ['Lutherbibel, revidiert 2017', '© 2016 Deutsche Bibelgesellschaft, Stuttgart'],
    'ELB' => ['Elberfelder Bibel', '© 2006 SCM R.Brockhaus, Holzgerlingen'],
    'HFA' => ['Hoffnung für alle', '© 1983, 1996, 2002, 2015 Biblica, Inc.'],
    'SLT' => ['Schlachter 2000', '© 2000 Genfer Bibelgesellschaft'],
    'ZB' => ['Zürcher Bibel', '© 2007 Theologischer Verlag Zürich'],
    'GNB' => ['Gute Nachricht Bibel', '© 2018 Deutsche Bibelgesellschaft, Stuttgart'],
    'NGÜ' => ['Neue Genfer Übersetzung', '© 2011 Genfer Bibelgesellschaft'],
    'EU' => ['Einheitsübersetzung 2016', '© 2016 Katholische Bibelanstalt, Stuttgart'],
    'NLB' => ['Neues Leben. Die Bibel', '© 2002, 2006, 2017 SCM R.Brockhaus, Holzgerlingen'],
    'NeÜ' => ['Neue evangelistische Übersetzung', '© Karl-Heinz Vanheiden'],
    'BIGS' => ['Bibel in gerechter Sprache', '© 2006 Gütersloher Verlagshaus'],
    'NIV' => ['New International Version', '© 1973, 1978, 1984, 2011 Biblica, Inc.'],
    'ESV' => ['English Standard Version', '© 2001 Crossway'],
    'LSG' => ['Louis Segond 1910', null],
];

const TAGESLOSUNG_TAGE_SPANNE = 3;

interface TageslosungQuelle {
    /** Grundbestand der Losungen für ein Datum oder null. */
    public function basis(string $date): ?array;

    /** Gespeicherte Übersetzung für ein Datum oder null. */
    public function uebersetzung(string $date, string $code): ?array;
}

interface TageslosungBegrenzer {
    /** true, solange die Anfrage im Rahmen bleibt. */
    public function erlaubt(string $client): bool;

    public function sekundenBisFrei(): int;
}

interface TageslosungZwischenspeicher {
    public function holen(string $key): ?array;

    public function ablegen(string $key, array $antwort, int $sekunden): void;
}

final class PdoTageslosungQuelle implements TageslosungQuelle {
    private $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    public function basis(string $date): ?array {
        $stmt = $this->pdo->prepare('SELECT date, weekday, holiday, ot_text, ot_reference, nt_text, nt_reference FROM losungen WHERE date = ?');
        $stmt->execute([$date]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function uebersetzung(string $date, string $code): ?array {
        $stmt = $this->pdo->prepare('SELECT losung_text, losung_reference, losung_url, lehrtext_text, lehrtext_reference, lehrtext_url FROM translation_cache WHERE date = ? AND translation_code = ? AND success = true');
        $stmt->execute([$date, $code]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }
}

// Festes Zeitfenster je Besucher-IP. Fällt Redis aus, wird nicht gesperrt:
// der Endpunkt liest nur und soll für die Gemeindeseiten erreichbar bleiben.
final class RedisTageslosungBegrenzer implements TageslosungBegrenzer {
    private $redis;
    private $grenze;
    private $fenster;
    private $jetzt;

    public function __construct($redis, int $grenze, int $fenster, ?int $jetzt = null) {
        $this->redis = $redis;
        $this->grenze = $grenze;
        $this->fenster = $fenster;
        $this->jetzt = $jetzt ?? time();
    }

    public function erlaubt(string $client): bool {
        $key = 'tageslosung:rl:' . md5($client) . ':' . intdiv($this->jetzt, $this->fenster);
        try {
            $anzahl = $this->redis->incr($key);
            if ($anzahl === 1) {
                $this->redis->expire($key, $this->fenster);
            }
            return $anzahl <= $this->grenze;
        } catch (Throwable $e) {
            error_log('Tageslosung: Begrenzer ohne Redis - ' . $e->getMessage());
            return true;
        }
    }

    public function sekundenBisFrei(): int {
        return $this->fenster - ($this->jetzt % $this->fenster);
    }
}

final class RedisTageslosungZwischenspeicher implements TageslosungZwischenspeicher {
    private $redis;

    public function __construct($redis) {
        $this->redis = $redis;
    }

    public function holen(string $key): ?array {
        try {
            $wert = $this->redis->get($key);
            $daten = is_string($wert) ? json_decode($wert, true) : null;
            return is_array($daten) ? $daten : null;
        } catch (Throwable $e) {
            return null;
        }
    }

    public function ablegen(string $key, array $antwort, int $sekunden): void {
        try {
            $this->redis->setex($key, max(1, $sekunden), json_encode($antwort, JSON_UNESCAPED_UNICODE));
        } catch (Throwable $e) {
            error_log('Tageslosung: Zwischenspeicher ohne Redis - ' . $e->getMessage());
        }
    }
}

/**
 * Besucher-IP hinter den vorgeschalteten Proxys. X-Real-IP setzt der eigene
 * Webserver und überschreibt dabei einen mitgeschickten Wert; ohne ihn gilt die
 * rechteste öffentliche Adresse aus X-Forwarded-For.
 */
function tageslosungClientIp(array $server): string {
    $oeffentlich = FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE;
    $real = trim($server['HTTP_X_REAL_IP'] ?? '');
    if ($real !== '' && filter_var($real, FILTER_VALIDATE_IP, $oeffentlich)) {
        return $real;
    }
    $kette = array_reverse(array_map('trim', explode(',', $server['HTTP_X_FORWARDED_FOR'] ?? '')));
    foreach ($kette as $ip) {
        if ($ip !== '' && filter_var($ip, FILTER_VALIDATE_IP, $oeffentlich)) {
            return $ip;
        }
    }
    return $server['REMOTE_ADDR'] ?? 'unbekannt';
}

function tageslosungBibleserverUrl(string $code, string $reference): string {
    $stelle = str_replace(
        [' ', 'ä', 'ö', 'ü', 'Ä', 'Ö', 'Ü', 'ß'],
        ['', 'ae', 'oe', 'ue', 'Ae', 'Oe', 'Ue', 'ss'],
        $reference
    );
    return 'https://www.bibleserver.com/' . rawurlencode($code) . '/' . rawurlencode($stelle);
}

final class TageslosungEndpunkt {
    private $quelle;
    private $begrenzer;
    private $speicher;
    private $jetzt;

    /** @param callable(): TageslosungQuelle $quelle wird erst nach der Prüfung der Eingaben gebraucht */
    public function __construct(callable $quelle, ?TageslosungBegrenzer $begrenzer, ?TageslosungZwischenspeicher $speicher, DateTimeImmutable $jetzt) {
        $this->quelle = $quelle;
        $this->begrenzer = $begrenzer;
        $this->speicher = $speicher;
        $this->jetzt = $jetzt->setTimezone(new DateTimeZone('Europe/Berlin'));
    }

    public static function kanonischerCode(string $eingabe): ?string {
        $gross = mb_strtoupper(trim($eingabe), 'UTF-8');
        foreach (array_keys(TAGESLOSUNG_UEBERSETZUNGEN) as $code) {
            if (mb_strtoupper($code, 'UTF-8') === $gross) {
                return $code;
            }
        }
        return null;
    }

    /** @return array{status:int, headers:array<string,string>, body:string} */
    public function bearbeiten(string $methode, array $query, array $server): array {
        $cors = [
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, HEAD, OPTIONS',
        ];

        if ($methode === 'OPTIONS') {
            return $this->antwort(204, $cors + ['Access-Control-Max-Age' => '86400'], null);
        }
        if ($methode !== 'GET' && $methode !== 'HEAD') {
            return $this->antwort(405, ['Allow' => 'GET, HEAD, OPTIONS', 'Cache-Control' => 'no-store'], $this->fehler('Nur GET ist erlaubt.'));
        }

        $code = self::kanonischerCode((string) ($query['translation'] ?? 'LUT'));
        if ($code === null) {
            return $this->antwort(400, $cors + ['Cache-Control' => 'public, max-age=3600'], $this->fehler(
                'Unbekannte Übersetzung.',
                ['erlaubt' => array_keys(TAGESLOSUNG_UEBERSETZUNGEN)]
            ));
        }

        $heute = $this->jetzt->format('Y-m-d');
        $datum = (string) ($query['date'] ?? $heute);
        $tag = DateTimeImmutable::createFromFormat('!Y-m-d', $datum, new DateTimeZone('Europe/Berlin'));
        if (!$tag || $tag->format('Y-m-d') !== $datum) {
            return $this->antwort(400, $cors + ['Cache-Control' => 'public, max-age=3600'], $this->fehler('Datum im Format JJJJ-MM-TT angeben.'));
        }
        $abstand = (int) (new DateTimeImmutable($heute))->diff(new DateTimeImmutable($datum))->format('%r%a');
        if (abs($abstand) > TAGESLOSUNG_TAGE_SPANNE) {
            return $this->antwort(400, $cors + ['Cache-Control' => 'no-store'], $this->fehler(
                'Nur heute und bis zu ' . TAGESLOSUNG_TAGE_SPANNE . ' Tage davor oder danach.'
            ));
        }

        if ($this->begrenzer && !$this->begrenzer->erlaubt(tageslosungClientIp($server))) {
            return $this->antwort(429, $cors + [
                'Cache-Control' => 'no-store',
                'Retry-After' => (string) $this->begrenzer->sekundenBisFrei(),
            ], $this->fehler('Zu viele Anfragen. Bitte später erneut versuchen.'));
        }

        $bisMitternacht = max(60, $this->jetzt->modify('tomorrow')->getTimestamp() - $this->jetzt->getTimestamp());
        $schluessel = "tageslosung:v1:$datum:$code";
        $gespeichert = $this->speicher ? $this->speicher->holen($schluessel) : null;

        if ($gespeichert === null) {
            try {
                $gespeichert = $this->laden(($this->quelle)(), $datum, $code);
            } catch (Throwable $e) {
                error_log('Tageslosung: Datenbank nicht erreichbar - ' . $e->getMessage());
                return $this->antwort(503, $cors + ['Cache-Control' => 'no-store', 'Retry-After' => '60'], $this->fehler('Die Losung ist gerade nicht erreichbar.'));
            }
            if ($this->speicher) {
                $this->speicher->ablegen($schluessel, $gespeichert, $gespeichert['status'] === 200 ? $bisMitternacht : 120);
            }
        }

        if ($gespeichert['status'] !== 200) {
            return $this->antwort($gespeichert['status'], $cors + ['Cache-Control' => 'public, max-age=120'], $gespeichert['body']);
        }

        $body = $gespeichert['body'];
        $etag = '"' . substr(sha1($body), 0, 20) . '"';
        $kopf = $cors + [
            'Cache-Control' => "public, max-age=$bisMitternacht",
            'ETag' => $etag,
        ];
        $wunsch = $server['HTTP_IF_NONE_MATCH'] ?? '';
        if ($wunsch !== '' && in_array($etag, array_map('trim', explode(',', $wunsch)), true)) {
            return $this->antwort(304, $kopf, null);
        }
        return $this->antwort(200, $kopf, $body);
    }

    private function laden(TageslosungQuelle $quelle, string $datum, string $code): array {
        $basis = $quelle->basis($datum);
        if (!$basis) {
            return ['status' => 404, 'body' => $this->fehler('Für dieses Datum liegt keine Losung vor.')];
        }

        $losung = ['text' => $basis['ot_text'], 'reference' => $basis['ot_reference']];
        $lehrtext = ['text' => $basis['nt_text'], 'reference' => $basis['nt_reference']];

        if ($code !== 'LUT') {
            $treffer = $quelle->uebersetzung($datum, $code);
            if (!$treffer || ($treffer['losung_text'] ?? '') === '' || ($treffer['lehrtext_text'] ?? '') === '') {
                return ['status' => 404, 'body' => $this->fehler('Diese Übersetzung liegt für das Datum noch nicht vor.')];
            }
            $losung = ['text' => $treffer['losung_text'], 'reference' => $treffer['losung_reference'] ?: $losung['reference'], 'url' => $treffer['losung_url'] ?? null];
            $lehrtext = ['text' => $treffer['lehrtext_text'], 'reference' => $treffer['lehrtext_reference'] ?: $lehrtext['reference'], 'url' => $treffer['lehrtext_url'] ?? null];
        }

        [$name, $copyright] = TAGESLOSUNG_UEBERSETZUNGEN[$code];
        $vers = function (array $teil) use ($code) {
            return [
                'text' => $teil['text'],
                'reference' => $teil['reference'],
                'bibleserver_url' => ($teil['url'] ?? null) ?: tageslosungBibleserverUrl($code, $teil['reference']),
            ];
        };

        $daten = [
            'date' => $datum,
            'formatted_date' => $this->deutschesDatum($datum, (string) $basis['weekday']),
            'weekday' => $basis['weekday'],
            'holiday' => $basis['holiday'] ?: null,
            'losung' => $vers($losung),
            'lehrtext' => $vers($lehrtext),
            'translation' => ['code' => $code, 'name' => $name, 'copyright' => $copyright],
            'quelle' => TAGESLOSUNG_QUELLE,
        ];

        return ['status' => 200, 'body' => json_encode(['success' => true, 'data' => $daten], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)];
    }

    private function deutschesDatum(string $datum, string $wochentag): string {
        $monate = [1 => 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
        $tag = new DateTimeImmutable($datum);
        return trim("$wochentag, " . $tag->format('j') . '. ' . $monate[(int) $tag->format('n')] . ' ' . $tag->format('Y'), ', ');
    }

    private function fehler(string $meldung, array $mehr = []): string {
        return json_encode(['success' => false, 'error' => $meldung] + $mehr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    private function antwort(int $status, array $headers, ?string $body): array {
        $headers['X-Content-Type-Options'] = 'nosniff';
        if ($body !== null) {
            $headers['Content-Type'] = 'application/json; charset=utf-8';
        }
        return ['status' => $status, 'headers' => $headers, 'body' => $body ?? ''];
    }
}

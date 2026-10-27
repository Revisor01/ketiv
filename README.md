<h1 align="center">Ketiv</h1>

<p align="center">
  Tageslosung, Kirchenjahr und Bibeltexte in vielen Übersetzungen nebeneinander —<br>
  als Website und als API für eigene Anwendungen.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/PHP-8.2-777bb4?logo=php" alt="PHP">
  <img src="https://img.shields.io/badge/React-Vite-61dafb?logo=react" alt="React">
  <img src="https://img.shields.io/github/license/Revisor01/ketiv" alt="Lizenz">
</p>

## Worum es geht

Wer eine Predigt vorbereitet oder einen Gemeindebrief schreibt, braucht oft
denselben Vers in mehreren Übersetzungen, die Losung des Tages und die Texte
des nächsten Sonntags. Das liegt sonst auf verschiedenen Seiten verstreut.

Ketiv bringt es zusammen: eine Weboberfläche zum Nachschlagen und eine API,
über die andere Anwendungen dieselben Daten abrufen. Der Name kommt aus der
masoretischen Tradition: *Ketiv* ist der geschriebene Text, *Qere* die Lesart
am Rand — zwei Fassungen desselben Verses nebeneinander, so wie Ketiv
Übersetzungen vergleicht.

## Funktionen

- **Tageslosung** — Losung und Lehrtext des Tages, wahlweise in einer anderen
  Übersetzung
- **Bibelstellen** — eine Stelle in vielen Übersetzungen, auch mit Klammern,
  Auslassungen und optionalen Versen
- **Kirchenjahr** — Sonn- und Feiertage mit Perikopen und den zugehörigen Texten
- **API** — dieselben Daten als JSON, geschützt per API-Schlüssel
- **Verwaltung** — Anmeldung für die Pflege der Termine im Kirchenjahr

## Nutzung

Die Website läuft unter **[ketiv.de](https://ketiv.de)**. Wie die API
angesprochen wird — Anmeldung, Endpunkte, Übersetzungen, Antwortformat —
steht in [docs/api.md](docs/api.md).

## Tageslosung einbinden

Die Tageslosung lässt sich ohne API-Schlüssel auf jeder Website zeigen. Eine
Zeile an der gewünschten Stelle genügt, auch in einem HTML-Baustein eines
Baukastens:

```html
<div class="ketiv-losung" data-translation="LUT"></div>
<script src="https://ketiv.de/widget.js" defer></script>
```

Das Widget lädt die Losung einmal am Tag und merkt sie sich im Browser. Es
bringt seine Gestaltung selbst mit; das CSS der Seite wirkt nicht hinein.
Die Schrift (Jost) kommt von ketiv.de, nicht von einem fremden Dienst.

| Attribut | Werte | Standard |
|----------|-------|----------|
| `data-translation` | `LUT`, `ELB`, `HFA`, `SLT`, `ZB`, `GNB`, `NGÜ`, `EU`, `NLB`, `NeÜ`, `BIGS`, `NIV`, `ESV`, `LSG` | `LUT` |
| `data-auswahl` | `beide`, `losung`, `lehrtext`, `kuerzer` | `beide` |
| `data-bei-fehler` | `meldung`, `ausblenden` | `meldung` |
| `data-anfuehrungszeichen` | `ja` setzt den Text in „…“ | – |
| `data-darstellung` | `eigen` füllt vorhandenes Markup statt eigener Karte | – |

Aussehen über CSS-Variablen am Element, etwa
`style="--ketiv-hintergrund:#fff; --ketiv-farbe:#222"`:

| Variable | Standard |
|----------|----------|
| `--ketiv-hintergrund` | `#DDF3FF` |
| `--ketiv-farbe` | `#333` |
| `--ketiv-farbe-stelle` | `#666` |
| `--ketiv-farbe-quelle` | `#666` |
| `--ketiv-farbe-leise` (Ladezustand) | `#999` |
| `--ketiv-farbe-fehler` | `#c33` |
| `--ketiv-schrift` | `'Ketiv Jost', 'Jost', system-ui, sans-serif` |
| `--ketiv-schriftgewicht` | `700` |
| `--ketiv-schriftgroesse` / `--ketiv-schriftgroesse-schmal` | `2rem` / `1.5rem` |
| `--ketiv-innenabstand` / `--ketiv-innenabstand-schmal` | `40px 20%` / `32px 20px` |
| `--ketiv-mindesthoehe` | `200px` |
| `--ketiv-ausrichtung` | `center` |
| `--ketiv-quelle-groesse` | `.75rem` |

**Eigenes Markup.** Mit `data-darstellung="eigen"` füllt das Widget Elemente
der Seite: `data-ketiv="text"`, `data-ketiv="stelle"`, `data-ketiv="link"`
(bekommt den Link zu bibleserver) und `data-ketiv="quelle"`. Fehlt der Platz
für die Quelle, hängt das Widget sie unten an. Bei `data-auswahl="beide"`
stehen die Felder je in einem Bereich `data-ketiv-vers="losung"` und
`data-ketiv-vers="lehrtext"`.

```html
<section class="ketiv-losung" data-darstellung="eigen" data-auswahl="losung">
  <a data-ketiv="link" href="https://www.losungen.de">
    <blockquote data-ketiv="text"></blockquote>
    <span data-ketiv="stelle"></span>
  </a>
  <p data-ketiv="quelle"></p>
</section>
<script src="https://ketiv.de/widget.js" defer></script>
```

**Nutzungsbedingungen.** Die Losungen sind urheberrechtlich geschützt. Nach
den [Bedingungen der Herrnhuter Brüdergemeine](https://www.losungen.de/digital/nutzungsbedingungen)
(Stand November 2023) gehören zu jeder Anzeige beide Verse, Losung und
Lehrtext, unverändert und unter dem Namen „Die Losungen“, nur auf Seiten ohne
kommerziellen Zweck, mit dem Hinweis „© Evangelische Brüder-Unität –
Herrnhuter Brüdergemeine“ (Link auf herrnhuter.de) und „Weitere Informationen
finden Sie hier.“ (Link auf losungen.de). Den Hinweis setzt das Widget selbst
und nennt dazu die Bibelübersetzung. Die Voreinstellung (`LUT`, `beide`)
entspricht den Bedingungen; `losung`, `lehrtext`, `kuerzer` und andere
Übersetzungen zeigen nur einen Vers oder einen anderen Wortlaut und gehen
darüber hinaus. Wer die Losungen neu auf einer Seite zeigt, schickt den Link
an die Herausgeberin (info@losungen.de).

Der Endpunkt dahinter, `GET https://ketiv.de/api/v1/tageslosung`, ist in
[docs/openapi.yaml](docs/openapi.yaml) beschrieben.

## Versionen

Was sich wann geändert hat, steht in [CHANGELOG.md](CHANGELOG.md) — nach
[Keep a Changelog](https://keepachangelog.com/de/1.1.0/), aus Sicht der
Nutzer:innen geschrieben. Die
[Releases](https://github.com/Revisor01/ketiv/releases) fassen jede Version
zusammen.

## Selbst betreiben

Nötig sind Docker mit Compose und Node.js für den Bau der Oberfläche.

```bash
git clone https://github.com/Revisor01/ketiv.git
cd ketiv
cp .env.example .env
```

**1. Zugangsdaten eintragen.** In `.env` mindestens `API_KEY_1`,
`ADMIN_USER`, `ADMIN_PASSWORD` und `DB_PASSWORD` setzen; Schlüssel am besten
mit `openssl rand -hex 32` erzeugen.

| Variable | Pflicht | Bedeutung |
|----------|---------|-----------|
| `API_KEY_1` | ja | API-Schlüssel; die Weboberfläche bekommt ihn nach der Anmeldung |
| `API_KEY_2`, `API_KEY_3` | nein | weitere Schlüssel, etwa für eigene Anwendungen |
| `ADMIN_USER`, `ADMIN_PASSWORD` | ja | Anmeldung in der Weboberfläche, geprüft vom Server |
| `DB_PASSWORD` | ja | Passwort der PostgreSQL-Datenbank |
| `BIBLESERVER_API_KEY` | nein | Schlüssel für ERF Bibleserver, falls vorhanden |

Ohne gesetzten API-Schlüssel weist die API jede Anfrage ab.

**2. Oberfläche bauen.** Das API-Image liefert die Oberfläche als Startseite
aus und erwartet sie im Ordner `public/`:

```bash
cd frontend
cp .env.example .env    # REACT_APP_API_URL auf die eigene API zeigen lassen
npm ci && npm run build
rm -rf ../public && cp -R build ../public
cd ..
```

**3. Starten.**

```bash
docker compose up -d --build
# API und Startseite: http://localhost:8374 · eigene Oberfläche: http://localhost:3030
```

Beim ersten Start legt PostgreSQL das Schema aus `db/schema.sql` an. Täglich
um 00:02 Uhr lädt ein Cron-Job im Container die Übersetzungen des Tages in den
Zwischenspeicher; fehlen sie beim Start, holt ein Startup-Check sie nach.

**4. Weitere Tabellen und Losungen.** Die Tabellen für Losungen, Kirchenjahr
und Abkürzungen der Bibelbücher kommen einmalig aus `db/services-schema.sql`;
die Losungen eines Jahres danach aus dem offiziellen Paket von losungen.de:

```bash
docker compose exec -T postgres psql -U losungen_user -d losungen_db < db/services-schema.sql
docker compose exec ketiv-api php /var/www/html/scripts/import_losungen.php 2026
```

Die Abkürzungen der Bibelbücher liegen als SQL unter `sql/`.

## Aufbau

```
ketiv
├── api/          — PHP-Endpunkte (Losung, Bibelsuche, Kirchenjahr, Verwaltung)
│                   und die Python-Abfrage der Bibeltexte
├── frontend/     — Weboberfläche (React, Vite, Tailwind)
├── scripts/      — Import der Losungen, täglicher Abruf, Startup-Check
├── db/           — Datenbankschema
├── docker/       — Startskript und Cron-Eintrag des Containers
├── tests/api/    — Tests für Anmeldung und API-Schlüssel
└── docs/         — API-Referenz, Nutzungsbedingungen der Losungen
```

**Worauf es beim Bauen ankommt:**
- **Keine Zugangsdaten im Browser-Bundle.** Die Oberfläche bekommt ihren
  Schlüssel erst nach der Anmeldung vom Server.
- **Zwischenspeicher statt ständiger Abrufe.** Bibeltexte werden einmal am
  Tag geholt und in PostgreSQL und Redis vorgehalten.
- **Losung und Lehrtext gehören zusammen.** Ausgegeben werden immer beide.

## Mitmachen

Fehlermeldungen und Vorschläge sind willkommen — gern als
[Issue](https://github.com/Revisor01/ketiv/issues). Sicherheitslücken bitte
vertraulich melden, wie in [SECURITY.md](SECURITY.md) beschrieben. Pull
Requests laufen durch Tests und einen Secret-Scan; die Grundsätze für
Beiträge stehen in [CONTRIBUTING.md](CONTRIBUTING.md).

## Lizenz

Ketiv steht unter der [GNU Affero General Public License v3.0](LICENSE). Wer
Ketiv verändert und anderen zur Verfügung stellt, auch als Webdienst, legt
seinen Quelltext unter derselben Lizenz offen. Für Beiträge gilt
[CONTRIBUTING.md](CONTRIBUTING.md).

Für die Texte, die Ketiv anzeigt, gilt sie nicht — siehe Hinweis.

## Hinweis

Die **Herrnhuter Losungen** sind urheberrechtlich geschützt
(© Evangelische Brüder-Unität – Herrnhuter Brüdergemeine). Ihre Verbreitung im
Internet ist gestattet, aber an Bedingungen geknüpft; sie stehen in
[docs/NUTZUNGSBEDINGUNGEN-Losungen-2023.pdf](docs/NUTZUNGSBEDINGUNGEN-Losungen-2023.pdf).
Weitere Informationen unter [losungen.de](https://www.losungen.de).

Die modernen **Bibelübersetzungen** sind ebenfalls geschützt. Ketiv verweist
auf [ERF Bibleserver](https://www.bibleserver.com) und ist für den privaten
und gemeindlichen Gebrauch gedacht. Wer eine eigene Instanz öffentlich
betreibt, klärt die Rechte an den Texten selbst.

## Kontakt

Pastor Simon Luthe · [mail@simonluthe.de](mailto:mail@simonluthe.de) ·
[simonluthe.de](https://simonluthe.de)

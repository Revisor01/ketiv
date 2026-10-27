# Ketiv — Tageslosung einbinden

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
[openapi.yaml](openapi.yaml) beschrieben.

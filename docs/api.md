# Ketiv — API-Referenz

Die öffentliche Oberfläche unter [ketiv.de](https://ketiv.de) nutzt dieselbe API.
Beispiele verwenden `https://api.example.com` als Platzhalter für die eigene Instanz.

## Tageslosung ohne Schlüssel

`GET /api/v1/tageslosung?translation=LUT` liefert die Tageslosung ohne
API-Schlüssel, für Websites und das Widget `/widget.js`. Beschreibung als
OpenAPI 3.1 in [openapi.yaml](openapi.yaml), Einbindung in
[widget.md](widget.md). Alles Folgende betrifft die Schlüssel-API.

## Anmeldung

Der API-Schlüssel geht im Header `X-API-Key` oder als Parameter `api_key` mit;
bis zu drei Schlüssel lassen sich konfigurieren.

```bash
curl -H "X-API-Key: your-api-key" "https://api.example.com/"
curl "https://api.example.com/?api_key=your-api-key"
```

## Endpunkte

### GET /

Lädt die aktuelle Tageslosung in der gewünschten Übersetzung.

**Parameter:**
| Parameter | Typ | Default | Beschreibung |
|-----------|-----|---------|--------------|
| `translation` | string | `LUT` | Bibelübersetzung (siehe [Verfügbare Übersetzungen](#verfügbare-übersetzungen)) |
| `api_key` | string | - | API-Key (alternativ zu Header) |

**Beispiel:**

```bash
curl -H "X-API-Key: your-key" "https://api.example.com/?translation=HFA"
```

### Weitere Endpunkte

| Datei | Zweck |
|-------|-------|
| `bible_search.php` | Bibelstelle in einer Übersetzung, z. B. `?reference=Johannes 3,16&translation=LUT` |
| `sunday.php` | Sonntag oder Feiertag im Kirchenjahr mit den zugehörigen Texten, optional in einer Übersetzung |
| `church_events.php` | liturgische Termine aus der Datenbank |
| `admin.php` | Verwaltung für die Weboberfläche; `?action=login` prüft Benutzername und Passwort |

Tageslosung (`/`) und Bibelstellensuche verlangen einen API-Schlüssel; `sunday.php` gibt Bibeltexte nur mit Schlüssel aus.

## Verfügbare Übersetzungen

### Deutsche Übersetzungen (alle geprüft)

| Code | Name |
|------|------|
| `LUT` | **Lutherbibel 2017** (Standard) |
| `ELB` | **Elberfelder Bibel** |
| `HFA` | **Hoffnung für alle** |
| `SLT` | **Schlachter 2000** |
| `ZB` | **Zürcher Bibel** |
| `GNB` | **Gute Nachricht Bibel 2018** |
| `NGÜ` | **Neue Genfer Übersetzung** |
| `EU` | **Einheitsübersetzung 2016** |
| `NLB` | **Neues Leben. Die Bibel** |
| `NeÜ` | **Neue evangelistische Übersetzung** |

### Fremdsprachige Übersetzungen

#### Englisch (teilweise geprüft)
| Code | Name | Status |
|------|------|--------|
| `NIV` | **New International Version** | geprüft |
| `ESV` | **English Standard Version** | geprüft |
| `NLT` | **New Living Translation** | nicht geprüft |
| `MSG` | **The Message** | nicht geprüft |
| `CEV` | **Contemporary English Version** | nicht geprüft |
| `GNT` | **Good News Translation** | nicht geprüft |
| `NKJV` | **New King James Version** | nicht geprüft |
| `KJV` | **King James Version** | nicht geprüft |
| `NASB` | **New American Standard Bible** | nicht geprüft |
| `CSB` | **Christian Standard Bible** | nicht geprüft |

#### Französisch
| Code | Name | Status |
|------|------|--------|
| `LSG` | **Louis Segond 1910** | geprüft |
| `BDS` | **Bible du Semeur** | nicht geprüft |
| `S21` | **Segond 21** | nicht geprüft |

#### Spanisch
| Code | Name | Status |
|------|------|--------|
| `RVR60` | **Reina-Valera 1960** | nicht geprüft |
| `NVI` | **Nueva Versión Internacional** | nicht geprüft |
| `DHH` | **Dios Habla Hoy** | nicht geprüft |
| `RVR95` | **Reina-Valera 1995** | nicht geprüft |
| `LBLA` | **La Biblia de las Américas** | nicht geprüft |
| `NVT` | **Nueva Traducción Viviente** | nicht geprüft |

## Antwort-Format

### Erfolgreiche Antwort

```json
{
  "success": true,
  "data": {
    "date": "Donnerstag, 31.07.2025",
    "losung": {
      "text": "Denn so hoch, wie der Himmel über der Erde ist, so groß ist seine Liebe zu allen, die Ehrfurcht vor ihm haben.",
      "reference": "Psalm 103,11",
      "testament": "AT",
      "translation_source": "ERF Bibleserver",
      "bibleserver_url": "https://www.bibleserver.com/HFA/Psalm103,11"
    },
    "lehrtext": {
      "text": "Denn wo sich die ganze Macht der Sünde zeigte, da erwies sich auch Gottes Barmherzigkeit in ihrer ganzen Größe. Denn so wie bisher die Sünde über alle Menschen herrschte und ihnen den Tod brachte, so herrscht jetzt Gottes Gnade: Gott spricht uns von unserer Schuld frei und schenkt uns ewiges Leben durch Jesus Christus, unseren Herrn.",
      "reference": "Römer 5,20-21",
      "testament": "NT", 
      "translation_source": "ERF Bibleserver",
      "bibleserver_url": "https://www.bibleserver.com/HFA/Roemer5,20-21"
    },
    "translation": {
      "code": "HFA",
      "name": "Hoffnung für alle",
      "language": "German"
    },
    "source": "Herrnhuter Losungen",
    "url": "https://www.losungen.de/"
  },
  "timestamp": "2025-07-31T10:30:00+02:00"
}
```

### Antwort-Felder Erklärung

| Feld | Beschreibung |
|------|--------------|
| `success` | Boolean - API-Aufruf erfolgreich |
| `data.date` | String - Deutsches Datum der Losung |
| `data.losung` | Object - Alttestamentlicher Vers (Losung) |
| `data.lehrtext` | Object - Neutestamentlicher Vers (Lehrtext) |
| `data.translation` | Object - Übersetzungsinformationen |
| `data.source` | String - Quelle der Losungen |
| `data.url` | String - URL zur Original-Quelle |
| `timestamp` | String - ISO-8601 Zeitstempel der API-Antwort |

#### Vers-Objekt
| Feld | Beschreibung |
|------|--------------|
| `text` | String - Bibelvers-Text in gewählter Übersetzung |
| `reference` | String - Bibelstellen-Referenz (z.B. "Psalm 103,11") |
| `testament` | String - "AT" (Altes Testament) oder "NT" (Neues Testament) |
| `translation_source` | String - Quelle des Übersetzungstexts |
| `bibleserver_url` | String - Direkter Link zur Bibelstelle auf ERF Bibleserver |

## Fehlerbehandlung

### 401 Unauthorized - Ungültiger API-Key
```json
{
  "success": false,
  "error": "Invalid or missing API key",
  "message": "Please provide a valid API key via X-API-Key header or api_key parameter",
  "timestamp": "2025-07-31T10:30:00+02:00"
}
```

### 500 Internal Server Error - Technischer Fehler
```json
{
  "success": false,
  "error": "Fehler beim Laden der Losung: Connection timeout",
  "timestamp": "2025-07-31T10:30:00+02:00"
}
```

### Ungültige Übersetzung
```json
{
  "success": true,
  "data": {
    "error": "Unsupported translation: INVALID",
    "available_translations": {
      "LUT": "Lutherbibel 2017",
      "ELB": "Elberfelder Bibel",
      // ... alle verfügbaren Übersetzungen
    }
  }
}
```

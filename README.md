# Ketiv — Losungen API

Bibeltexte in vielen Übersetzungen im Vergleich, Kirchenjahr mit Perikopen und die
Tageslosung. API mit React-Frontend; das Frontend tritt als **Ketiv** auf.

## Features

- Tägliche Losungen von losungen.de
- Bibeltexte in verschiedenen Übersetzungen (LUT, HFA, ELB, BAS, MENG, NeÜ, EU, EÜ, ZB, NGÜ, GNB, NLB, SLT, BIGS)
- Bibeltext-Suche mit flexiblem Format-Parser
- Web-Interface mit React
- Docker-basiertes Deployment
- PostgreSQL Datenbank für Caching

## Name

Die App heißt **Ketiv** — „was geschrieben steht". In der masoretischen Tradition
bezeichnet *Ketiv* den geschriebenen Konsonantentext, *Qere* die abweichende
Lesart am Rand. Zwei Fassungen desselben Verses nebeneinander: genau das, was
diese App tut, wenn sie Übersetzungen vergleicht und Klammern, Auslassungen und
optionale Verse korrekt auflöst.

Geplante Domain: ketiv.de

## Rechtliches

**Losungen.** Urheberrechtlich geschützt (Evangelische Brüder-Unität – Herrnhuter
Brüdergemeine). Die Veröffentlichung im Internet ist ausdrücklich gestattet, aber
an Auflagen geknüpft — siehe `docs/NUTZUNGSBEDINGUNGEN-Losungen-2023.pdf`.
Vor einer öffentlichen Freigabe zu erfüllen:

- [x] Anzeige immer aus **beiden** Versen (Losung AT + Lehrtext NT)
- [x] kostenlos, keine In-App-Käufe, nicht kommerziell
- [ ] Losungstexte im Interface klar als »Die Losungen« bezeichnen
- [ ] Losungsdaten ausschließlich von losungen.de beziehen
- [ ] nur laufendes Jahr sowie Vor- und Folgejahr bereitstellen
      (aktuell liegen 2024–2027 in `sql/`)
- [ ] sichtbarer Hinweis „© Evangelische Brüder-Unität – Herrnhuter Brüdergemeine"
      mit Link auf herrnhuter.de sowie „Weitere Informationen finden Sie hier."
      mit Link auf losungen.de
- [ ] Link zur Veröffentlichung an support@losungen.de senden

**Bibeltexte.** Die Suche bezieht ihre Texte per Scraping von bibleserver.com.
ERF bietet dafür bewusst keine API an („aus Lizenzgründen nicht möglich") und
erteilt selbst keine Genehmigungen. Die verwendeten modernen Übersetzungen
(Luther 2017, EÜ, HFA, NGÜ, GNB, BasisBibel, Zürcher, NeÜ) sind urheberrechtlich
geschützt. **Dieser Teil ist für den privaten Gebrauch gedacht.**

Für eine Veröffentlichung müsste auf lizenzfreie Quellen umgestellt werden:

- gemeinfrei und frei verbreitbar: Luther 1545/1912, Elberfelder 1871/1905,
  Textbibel 1906, Menge 1939 (CC0)
- nicht-kommerziell verbreitbar: Schlachter 1951
- Bezugsquellen: getbible.net (Lizenz je Übersetzung dokumentiert),
  CrossWire/SWORD, Zefania XML — alle als JSON/XML zum Selbsthosten
- moderne Übersetzungen nur über Lizenz (Deutsche Bibelgesellschaft, schriftliche
  Anfrage) oder scripture.api.bible (Starter-Plan: strikt nicht-kommerziell)

## Setup

```bash
# Repository klonen
git clone https://github.com/Revisor01/losungen-api.git
cd losungen-api

# Environment-Variablen anpassen
cp .env.example .env
cp frontend/.env.example frontend/.env

# Mit Docker starten
docker-compose up -d
```

Die Zugangsdaten stehen ausschließlich in den `.env`-Dateien (nicht im Git).
Für das Frontend werden sie beim Build eingesetzt — nach Änderungen an
`frontend/.env` muss neu gebaut werden.

## Verwendung

- API: `http://localhost:8374`
- Frontend: `http://localhost:3030`

### API Endpoints

```bash
# Tageslosung
GET /?api_key=YOUR_KEY

# Bibeltext-Suche
GET /bible_search.php?api_key=YOUR_KEY&reference=Johannes 3,16&translation=LUT
```

## Deployment

Das Deployment läuft automatisch über GitHub Actions: Ein Push auf `main` baut die
Images, schiebt sie nach GHCR und stößt per Webhook den Portainer-Stack
`biblescrapper` auf server.godsapp.de an. Live unter losung.konfi-quest.de.

Zwei Workflows:

- **Build Frontend** (`frontend/**`) → `losungen-api-frontend`, die React-App
- **Build API** (`api/**`, `frontend/**`, `scripts/**`, `Dockerfile`, `docker/**`, `db/**`)
  → `losungen-api-api`. Dieser Workflow baut zusätzlich das Frontend und legt es als
  `public/` ins Image — das ist die Landingpage auf der API-Wurzel. `public/` ist
  deshalb ein Build-Artefakt und liegt bewusst nicht im Repository.

Die Build-Zugangsdaten liegen als GitHub-Secrets (`REACT_APP_API_KEY`,
`REACT_APP_AUTH_USER`, `REACT_APP_AUTH_PASSWORD`); die Laufzeit-Keys der API
(`API_KEY_1` bis `API_KEY_3`) als Stack-Variablen in Portainer.

Manuelles Deployment, falls nötig:

```bash
git pull
docker-compose up -d --build
```

1. **Sichere API-Keys generieren**
   ```bash
   # Zufällige API-Keys generieren
   openssl rand -hex 32  # API_KEY_1
   openssl rand -hex 32  # API_KEY_2
   openssl rand -hex 32  # API_KEY_3
   ```

2. **Docker-Compose für Produktion anpassen**
   ```yaml
   version: '3.8'
   services:
     losungen-api:
       build: .
       restart: unless-stopped
       ports:
         - "8374:80"
       environment:
         - API_KEY_1=${API_KEY_1}
         - API_KEY_2=${API_KEY_2}
         - API_KEY_3=${API_KEY_3}
         - BIBLESERVER_API_KEY=${BIBLESERVER_API_KEY}
         - TZ=Europe/Berlin
       volumes:
         - ./logs:/var/log/apache2
       labels:
         - "traefik.enable=true"
         - "traefik.http.routers.losungen.rule=Host(\`your-domain.com\`)"
         - "traefik.http.routers.losungen.tls=true"
         - "traefik.http.routers.losungen.tls.certresolver=letsencrypt"
   ```

3. **Reverse Proxy konfigurieren** (Apache/Nginx)
   ```apache
   ProxyPass /.well-known/ !
   ProxyPass / http://127.0.0.1:8374/
   ProxyPassReverse / http://127.0.0.1:8374/
   
   Header always set Access-Control-Allow-Origin "*"
   Header always set Access-Control-Allow-Methods "GET,POST,PUT,DELETE,OPTIONS"
   Header always set Access-Control-Allow-Headers "Content-Type,Authorization,X-API-Key"
   ```

## 🔐 API Authentication

Die API verwendet API-Key basierte Authentifizierung für sicheren Zugriff.

### Authentifizierungsmethoden

**Option 1: HTTP Header (Empfohlen)**
```bash
curl -H "X-API-Key: your-api-key" "https://api.example.com/"
```

**Option 2: Query Parameter**
```bash
curl "https://api.example.com/?api_key=your-api-key"
```

**Option 3: JavaScript/Fetch**
```javascript
fetch('https://api.example.com/?translation=HFA', {
  headers: {
    'X-API-Key': 'your-api-key'
  }
})
.then(response => response.json())
.then(data => console.log(data));
```

### API-Key Management

- **Mehrere Keys**: Bis zu 3 verschiedene API-Keys werden unterstützt
- **Umgebungsvariablen**: Keys werden sicher über `.env` verwaltet
- **Rotation**: Keys können ohne Service-Unterbrechung gewechselt werden

## 🔗 API Endpoints

### GET /

Lädt die aktuelle Tageslosung in der gewünschten Übersetzung.

**Parameter:**
| Parameter | Typ | Default | Beschreibung |
|-----------|-----|---------|--------------|
| `translation` | string | `LUT` | Bibelübersetzung (siehe [Verfügbare Übersetzungen](#verfügbare-übersetzungen)) |
| `api_key` | string | - | API-Key (alternativ zu Header) |

**Beispiele:**

```bash
# Deutsche Übersetzungen
curl -H "X-API-Key: your-key" "https://api.example.com/?translation=HFA"   # Hoffnung für alle
curl -H "X-API-Key: your-key" "https://api.example.com/?translation=ELB"   # Elberfelder
curl -H "X-API-Key: your-key" "https://api.example.com/?translation=NGÜ"   # Neue Genfer

# Englische Übersetzungen  
curl -H "X-API-Key: your-key" "https://api.example.com/?translation=NIV"   # New International Version
curl -H "X-API-Key: your-key" "https://api.example.com/?translation=ESV"   # English Standard Version

# Französische Übersetzungen
curl -H "X-API-Key: your-key" "https://api.example.com/?translation=LSG"   # Louis Segond 1910

# Standard (ohne Parameter = Lutherbibel)
curl -H "X-API-Key: your-key" "https://api.example.com/"
```

## 📚 Verfügbare Übersetzungen

### Deutsche Übersetzungen (10) ✅ Alle getestet

| Code | Name | Beschreibung |
|------|------|--------------|
| `LUT` | **Lutherbibel 2017** | Standard-Übersetzung (Default) |
| `ELB` | **Elberfelder Bibel** | Wortgetreue Übersetzung |
| `HFA` | **Hoffnung für alle** | Moderne, verständliche Sprache |
| `SLT` | **Schlachter 2000** | Konservative Übersetzung |
| `ZB` | **Zürcher Bibel** | Reformierte Tradition |
| `GNB` | **Gute Nachricht Bibel 2018** | Einfache, klare Sprache |
| `NGÜ` | **Neue Genfer Übersetzung** | Ausgewogene Übersetzung |
| `EU` | **Einheitsübersetzung 2016** | Katholische Übersetzung |
| `NLB` | **Neues Leben. Die Bibel** | Lebensnahe Sprache |
| `NeÜ` | **Neue evangelistische Übersetzung** | Poetische Übersetzung |

### Fremdsprachige Übersetzungen (13)

#### 🇺🇸 Englisch ✅ Getestet
| Code | Name | Status |
|------|------|--------|
| `NIV` | **New International Version** | ✅ Funktioniert |
| `ESV` | **English Standard Version** | ✅ Funktioniert |
| `NLT` | **New Living Translation** | ⚠️ Nicht getestet |
| `MSG` | **The Message** | ⚠️ Nicht getestet |
| `CEV` | **Contemporary English Version** | ⚠️ Nicht getestet |
| `GNT` | **Good News Translation** | ⚠️ Nicht getestet |
| `NKJV` | **New King James Version** | ⚠️ Nicht getestet |
| `KJV` | **King James Version** | ⚠️ Nicht getestet |
| `NASB` | **New American Standard Bible** | ⚠️ Nicht getestet |
| `CSB` | **Christian Standard Bible** | ⚠️ Nicht getestet |

#### 🇫🇷 Französisch
| Code | Name | Status |
|------|------|--------|
| `LSG` | **Louis Segond 1910** | ✅ Funktioniert |
| `BDS` | **Bible du Semeur** | ⚠️ Nicht getestet |
| `S21` | **Segond 21** | ⚠️ Nicht getestet |

#### 🇪🇸 Spanisch  
| Code | Name | Status |
|------|------|--------|
| `RVR60` | **Reina-Valera 1960** | ⚠️ Nicht getestet |
| `NVI` | **Nueva Versión Internacional** | ⚠️ Nicht getestet |
| `DHH` | **Dios Habla Hoy** | ⚠️ Nicht getestet |
| `RVR95` | **Reina-Valera 1995** | ⚠️ Nicht getestet |
| `LBLA` | **La Biblia de las Américas** | ⚠️ Nicht getestet |
| `NVT` | **Nueva Traducción Viviente** | ⚠️ Nicht getestet |

## 📄 Antwort-Format

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

#### Vers-Objekt Struktur
| Feld | Beschreibung |
|------|--------------|
| `text` | String - Bibelvers-Text in gewählter Übersetzung |
| `reference` | String - Bibelstellen-Referenz (z.B. "Psalm 103,11") |
| `testament` | String - "AT" (Altes Testament) oder "NT" (Neues Testament) |
| `translation_source` | String - Quelle des Übersetzungstexts |
| `bibleserver_url` | String - Direkter Link zur Bibelstelle auf ERF Bibleserver |

## ❌ Fehlerbehandlung

### 401 Unauthorized - Ungültiger API-Key
```json
{
  "success": false,
  "error": "Invalid or missing API key",
  "message": "Please provide a valid API key via X-API-Key header or api_key parameter",
  "timestamp": "2025-07-31T10:30:00+02:00"
}
```

**Lösungen:**
- API-Key über `X-API-Key` Header senden
- API-Key als `api_key` Parameter übergeben
- Gültigen API-Key aus `.env` verwenden

### 500 Internal Server Error - Technischer Fehler
```json
{
  "success": false,
  "error": "Fehler beim Laden der Losung: Connection timeout",
  "timestamp": "2025-07-31T10:30:00+02:00"
}
```

**Häufige Ursachen:**
- Losungen.de nicht erreichbar
- ERF Bibleserver Timeout
- Docker Container nicht gestartet
- Netzwerk-Probleme

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

## 🐳 Docker Konfiguration

### Dockerfile
Die API läuft in einem optimierten PHP-Apache Container mit Python für Web-Scraping.

**Enthaltene Komponenten:**
- PHP 8.2 mit Apache
- Python 3 mit BeautifulSoup4 und requests
- Optimierte Caching-Header
- Gesundheitschecks

### Docker Compose

```yaml
version: '3.8'
services:
  losungen-api:
    build: .
    container_name: losungen-api
    restart: unless-stopped
    ports:
      - "8374:80"  # Port anpassbar
    environment:
      - BIBLESERVER_API_KEY=${BIBLESERVER_API_KEY}
      - API_KEY_1=${API_KEY_1}
      - API_KEY_2=${API_KEY_2}
      - API_KEY_3=${API_KEY_3}
      - TZ=Europe/Berlin
    volumes:
      - ./logs:/var/log/apache2
    networks:
      - losungen-network
    # Traefik Labels für automatisches SSL
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.losungen.rule=Host(\`losung.example.com\`)"
      - "traefik.http.routers.losungen.tls=true"
      - "traefik.http.routers.losungen.tls.certresolver=letsencrypt"

networks:
  losungen-network:
    driver: bridge
```

### Container-Management

```bash
# Container starten
docker-compose up -d

# Logs anzeigen
docker-compose logs -f

# Container neu bauen
docker-compose up -d --build

# Container stoppen
docker-compose down

# Container-Status prüfen
docker-compose ps

# In Container einloggen (Debugging)
docker-compose exec losungen-api bash
```

## 🔧 Entwicklung

### Lokale Entwicklung

1. **Repository forken und klonen**
   ```bash
   git clone https://github.com/yourusername/losungen-api.git
   cd losungen-api
   ```

2. **Development Environment starten**
   ```bash
   cp .env.example .env
   docker-compose up -d --build
   ```

3. **API testen**
   ```bash
   # Grundfunktion testen
   curl -H "X-API-Key: default-key-1" "http://localhost:8374/"
   
   # Verschiedene Übersetzungen testen
   curl -H "X-API-Key: default-key-1" "http://localhost:8374/?translation=HFA"
   curl -H "X-API-Key: default-key-1" "http://localhost:8374/?translation=NIV"
   ```

### Projekt-Struktur

```
losungen-api/
├── api/
│   ├── index.php           # Haupt-API Endpoint
│   └── scraper.py          # Python Web-Scraper
├── logs/                   # Apache Logs
├── .env                    # Umgebungsvariablen
├── .env.example            # Beispiel-Konfiguration
├── docker-compose.yml     # Docker Orchestrierung
├── Dockerfile             # Container-Definition
└── README.md              # Diese Dokumentation
```

### Erweiterte Features entwickeln

**Neue Übersetzung hinzufügen:**
1. Code in `scraper.py` TRANSLATIONS Dictionary ergänzen
2. In `index.php` validTranslations Array erweitern
3. Testen mit curl-Request
4. README aktualisieren

**Caching implementieren:**
```php
// Beispiel für Redis-Caching
$redis = new Redis();
$cacheKey = "losung_" . date('Y-m-d') . "_" . $translation;
$cached = $redis->get($cacheKey);

if ($cached) {
    return json_decode($cached, true);
}

// ... API-Logik ...

$redis->setex($cacheKey, 3600, json_encode($result)); // 1 Stunde Cache
```

### Testing

```bash
# Alle deutschen Übersetzungen testen
python test_all_translations.py

# Spezifische Übersetzung debuggen
curl -H "X-API-Key: your-key" "http://localhost:8374/?translation=HFA&debug=1"

# Performance testen
ab -n 100 -c 10 -H "X-API-Key: your-key" "http://localhost:8374/"
```

## 🔒 Sicherheit

### Implementierte Sicherheitsmaßnahmen

- ✅ **API-Key Authentifizierung** - Verhindert unbefugten Zugriff
- ✅ **Umgebungsvariablen** - Sensible Daten nicht im Code
- ✅ **CORS-Konfiguration** - Kontrollierte Cross-Origin Requests
- ✅ **Input-Validierung** - Schutz vor Injection-Attacken  
- ✅ **Container-Isolation** - Docker-Sicherheit
- ✅ **Keine Log-Speicherung** von API-Keys
- ✅ **Rate-Limiting** über Reverse Proxy möglich

### Best Practices

1. **API-Keys rotieren**
   ```bash
   # Neue Keys generieren
   openssl rand -hex 32
   
   # In .env aktualisieren
   API_KEY_1=new-secure-key
   
   # Container neu starten
   docker-compose restart
   ```

2. **HTTPS verwenden**
   - Let's Encrypt mit Traefik/Certbot
   - API-Keys niemals über HTTP übertragen

3. **Monitoring einrichten**
   ```bash
   # Fehlgeschlagene Authentifizierungen überwachen
   grep "Invalid or missing API key" logs/access.log
   
   # Ungewöhnliche Zugriffsmuster erkennen
   tail -f logs/access.log | grep -E "(429|401|500)"
   ```

4. **Firewall konfigurieren**
   ```bash
   # Nur notwendige Ports öffnen
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw allow 22/tcp
   ufw enable
   ```

### Produktions-Härtung

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  losungen-api:
    build: .
    restart: unless-stopped
    read_only: true                    # Container read-only
    tmpfs:
      - /tmp
      - /var/run
    security_opt:
      - no-new-privileges:true         # Privilege Escalation verhindern
    cap_drop:
      - ALL                            # Alle Capabilities entfernen
    cap_add:
      - NET_BIND_SERVICE              # Nur Port-Binding erlauben
    environment:
      - API_KEY_1=${API_KEY_1}
      - API_KEY_2=${API_KEY_2} 
      - API_KEY_3=${API_KEY_3}
    volumes:
      - ./logs:/var/log/apache2:rw
    networks:
      - internal                       # Isoliertes Netzwerk

networks:
  internal:
    driver: bridge
    internal: true                     # Kein Internet-Zugang
```

## 📊 Monitoring & Logging

### Logs

**Apache Access Logs:**
```bash
tail -f logs/access.log
```

**Apache Error Logs:**
```bash
tail -f logs/error.log
```

**API-Metriken:**
```bash
# Requests pro Stunde
awk '{print $4}' logs/access.log | cut -d: -f2 | sort | uniq -c

# Top-verwendete Übersetzungen
grep -o 'translation=[A-Z]*' logs/access.log | sort | uniq -c | sort -nr

# Fehlerhafte API-Keys
grep "401" logs/access.log | wc -l
```

### Performance Monitoring

```bash
# Container-Ressourcen überwachen
docker stats losungen-api

# Response-Times messen
curl -H "X-API-Key: your-key" -w "%{time_total}\n" -o /dev/null -s "http://localhost:8374/"

# Concurrent Requests testen
ab -n 1000 -c 50 -H "X-API-Key: your-key" "http://localhost:8374/"
```

## 🤝 Contributing

Beiträge sind willkommen! 

1. **Fork** das Repository
2. **Feature Branch** erstellen (`git checkout -b feature/AmazingFeature`)
3. **Commit** deine Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. **Push** zum Branch (`git push origin feature/AmazingFeature`)
5. **Pull Request** öffnen

### Contribution Guidelines

- Code sollte dokumentiert sein
- Neue Features benötigen Tests
- README bei Änderungen aktualisieren
- Conventional Commits verwenden

## 📝 Changelog

### v1.0.0 (2025-07-31)
- ✅ Initiale Version mit 23 Bibelübersetzungen
- ✅ API-Key Authentifizierung implementiert
- ✅ Docker-Setup mit vollständiger Dokumentation
- ✅ ERF Bibleserver Integration für präzise Vers-Extraktion
- ✅ Multi-Language Support (DE/EN/FR/ES)
- ✅ Produktionsreife Sicherheitsfeatures

## 🔗 Links & Ressourcen

- **Herrnhuter Losungen**: https://www.losungen.de/
- **ERF Bibleserver**: https://www.bibleserver.com/
- **ERF Webmaster API**: https://www.bibleserver.com/webmasters
- **Docker Hub**: https://hub.docker.com/
- **Evangelische Brüder-Unität**: https://www.ebu.de/

## 🆘 Support

Bei Problemen oder Fragen:

1. **Issues** auf GitHub erstellen
2. **Logs prüfen**: `docker-compose logs -f`
3. **Wiki** konsultieren (falls vorhanden)
4. **Community** fragen

**Häufige Probleme:**
- Container startet nicht → Docker Logs prüfen
- 401 Errors → API-Key validieren
- Leere Antworten → ERF Bibleserver Erreichbarkeit prüfen
- Performance-Probleme → Caching implementieren

## 📜 Lizenz

Dieses Projekt steht unter der MIT Lizenz - siehe [LICENSE](LICENSE) für Details.

**Wichtige Hinweise:**
- Die **Herrnhuter Losungen** sind urheberrechtlich geschützt durch die Evangelische Brüder-Unität
- **ERF Bibleserver** Inhalte unterliegen den jeweiligen Lizenzbestimmungen
- Diese API dient der **nicht-kommerziellen Verbreitung** christlicher Inhalte
- Bei kommerzieller Nutzung bitte Rechteinhaber kontaktieren

---

<div align="center">

**Made with ❤️ for the Christian Community**

[⭐ Star this repo](https://github.com/yourusername/losungen-api) | [🐛 Report Bug](https://github.com/yourusername/losungen-api/issues) | [💡 Request Feature](https://github.com/yourusername/losungen-api/issues)

</div>
# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier dokumentiert.

Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionierung folgt [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

## [2.1.0] - 2026-07-31

### Security
- API-Key und Admin-Zugangsdaten aus dem Quellcode entfernt — sie kommen jetzt
  ausschließlich aus Umgebungsvariablen (`REACT_APP_API_KEY`,
  `REACT_APP_AUTH_USER`, `REACT_APP_AUTH_PASSWORD`) bzw. CI-Secrets.
- Hartkodierte Fallback-API-Keys in `api/auth.php` und `api/admin.php` entfernt.
  Ohne gesetztes `API_KEY_1` wird jeder Zugriff jetzt abgelehnt, statt auf einen
  im Repo stehenden Schlüssel zurückzufallen.
- Git-History auf einen Initial Commit zusammengefasst, um zuvor eingecheckte
  Zugangsdaten aus dem öffentlichen Repository zu entfernen.
- Dependabot Alerts, Dependabot Security Updates und CodeQL Default Setup aktiviert.
- Source Maps werden nicht mehr ausgeliefert (`GENERATE_SOURCEMAP=false`) und sind
  über `.gitignore` ausgeschlossen.

### Changed
- Die Landingpage der API (`public/`) wird nicht mehr als Build-Artefakt eingecheckt,
  sondern im CI-Workflow aus `frontend/` gebaut. Sie bleibt damit automatisch aktuell —
  zuvor lag dort ein manuell kopierter Stand von August 2025.
- `frontend/Dockerfile` nimmt die Build-Konfiguration über `ARG`/`ENV` entgegen,
  damit die Werte im CI-Build ankommen.

### Removed
- Verwaiste Dateien im Projektwurzelverzeichnis entfernt: `bigs slugs.txt`,
  `scrape_exegesis.py`, `Losungen Free 2026.csv/.txt` (bereits nach
  `sql/losungen_2026.sql` überführt), `NUTZUNGSBEDINGUNGEN November 2023.pdf`.

### Fixed
- Verklebten `.gitignore`-Eintrag korrigiert (`pnpm-lock.yaml.playwright-mcp/`),
  wodurch Playwright-Artefakte nicht ignoriert wurden.

## [2.0.0] - 2026-07-30

### Added
- Kopierfunktion mit hochgestellten Versnummern (Unicode für Text/Markdown,
  `<sup>` für HTML).

### Changed
- Reduktion auf die Kernfunktionen: CMS und Newsletter-System entfernt.
  Es bleiben Losung, Bibelsuche und Kirchenjahr.
- UI-Überarbeitung: Kirchenjahr-Navigation per Dropdown, Verbesserungen im
  Übersetzungsvergleich, diverse Korrekturen im Admin-Bereich.

### Fixed
- Übersetzungs-Dropdown wurde von benachbarten Karten verdeckt (Stacking Context).
- Darstellung von Einzelversen.
- Pfad zum Cron-Status im Container.
- Anzeige von Terabyte in `formatBytes`.

## [1.1.0] - 2026-01

### Added
- Losungen-Daten für 2026.
- CI/CD-Workflows: automatische Docker-Builds nach GHCR mit Portainer-Webhook.
- `sunday.php` mit dynamischer Perikopenreihen-Berechnung als Endpunkt für n8n.
- Newsletter-System mit Double-Opt-In (in 2.0.0 wieder entfernt).

### Fixed
- Parsing komplexer Bibelstellen in `sunday.php` (z. B. `Jer 14,1(2)3-4(5-6)7-9`).
- Diverse Null-Checks im Admin-Panel (Datenbankstatus, Speicherplatz).
- Routing für `church_events.php` und weitere Endpunkte in der `.htaccess`.

## [1.0.0] - 2025-08

### Added
- Erste Fassung der Losungen-API mit Web-Interface.
- Bibelsuche über ERF Bibleserver mit über 20 Übersetzungen.
- Admin-Panel mit Cache-Verwaltung und manuellem Abruf.
- Kirchenjahr-Daten und Kalender-Export (ICS).
- Redis-Caching und PostgreSQL-Persistenz.
- Unterstützung komplexer Versbereiche inklusive ausgeschlossener Verse
  (z. B. `Joh 8,8-12.14-17`).

[Unreleased]: https://github.com/Revisor01/losungen-api/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/Revisor01/losungen-api/releases/tag/v2.1.0
[2.0.0]: https://github.com/Revisor01/losungen-api/releases/tag/v2.0.0
[1.1.0]: https://github.com/Revisor01/losungen-api/releases/tag/v1.1.0
[1.0.0]: https://github.com/Revisor01/losungen-api/releases/tag/v1.0.0

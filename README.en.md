<h1 align="center">Ketiv</h1>

<p align="center">
  The daily watchword, the church year and Bible texts in many translations side by side —<br>
  as a website and as an API for your own applications.
</p>

<p align="center">
  <a href="README.md">Deutsch</a> · <b>English</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/PHP-8.2-777bb4?logo=php" alt="PHP">
  <img src="https://img.shields.io/badge/React-Vite-61dafb?logo=react" alt="React">
  <img src="https://img.shields.io/github/license/Revisor01/ketiv" alt="License">
</p>

## What it is about

Anyone preparing a sermon or writing a parish newsletter often needs the same
verse in several translations, the watchword of the day and the readings for
next Sunday. Otherwise these are scattered across different websites.

Ketiv brings them together: a web interface for looking things up and an API
through which other applications retrieve the same data. The name comes from
the Masoretic tradition: *Ketiv* is the written text, *Qere* the reading in
the margin — two versions of the same verse side by side, just as Ketiv
compares translations. The interface is in German.

## Features

- **Daily watchword** — the Moravian *Losung* and teaching text of the day,
  optionally in another translation
- **Bible passages** — one passage in many translations, including brackets,
  omissions and optional verses
- **Church year** — Sundays and holidays with their pericopes and texts
- **API** — the same data as JSON, protected by an API key
- **Administration** — login for maintaining the church year dates

## Usage

The website runs at **[ketiv.de](https://ketiv.de)**. How to use the API —
authentication, endpoints, translations, response format — is described in
[docs/api.md](docs/api.md) (German).

## Versions

What changed when is in [CHANGELOG.md](CHANGELOG.md) (in German, following
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/)). The
[releases](https://github.com/Revisor01/ketiv/releases) summarise each version.

## Running it yourself

You need Docker with Compose and Node.js to build the interface.

```bash
git clone https://github.com/Revisor01/ketiv.git
cd ketiv
cp .env.example .env
```

**1. Enter credentials.** In `.env`, set at least `API_KEY_1`, `ADMIN_USER`,
`ADMIN_PASSWORD` and `DB_PASSWORD`; generate keys with `openssl rand -hex 32`.

| Variable | Required | Meaning |
|----------|----------|---------|
| `API_KEY_1` | yes | API key; the web interface receives it after login |
| `API_KEY_2`, `API_KEY_3` | no | further keys, e.g. for your own applications |
| `ADMIN_USER`, `ADMIN_PASSWORD` | yes | login to the web interface, checked by the server |
| `DB_PASSWORD` | yes | password of the PostgreSQL database |
| `BIBLESERVER_API_KEY` | no | key for ERF Bibleserver, if you have one |

Without an API key set, the API rejects every request.

**2. Build the interface.** The API image serves the interface as its start
page and expects it in the `public/` folder:

```bash
cd frontend
cp .env.example .env    # point REACT_APP_API_URL to your own API
npm ci && npm run build
rm -rf ../public && cp -R build ../public
cd ..
```

**3. Start.**

```bash
docker compose up -d --build
# API and start page: http://localhost:8374 · separate interface: http://localhost:3030
```

On first start PostgreSQL creates the schema from `db/schema.sql`. Every day at
00:02 a cron job in the container loads the day's translations into the cache;
if they are missing at start-up, a startup check fetches them.

**4. Further tables and watchwords.** The tables for watchwords, church year
and Bible book abbreviations are created once from `db/services-schema.sql`;
then the watchwords for a year come from the official package from losungen.de:

```bash
docker compose exec -T postgres psql -U losungen_user -d losungen_db < db/services-schema.sql
docker compose exec ketiv-api php /var/www/html/scripts/import_losungen.php 2026
```

The Bible book abbreviations are available as SQL in `sql/`.

## Structure

```
ketiv
├── api/          — PHP endpoints (watchword, Bible search, church year, admin)
│                   and the Python lookup of Bible texts
├── frontend/     — web interface (React, Vite, Tailwind)
├── scripts/      — watchword import, daily fetch, startup check
├── db/           — database schema
├── docker/       — container start script and cron entry
├── tests/api/    — tests for login and API keys
└── docs/         — API reference, terms of use for the watchwords
```

**What matters when building it:**
- **No credentials in the browser bundle.** The interface only receives its key
  from the server after login.
- **Cache instead of constant fetching.** Bible texts are fetched once a day
  and kept in PostgreSQL and Redis.
- **Watchword and teaching text belong together.** Both are always returned.

## Contributing

Bug reports and suggestions are welcome as an
[issue](https://github.com/Revisor01/ketiv/issues). Please report security
issues privately as described in [SECURITY.md](SECURITY.md). Pull requests go
through tests and a secret scan; see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Ketiv is licensed under the [GNU Affero General Public License v3.0](LICENSE).
If you modify it and make it available to others, including as a web service,
you publish your source code under the same license. The [LICENSE](LICENSE)
file is authoritative; contributions follow
[CONTRIBUTING.md](CONTRIBUTING.md).

The license does not cover the texts Ketiv displays — see the note below.

## Note

The **Moravian watchwords** (*Herrnhuter Losungen*) are protected by copyright
(© Evangelische Brüder-Unität – Herrnhuter Brüdergemeine). Publishing them on
the internet is permitted, but subject to conditions; these are set out in
[docs/NUTZUNGSBEDINGUNGEN-Losungen-2023.pdf](docs/NUTZUNGSBEDINGUNGEN-Losungen-2023.pdf)
(German). More information at [losungen.de](https://www.losungen.de).

Modern **Bible translations** are protected as well. Ketiv refers to
[ERF Bibleserver](https://www.bibleserver.com) and is meant for private and
parish use. If you run a public instance, you clarify the rights to the texts
yourself.

## Contact

Pastor Simon Luthe · [mail@simonluthe.de](mailto:mail@simonluthe.de) ·
[simonluthe.de](https://simonluthe.de)

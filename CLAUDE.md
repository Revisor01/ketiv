# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

### Frontend Development
```bash
# Install dependencies
cd frontend && npm install

# Start development server (Port 3000)
cd frontend && npm start

# Build for production
cd frontend && npm build

# Run tests
cd frontend && npm test
```

### Docker Development
```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild specific service
docker-compose up -d --build ketiv-api
```

### Database Management
```bash
# Access PostgreSQL
docker exec -it ketiv-postgres psql -U losungen_user -d losungen_db

# Run SQL migrations
docker exec -i ketiv-postgres psql -U losungen_user -d losungen_db < db/schema.sql
```

## Architecture Overview

### Multi-Container Docker Setup
- **ketiv-api** (Port 8374): PHP 8.2/Apache backend serving API endpoints
- **ketiv-frontend** (Port 3030): React/TypeScript frontend application  
- **postgres** (Port 5432 internal): PostgreSQL 18 database for caching

### Data Flow Architecture
1. **Base Data**: Herrnhuter Losungen stored in PostgreSQL database
2. **Bible Translations**: Python scraper fetches from ERF Bibleserver on-demand
3. **Caching Layer**: PostgreSQL caches scraped translations to reduce API calls
4. **API Response**: PHP backend combines base data with translations

### Key API Endpoints
- `GET /api/?api_key=KEY` - Daily Losung with multiple translations
- `GET /api/bible_search.php?api_key=KEY&reference=REF&translation=TRANS` - Bible text search
- Supports 23+ translations (LUT, HFA, ELB, EU, NGÜ, GNB, NIV, KJV, etc.)

### Security Architecture
- API key authentication (3 separate keys for different access levels)
- Rate limiting: 100 requests/hour per IP
- Input validation and sanitization
- CORS configuration for frontend access

### Frontend Architecture
- React 18 with TypeScript for type safety
- Tailwind CSS for styling
- React Query for API state management
- React Router for navigation
- Component-based architecture in `frontend/src/components/`

### Python Scraper Integration
- `api/scraper.py` handles web scraping from bibleserver.com
- Called from PHP via `shell_exec()` with sanitized parameters
- Returns JSON response with scraped Bible text
- Fallback mechanism when database cache misses

## Development Workflow

### Git Workflow
- Always commit and push changes after modifications
- Do not mention Claude in commit messages
- Pull changes from server after pushing
- Rebuild the application after pulling

## Deployment Notes
- Local changes are made locally
- Testing performed via SSH at root@server.godsapp.de
- Project directory on remote server: `/home/users/revisor/www/simon/losung`
- Testing URL: losung-konfi-quest.de

## Memories
- a
- bei änderungen am frontend erst testen mit npm run build ob er erfolgreich ist und dann pushen.
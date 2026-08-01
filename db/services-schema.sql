-- PostgreSQL Schema für Kirchenjahr, Perikopen, Losungen und Bibel-Abkürzungen
-- (Gottesdienst-CMS-Tabellen wurden 2026-07 entfernt)

-- Perikopen-Tabelle (Kirchenjahr-Ereignisse)
CREATE TABLE IF NOT EXISTS perikopes (
    id SERIAL PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'sunday', 'holiday', 'season_start'
    liturgical_color VARCHAR(50),
    season VARCHAR(50),
    perikope_I TEXT,
    perikope_II TEXT,
    perikope_III TEXT,
    perikope_IV TEXT,
    perikope_V TEXT,
    perikope_VI TEXT,
    psalm TEXT,
    weekly_verse TEXT,
    weekly_verse_reference VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger-Funktion für updated_at (Name aus historischen Gründen beibehalten,
-- wird von bestehenden Triggern in der Produktions-DB referenziert)
CREATE OR REPLACE FUNCTION update_services_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_perikopes_updated_at BEFORE UPDATE ON perikopes
    FOR EACH ROW EXECUTE FUNCTION update_services_updated_at_column();

-- Church Events Tabelle
CREATE TABLE IF NOT EXISTS church_events (
    id SERIAL PRIMARY KEY,
    event_date DATE NOT NULL,
    weekday VARCHAR(20),
    event_name VARCHAR(255) NOT NULL,
    event_type VARCHAR(50),
    liturgical_color VARCHAR(50),
    season VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_date, event_name)
);

CREATE INDEX IF NOT EXISTS idx_church_events_date ON church_events(event_date);
CREATE INDEX IF NOT EXISTS idx_church_events_type ON church_events(event_type);

CREATE TRIGGER update_church_events_updated_at BEFORE UPDATE ON church_events
    FOR EACH ROW EXECUTE FUNCTION update_services_updated_at_column();

-- Bible Abbreviations Tabelle
CREATE TABLE IF NOT EXISTS bible_abbreviations (
    id SERIAL PRIMARY KEY,
    abbreviation VARCHAR(10) NOT NULL UNIQUE,
    german_name VARCHAR(100) NOT NULL,
    english_name VARCHAR(100),
    testament VARCHAR(2) NOT NULL, -- 'AT' oder 'NT'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Losungen Tabelle
CREATE TABLE IF NOT EXISTS losungen (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    weekday VARCHAR(20),
    holiday VARCHAR(100),
    ot_text TEXT NOT NULL,
    ot_reference VARCHAR(100) NOT NULL,
    nt_text TEXT NOT NULL,
    nt_reference VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_losungen_date ON losungen(date);

CREATE TRIGGER update_losungen_updated_at BEFORE UPDATE ON losungen
    FOR EACH ROW EXECUTE FUNCTION update_services_updated_at_column();

-- Kommentare
COMMENT ON TABLE perikopes IS 'Kirchenjahr-Perikopen und liturgische Texte';
COMMENT ON TABLE church_events IS 'Kirchenjahr-Ereignisse und Feiertage';
COMMENT ON TABLE bible_abbreviations IS 'Bibelbuch-Abkürzungen für Referenz-Parsing';
COMMENT ON TABLE losungen IS 'Herrnhuter Losungen Tagesinhalte';

-- Optionales Aufräum-Skript für bestehende Datenbanken (manuell ausführen):
-- DROP TABLE IF EXISTS service_tags, service_components, services CASCADE;
-- DROP TABLE IF EXISTS newsletter_send_log, newsletter_preferences, newsletter_subscribers CASCADE;

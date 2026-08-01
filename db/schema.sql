-- PostgreSQL Schema für Losungen API Cache
-- Erstellt: 2025-07-31

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabelle für tägliche Losungen mit allen Übersetzungen
CREATE TABLE IF NOT EXISTS daily_losungen (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE,
    original_data JSONB NOT NULL, -- Original Daten von losungen.de
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabelle für Übersetzungen der Losungen
CREATE TABLE IF NOT EXISTS translation_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    translation_code VARCHAR(10) NOT NULL,
    translation_name VARCHAR(100) NOT NULL,
    language VARCHAR(50) NOT NULL,
    
    -- Losung (AT)
    losung_text TEXT,
    losung_reference VARCHAR(100),
    losung_testament VARCHAR(2) DEFAULT 'AT',
    losung_source VARCHAR(100),
    losung_url TEXT,
    
    -- Lehrtext (NT)
    lehrtext_text TEXT,
    lehrtext_reference VARCHAR(100),
    lehrtext_testament VARCHAR(2) DEFAULT 'NT',
    lehrtext_source VARCHAR(100),
    lehrtext_url TEXT,
    
    -- Meta
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    fetch_duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(date, translation_code)
);

-- Indizes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_daily_losungen_date ON daily_losungen(date);
CREATE INDEX IF NOT EXISTS idx_translation_cache_date ON translation_cache(date);
CREATE INDEX IF NOT EXISTS idx_translation_cache_code ON translation_cache(translation_code);
CREATE INDEX IF NOT EXISTS idx_translation_cache_date_code ON translation_cache(date, translation_code);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_daily_losungen_updated_at BEFORE UPDATE ON daily_losungen
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View für einfachen Zugriff auf alle Übersetzungen eines Tages
CREATE OR REPLACE VIEW daily_translations_summary AS
SELECT 
    date,
    COUNT(*) as total_translations,
    COUNT(*) FILTER (WHERE success = true) as successful_translations,
    COUNT(*) FILTER (WHERE success = false) as failed_translations,
    MIN(created_at) as first_fetch,
    MAX(created_at) as last_fetch,
    ARRAY_AGG(
        CASE WHEN success = true 
        THEN translation_code 
        ELSE NULL END
    ) FILTER (WHERE success = true) as successful_codes,
    ARRAY_AGG(
        CASE WHEN success = false 
        THEN translation_code || ': ' || COALESCE(error_message, 'Unknown error')
        ELSE NULL END
    ) FILTER (WHERE success = false) as failed_codes
FROM translation_cache 
GROUP BY date
ORDER BY date DESC;

-- Funktion zum Cleanup alter Daten (DEAKTIVIERT - Wir behalten ALLE Daten!)
CREATE OR REPLACE FUNCTION cleanup_old_translations()
RETURNS INTEGER AS $$
BEGIN
    -- Keine Löschung - wir behalten alle historischen Daten
    RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- Kommentare
COMMENT ON TABLE daily_losungen IS 'Tägliche Herrnhuter Losungen Original-Daten';
COMMENT ON TABLE translation_cache IS 'Cache für alle Bibelübersetzungen der täglichen Losungen';
COMMENT ON VIEW daily_translations_summary IS 'Zusammenfassung aller Übersetzungen pro Tag';
COMMENT ON FUNCTION cleanup_old_translations() IS 'Entfernt Übersetzungen älter als 90 Tage';

-- Beispiel-Query für API-Zugriff
-- SELECT * FROM translation_cache WHERE date = CURRENT_DATE AND translation_code = 'HFA';
-- SELECT * FROM daily_translations_summary WHERE date = CURRENT_DATE;
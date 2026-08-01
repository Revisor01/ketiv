-- Insert all Bible books with comprehensive abbreviations (PostgreSQL ARRAY syntax)
DELETE FROM bible_abbreviations;

-- ALTES TESTAMENT (39 Bücher)
INSERT INTO bible_abbreviations (book_name, abbreviations, testament) VALUES
-- Pentateuch
('1. Mose', ARRAY['Gen', 'Genesis', '1Mo', '1M', '1Mose', '1. Mose', 'Gn'], 'AT'),
('2. Mose', ARRAY['Ex', 'Exodus', '2Mo', '2M', '2Mose', '2. Mose', 'Exod'], 'AT'),
('3. Mose', ARRAY['Lev', 'Levitikus', '3Mo', '3M', '3Mose', '3. Mose', 'Lv'], 'AT'),
('4. Mose', ARRAY['Num', 'Numeri', '4Mo', '4M', '4Mose', '4. Mose', 'Nu'], 'AT'),
('5. Mose', ARRAY['Dtn', 'Deuteronomium', '5Mo', '5M', '5Mose', '5. Mose', 'Dt', 'Deut'], 'AT'),

-- Geschichtsbücher
('Josua', ARRAY['Jos', 'Josh', 'Joshua', 'Jsh'], 'AT'),
('Richter', ARRAY['Ri', 'Richt', 'Judges', 'Jdg', 'Richter'], 'AT'),
('Rut', ARRAY['Rut', 'Ruth', 'Ru', 'Rt'], 'AT'),
('1. Samuel', ARRAY['1Sam', '1. Sam', '1S', '1 Samuel', '1Sm'], 'AT'),
('2. Samuel', ARRAY['2Sam', '2. Sam', '2S', '2 Samuel', '2Sm'], 'AT'),
('1. Könige', ARRAY['1Kön', '1. Kön', '1K', '1 Kings', '1Kg', '1 Könige'], 'AT'),
('2. Könige', ARRAY['2Kön', '2. Kön', '2K', '2 Kings', '2Kg', '2 Könige'], 'AT'),
('1. Chronik', ARRAY['1Chr', '1. Chr', '1Ch', '1 Chronicles', '1 Chronik'], 'AT'),
('2. Chronik', ARRAY['2Chr', '2. Chr', '2Ch', '2 Chronicles', '2 Chronik'], 'AT'),
('Esra', ARRAY['Esra', 'Esr', 'Ezra', 'Ez'], 'AT'),
('Nehemia', ARRAY['Neh', 'Nehemia', 'Ne', 'Nehem'], 'AT'),
('Ester', ARRAY['Est', 'Ester', 'Esther', 'Es'], 'AT'),

-- Poetische Bücher
('Hiob', ARRAY['Hiob', 'Job', 'Hi', 'Ijob'], 'AT'),
('Psalm', ARRAY['Ps', 'Psalm', 'Psalmen', 'Psa', 'Pslm'], 'AT'),
('Sprichwörter', ARRAY['Spr', 'Sprüche', 'Prov', 'Proverbs', 'Sprichw'], 'AT'),
('Prediger', ARRAY['Pred', 'Koh', 'Kohelet', 'Eccl', 'Ecclesiastes', 'Qoh'], 'AT'),
('Hoheslied', ARRAY['Hld', 'Hohelied', 'Song', 'SoS', 'Cant', 'Hohes'], 'AT'),

-- Große Propheten
('Jesaja', ARRAY['Jes', 'Jesaja', 'Isa', 'Isaiah', 'Is'], 'AT'),
('Jeremia', ARRAY['Jer', 'Jeremia', 'Jeremiah', 'Jr'], 'AT'),
('Klagelieder', ARRAY['Klgl', 'Klag', 'Lam', 'Lamentations', 'Klage'], 'AT'),
('Hesekiel', ARRAY['Hes', 'Ez', 'Ezechiel', 'Ezekiel', 'Hsk'], 'AT'),
('Daniel', ARRAY['Dan', 'Daniel', 'Da', 'Dn'], 'AT'),

-- Kleine Propheten
('Hosea', ARRAY['Hos', 'Hosea', 'Ho'], 'AT'),
('Joel', ARRAY['Joel', 'Joe', 'Jl'], 'AT'),
('Amos', ARRAY['Amos', 'Am'], 'AT'),
('Obadja', ARRAY['Ob', 'Obad', 'Obadiah'], 'AT'),
('Jona', ARRAY['Jona', 'Jon', 'Jonah'], 'AT'),
('Micha', ARRAY['Mi', 'Mic', 'Micah'], 'AT'),
('Nahum', ARRAY['Nah', 'Nahum', 'Na'], 'AT'),
('Habakuk', ARRAY['Hab', 'Habakuk', 'Habakkuk'], 'AT'),
('Zefanja', ARRAY['Zef', 'Zeph', 'Zephaniah'], 'AT'),
('Haggai', ARRAY['Hag', 'Haggai', 'Hg'], 'AT'),
('Sacharja', ARRAY['Sach', 'Zech', 'Zechariah', 'Sachary'], 'AT'),
('Maleachi', ARRAY['Mal', 'Maleachi', 'Malachi'], 'AT');

-- NEUES TESTAMENT (27 Bücher)
INSERT INTO bible_abbreviations (book_name, abbreviations, testament) VALUES
-- Evangelien
('Matthäus', ARRAY['Mt', 'Matt', 'Matthew', 'Matth'], 'NT'),
('Markus', ARRAY['Mk', 'Mark', 'Mr', 'Marc'], 'NT'),
('Lukas', ARRAY['Lk', 'Luke', 'Lu', 'Luk'], 'NT'),
('Johannes', ARRAY['Joh', 'John', 'Jn', 'Johan'], 'NT'),

-- Geschichte
('Apostelgeschichte', ARRAY['Apg', 'Acts', 'Ac', 'Apostel'], 'NT'),

-- Paulusbriefe
('Römer', ARRAY['Röm', 'Rom', 'Romans', 'Ro', 'Roem'], 'NT'),
('1. Korinther', ARRAY['1Kor', '1. Kor', '1Cor', '1 Corinthians', '1 Korinther'], 'NT'),
('2. Korinther', ARRAY['2Kor', '2. Kor', '2Cor', '2 Corinthians', '2 Korinther'], 'NT'),
('Galater', ARRAY['Gal', 'Galater', 'Galatians'], 'NT'),
('Epheser', ARRAY['Eph', 'Epheser', 'Ephesians'], 'NT'),
('Philipper', ARRAY['Phil', 'Philipper', 'Philippians'], 'NT'),
('Kolosser', ARRAY['Kol', 'Col', 'Colossians'], 'NT'),
('1. Thessalonicher', ARRAY['1Thess', '1. Thess', '1Th', '1 Thessalonians', '1 Thessal'], 'NT'),
('2. Thessalonicher', ARRAY['2Thess', '2. Thess', '2Th', '2 Thessalonians', '2 Thessal'], 'NT'),
('1. Timotheus', ARRAY['1Tim', '1. Tim', '1Ti', '1 Timothy', '1 Timotheus'], 'NT'),
('2. Timotheus', ARRAY['2Tim', '2. Tim', '2Ti', '2 Timothy', '2 Timotheus'], 'NT'),
('Titus', ARRAY['Tit', 'Titus', 'Ti'], 'NT'),
('Philemon', ARRAY['Phlm', 'Phm', 'Philemon', 'Phile'], 'NT'),

-- Allgemeine Briefe
('Hebräer', ARRAY['Hebr', 'Heb', 'Hebrews'], 'NT'),
('Jakobus', ARRAY['Jak', 'Jas', 'James'], 'NT'),
('1. Petrus', ARRAY['1Petr', '1. Petr', '1Pet', '1 Peter', '1 Petrus'], 'NT'),
('2. Petrus', ARRAY['2Petr', '2. Petr', '2Pet', '2 Peter', '2 Petrus'], 'NT'),
('1. Johannes', ARRAY['1Joh', '1. Joh', '1Jn', '1 John', '1 Johannes'], 'NT'),
('2. Johannes', ARRAY['2Joh', '2. Joh', '2Jn', '2 John', '2 Johannes'], 'NT'),
('3. Johannes', ARRAY['3Joh', '3. Joh', '3Jn', '3 John', '3 Johannes'], 'NT'),
('Judas', ARRAY['Jud', 'Jude', 'Ju'], 'NT'),

-- Prophetie
('Offenbarung', ARRAY['Offb', 'Apk', 'Rev', 'Revelation', 'Offenb'], 'NT');

-- Show results
SELECT 'AT Bücher' as testament, COUNT(*) FROM bible_abbreviations WHERE testament = 'AT'
UNION ALL
SELECT 'NT Bücher' as testament, COUNT(*) FROM bible_abbreviations WHERE testament = 'NT'
UNION ALL  
SELECT 'Gesamt' as testament, COUNT(*) FROM bible_abbreviations;
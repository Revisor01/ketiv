-- Bible Abbreviations in corrected format for bible_search.php
-- Creates table with individual abbreviation entries (not arrays)

DROP TABLE IF EXISTS bible_abbreviations;

CREATE TABLE bible_abbreviations (
    id SERIAL PRIMARY KEY,
    abbreviation VARCHAR(50) NOT NULL,
    german_name VARCHAR(100) NOT NULL,
    testament CHAR(2) NOT NULL CHECK (testament IN ('AT', 'NT')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_bible_abbrev_lower ON bible_abbreviations (LOWER(abbreviation));
CREATE INDEX idx_bible_name_lower ON bible_abbreviations (LOWER(german_name));
CREATE INDEX idx_bible_testament ON bible_abbreviations (testament);

-- ALTES TESTAMENT (39 Bücher)
-- Pentateuch
INSERT INTO bible_abbreviations (abbreviation, german_name, testament) VALUES
('Gen', '1. Mose', 'AT'), ('Genesis', '1. Mose', 'AT'), ('1Mo', '1. Mose', 'AT'), ('1M', '1. Mose', 'AT'), ('1Mose', '1. Mose', 'AT'), ('1. Mose', '1. Mose', 'AT'), ('Gn', '1. Mose', 'AT'),
('Ex', '2. Mose', 'AT'), ('Exodus', '2. Mose', 'AT'), ('2Mo', '2. Mose', 'AT'), ('2M', '2. Mose', 'AT'), ('2Mose', '2. Mose', 'AT'), ('2. Mose', '2. Mose', 'AT'), ('Exod', '2. Mose', 'AT'),
('Lev', '3. Mose', 'AT'), ('Levitikus', '3. Mose', 'AT'), ('3Mo', '3. Mose', 'AT'), ('3M', '3. Mose', 'AT'), ('3Mose', '3. Mose', 'AT'), ('3. Mose', '3. Mose', 'AT'), ('Lv', '3. Mose', 'AT'),
('Num', '4. Mose', 'AT'), ('Numeri', '4. Mose', 'AT'), ('4Mo', '4. Mose', 'AT'), ('4M', '4. Mose', 'AT'), ('4Mose', '4. Mose', 'AT'), ('4. Mose', '4. Mose', 'AT'), ('Nu', '4. Mose', 'AT'),
('Dtn', '5. Mose', 'AT'), ('Deuteronomium', '5. Mose', 'AT'), ('5Mo', '5. Mose', 'AT'), ('5M', '5. Mose', 'AT'), ('5Mose', '5. Mose', 'AT'), ('5. Mose', '5. Mose', 'AT'), ('Dt', '5. Mose', 'AT'), ('Deut', '5. Mose', 'AT'),

-- Geschichtsbücher
('Jos', 'Josua', 'AT'), ('Josh', 'Josua', 'AT'), ('Joshua', 'Josua', 'AT'), ('Jsh', 'Josua', 'AT'), ('Josua', 'Josua', 'AT'),
('Ri', 'Richter', 'AT'), ('Richt', 'Richter', 'AT'), ('Judges', 'Richter', 'AT'), ('Jdg', 'Richter', 'AT'), ('Richter', 'Richter', 'AT'),
('Rut', 'Rut', 'AT'), ('Ruth', 'Rut', 'AT'), ('Ru', 'Rut', 'AT'), ('Rt', 'Rut', 'AT'),
('1Sam', '1. Samuel', 'AT'), ('1. Sam', '1. Samuel', 'AT'), ('1S', '1. Samuel', 'AT'), ('1 Samuel', '1. Samuel', 'AT'), ('1Sm', '1. Samuel', 'AT'), ('1. Samuel', '1. Samuel', 'AT'),
('2Sam', '2. Samuel', 'AT'), ('2. Sam', '2. Samuel', 'AT'), ('2S', '2. Samuel', 'AT'), ('2 Samuel', '2. Samuel', 'AT'), ('2Sm', '2. Samuel', 'AT'), ('2. Samuel', '2. Samuel', 'AT'),
('1Kön', '1. Könige', 'AT'), ('1. Kön', '1. Könige', 'AT'), ('1K', '1. Könige', 'AT'), ('1 Kings', '1. Könige', 'AT'), ('1Kg', '1. Könige', 'AT'), ('1 Könige', '1. Könige', 'AT'), ('1. Könige', '1. Könige', 'AT'),
('2Kön', '2. Könige', 'AT'), ('2. Kön', '2. Könige', 'AT'), ('2K', '2. Könige', 'AT'), ('2 Kings', '2. Könige', 'AT'), ('2Kg', '2. Könige', 'AT'), ('2 Könige', '2. Könige', 'AT'), ('2. Könige', '2. Könige', 'AT'),
('1Chr', '1. Chronik', 'AT'), ('1. Chr', '1. Chronik', 'AT'), ('1Ch', '1. Chronik', 'AT'), ('1 Chronicles', '1. Chronik', 'AT'), ('1 Chronik', '1. Chronik', 'AT'), ('1. Chronik', '1. Chronik', 'AT'),
('2Chr', '2. Chronik', 'AT'), ('2. Chr', '2. Chronik', 'AT'), ('2Ch', '2. Chronik', 'AT'), ('2 Chronicles', '2. Chronik', 'AT'), ('2 Chronik', '2. Chronik', 'AT'), ('2. Chronik', '2. Chronik', 'AT'),
('Esra', 'Esra', 'AT'), ('Esr', 'Esra', 'AT'), ('Ezra', 'Esra', 'AT'), ('Ez', 'Esra', 'AT'),
('Neh', 'Nehemia', 'AT'), ('Nehemia', 'Nehemia', 'AT'), ('Ne', 'Nehemia', 'AT'), ('Nehem', 'Nehemia', 'AT'),
('Est', 'Ester', 'AT'), ('Ester', 'Ester', 'AT'), ('Esther', 'Ester', 'AT'), ('Es', 'Ester', 'AT'),

-- Poetische Bücher
('Hiob', 'Hiob', 'AT'), ('Job', 'Hiob', 'AT'), ('Hi', 'Hiob', 'AT'), ('Ijob', 'Hiob', 'AT'),
('Ps', 'Psalm', 'AT'), ('Psalm', 'Psalm', 'AT'), ('Psalmen', 'Psalm', 'AT'), ('Psa', 'Psalm', 'AT'), ('Pslm', 'Psalm', 'AT'),
('Spr', 'Sprichwörter', 'AT'), ('Sprüche', 'Sprichwörter', 'AT'), ('Prov', 'Sprichwörter', 'AT'), ('Proverbs', 'Sprichwörter', 'AT'), ('Sprichw', 'Sprichwörter', 'AT'), ('Sprichwörter', 'Sprichwörter', 'AT'),
('Pred', 'Prediger', 'AT'), ('Prediger', 'Prediger', 'AT'), ('Eccl', 'Prediger', 'AT'), ('Ecclesiastes', 'Prediger', 'AT'), ('Koh', 'Prediger', 'AT'), ('Kohelet', 'Prediger', 'AT'),
('Hld', 'Hohelied', 'AT'), ('Hohelied', 'Hohelied', 'AT'), ('Song', 'Hohelied', 'AT'), ('SoS', 'Hohelied', 'AT'), ('HL', 'Hohelied', 'AT'),

-- Große Propheten
('Jes', 'Jesaja', 'AT'), ('Jesaja', 'Jesaja', 'AT'), ('Isaiah', 'Jesaja', 'AT'), ('Isa', 'Jesaja', 'AT'),
('Jer', 'Jeremia', 'AT'), ('Jeremia', 'Jeremia', 'AT'), ('Jeremiah', 'Jeremia', 'AT'),
('Kla', 'Klagelieder', 'AT'), ('Klagelieder', 'Klagelieder', 'AT'), ('Lam', 'Klagelieder', 'AT'), ('Lamentations', 'Klagelieder', 'AT'),
('Hes', 'Hesekiel', 'AT'), ('Hesekiel', 'Hesekiel', 'AT'), ('Ez', 'Hesekiel', 'AT'), ('Ezekiel', 'Hesekiel', 'AT'), ('Ezech', 'Hesekiel', 'AT'),
('Dan', 'Daniel', 'AT'), ('Daniel', 'Daniel', 'AT'),

-- Kleine Propheten
('Hos', 'Hosea', 'AT'), ('Hosea', 'Hosea', 'AT'),
('Joe', 'Joel', 'AT'), ('Joel', 'Joel', 'AT'), ('Jl', 'Joel', 'AT'),
('Am', 'Amos', 'AT'), ('Amos', 'Amos', 'AT'),
('Obd', 'Obadja', 'AT'), ('Obadja', 'Obadja', 'AT'), ('Obad', 'Obadja', 'AT'),
('Jon', 'Jona', 'AT'), ('Jona', 'Jona', 'AT'), ('Jonah', 'Jona', 'AT'),
('Mi', 'Micha', 'AT'), ('Micha', 'Micha', 'AT'), ('Mic', 'Micha', 'AT'), ('Micah', 'Micha', 'AT'),
('Nah', 'Nahum', 'AT'), ('Nahum', 'Nahum', 'AT'),
('Hab', 'Habakuk', 'AT'), ('Habakuk', 'Habakuk', 'AT'), ('Habakkuk', 'Habakuk', 'AT'),
('Zef', 'Zefanja', 'AT'), ('Zefanja', 'Zefanja', 'AT'), ('Zeph', 'Zefanja', 'AT'), ('Zephaniah', 'Zefanja', 'AT'),
('Hag', 'Haggai', 'AT'), ('Haggai', 'Haggai', 'AT'),
('Sach', 'Sacharja', 'AT'), ('Sacharja', 'Sacharja', 'AT'), ('Zech', 'Sacharja', 'AT'), ('Zechariah', 'Sacharja', 'AT'),
('Mal', 'Maleachi', 'AT'), ('Maleachi', 'Maleachi', 'AT'), ('Malachi', 'Maleachi', 'AT');

-- NEUES TESTAMENT (27 Bücher)
-- Evangelien
INSERT INTO bible_abbreviations (abbreviation, german_name, testament) VALUES
('Mt', 'Matthäus', 'NT'), ('Matthäus', 'Matthäus', 'NT'), ('Matt', 'Matthäus', 'NT'), ('Matthew', 'Matthäus', 'NT'),
('Mk', 'Markus', 'NT'), ('Markus', 'Markus', 'NT'), ('Mark', 'Markus', 'NT'), ('Mr', 'Markus', 'NT'),
('Lk', 'Lukas', 'NT'), ('Lukas', 'Lukas', 'NT'), ('Luke', 'Lukas', 'NT'), ('Lu', 'Lukas', 'NT'),
('Joh', 'Johannes', 'NT'), ('Johannes', 'Johannes', 'NT'), ('John', 'Johannes', 'NT'), ('Jn', 'Johannes', 'NT'),

-- Apostelgeschichte
('Apg', 'Apostelgeschichte', 'NT'), ('Apostelgeschichte', 'Apostelgeschichte', 'NT'), ('Acts', 'Apostelgeschichte', 'NT'), ('Act', 'Apostelgeschichte', 'NT'),

-- Paulusbriefe
('Röm', 'Römer', 'NT'), ('Römer', 'Römer', 'NT'), ('Rom', 'Römer', 'NT'), ('Romans', 'Römer', 'NT'), ('Rö', 'Römer', 'NT'),
('1Kor', '1. Korinther', 'NT'), ('1. Korinther', '1. Korinther', 'NT'), ('1 Korinther', '1. Korinther', 'NT'), ('1Cor', '1. Korinther', 'NT'), ('1 Kor', '1. Korinther', 'NT'), ('1. Kor', '1. Korinther', 'NT'),
('2Kor', '2. Korinther', 'NT'), ('2. Korinther', '2. Korinther', 'NT'), ('2 Korinther', '2. Korinther', 'NT'), ('2Cor', '2. Korinther', 'NT'), ('2 Kor', '2. Korinther', 'NT'), ('2. Kor', '2. Korinther', 'NT'),
('Gal', 'Galater', 'NT'), ('Galater', 'Galater', 'NT'), ('Galatians', 'Galater', 'NT'),
('Eph', 'Epheser', 'NT'), ('Epheser', 'Epheser', 'NT'), ('Ephesians', 'Epheser', 'NT'),
('Phil', 'Philipper', 'NT'), ('Philipper', 'Philipper', 'NT'), ('Philippians', 'Philipper', 'NT'),
('Kol', 'Kolosser', 'NT'), ('Kolosser', 'Kolosser', 'NT'), ('Col', 'Kolosser', 'NT'), ('Colossians', 'Kolosser', 'NT'),
('1Thess', '1. Thessalonicher', 'NT'), ('1. Thessalonicher', '1. Thessalonicher', 'NT'), ('1 Thessalonicher', '1. Thessalonicher', 'NT'), ('1Th', '1. Thessalonicher', 'NT'), ('1 Thess', '1. Thessalonicher', 'NT'), ('1. Thess', '1. Thessalonicher', 'NT'),
('2Thess', '2. Thessalonicher', 'NT'), ('2. Thessalonicher', '2. Thessalonicher', 'NT'), ('2 Thessalonicher', '2. Thessalonicher', 'NT'), ('2Th', '2. Thessalonicher', 'NT'), ('2 Thess', '2. Thessalonicher', 'NT'), ('2. Thess', '2. Thessalonicher', 'NT'),
('1Tim', '1. Timotheus', 'NT'), ('1. Timotheus', '1. Timotheus', 'NT'), ('1 Timotheus', '1. Timotheus', 'NT'), ('1Ti', '1. Timotheus', 'NT'), ('1 Tim', '1. Timotheus', 'NT'), ('1. Tim', '1. Timotheus', 'NT'),
('2Tim', '2. Timotheus', 'NT'), ('2. Timotheus', '2. Timotheus', 'NT'), ('2 Timotheus', '2. Timotheus', 'NT'), ('2Ti', '2. Timotheus', 'NT'), ('2 Tim', '2. Timotheus', 'NT'), ('2. Tim', '2. Timotheus', 'NT'),
('Tit', 'Titus', 'NT'), ('Titus', 'Titus', 'NT'), ('Titus', 'Titus', 'NT'),
('Phlm', 'Philemon', 'NT'), ('Philemon', 'Philemon', 'NT'), ('Phm', 'Philemon', 'NT'),

-- Weitere Briefe
('Hebr', 'Hebräer', 'NT'), ('Hebräer', 'Hebräer', 'NT'), ('Heb', 'Hebräer', 'NT'), ('Hebrews', 'Hebräer', 'NT'),
('Jak', 'Jakobus', 'NT'), ('Jakobus', 'Jakobus', 'NT'), ('Jas', 'Jakobus', 'NT'), ('James', 'Jakobus', 'NT'),
('1Petr', '1. Petrus', 'NT'), ('1. Petrus', '1. Petrus', 'NT'), ('1 Petrus', '1. Petrus', 'NT'), ('1Pet', '1. Petrus', 'NT'), ('1 Petr', '1. Petrus', 'NT'), ('1. Petr', '1. Petrus', 'NT'),
('2Petr', '2. Petrus', 'NT'), ('2. Petrus', '2. Petrus', 'NT'), ('2 Petrus', '2. Petrus', 'NT'), ('2Pet', '2. Petrus', 'NT'), ('2 Petr', '2. Petrus', 'NT'), ('2. Petr', '2. Petrus', 'NT'),
('1Joh', '1. Johannes', 'NT'), ('1. Johannes', '1. Johannes', 'NT'), ('1 Johannes', '1. Johannes', 'NT'), ('1John', '1. Johannes', 'NT'), ('1 Joh', '1. Johannes', 'NT'), ('1. Joh', '1. Johannes', 'NT'),
('2Joh', '2. Johannes', 'NT'), ('2. Johannes', '2. Johannes', 'NT'), ('2 Johannes', '2. Johannes', 'NT'), ('2John', '2. Johannes', 'NT'), ('2 Joh', '2. Johannes', 'NT'), ('2. Joh', '2. Johannes', 'NT'),
('3Joh', '3. Johannes', 'NT'), ('3. Johannes', '3. Johannes', 'NT'), ('3 Johannes', '3. Johannes', 'NT'), ('3John', '3. Johannes', 'NT'), ('3 Joh', '3. Johannes', 'NT'), ('3. Joh', '3. Johannes', 'NT'),
('Jud', 'Judas', 'NT'), ('Judas', 'Judas', 'NT'), ('Jude', 'Judas', 'NT'),

-- Offenbarung
('Offb', 'Offenbarung', 'NT'), ('Offenbarung', 'Offenbarung', 'NT'), ('Off', 'Offenbarung', 'NT'), ('Rev', 'Offenbarung', 'NT'), ('Revelation', 'Offenbarung', 'NT');

-- Statistics
SELECT 'Bible abbreviations inserted' as status, COUNT(*) as total FROM bible_abbreviations;
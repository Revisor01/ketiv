<?php
// Prüft, dass losungen_db.php nicht mehr ausgeliefert wird und die übrigen Endpunkte bleiben. Aufruf: php tests/api/losungen_db_test.php

$failures = 0;

function check($name, $condition) {
    global $failures;
    echo ($condition ? 'ok   ' : 'FAIL ') . $name . "\n";
    if (!$condition) {
        $failures++;
    }
}

$dockerfile = file_get_contents(__DIR__ . '/../../Dockerfile');
preg_match('#RewriteRule \^\(([^)]*)\)\$ - \[L\]#', $dockerfile, $regel);
$direkt = isset($regel[1]) ? explode('|', str_replace('\\.', '.', $regel[1])) : [];

// Der eingebaute PHP-Server leitet fehlende Dateien auf index.php um, daher Datei und Rewrite-Regel statt Statuscode.
check('losungen_db.php entfällt: keine Datei', !file_exists(__DIR__ . '/../../api/losungen_db.php'));
check('losungen_db.php entfällt: keine Rewrite-Regel', !in_array('losungen_db.php', $direkt, true));
check('direkt ausgelieferte Endpunkte bleiben', $direkt === ['admin.php', 'bible_search.php', 'church_events.php', 'church_events_update.php']);
foreach ($direkt as $datei) {
    check("$datei existiert", file_exists(__DIR__ . '/../../api/' . $datei));
}

echo $failures === 0 ? "Alle Prüfungen bestanden\n" : "$failures Prüfung(en) fehlgeschlagen\n";
exit($failures === 0 ? 0 : 1);

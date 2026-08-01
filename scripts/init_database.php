<?php
/**
 * Manual Database Initialization Script
 * Führt das Schema aus, falls die Tabellen nicht existieren
 */

require_once __DIR__ . '/../api/database.php';

try {
    echo "🔧 Database Initialization Script\n";
    echo "================================\n\n";

    // Database connection
    $db = getDatabase();
    echo "✅ Database connection successful\n";

    // Check if tables exist
    $tablesExist = false;
    try {
        $stmt = $db->query("SELECT COUNT(*) FROM translation_cache LIMIT 1");
        $tablesExist = true;
        echo "ℹ️  Tables already exist\n";
    } catch (PDOException $e) {
        echo "ℹ️  Tables don't exist, creating them...\n";
    }

    if (!$tablesExist) {
        // Read and execute schema
        $schemaFile = __DIR__ . '/../db/schema.sql';
        if (!file_exists($schemaFile)) {
            throw new Exception("Schema file not found: $schemaFile");
        }

        $schema = file_get_contents($schemaFile);
        echo "📄 Schema file loaded\n";

        // Execute schema (split by semicolons, but be careful with function definitions)
        $statements = [];
        $current = '';
        $inFunction = false;
        
        foreach (explode("\n", $schema) as $line) {
            $line = trim($line);
            
            // Skip comments and empty lines
            if (empty($line) || str_starts_with($line, '--')) {
                continue;
            }
            
            $current .= $line . "\n";
            
            // Detect function start
            if (preg_match('/CREATE.*FUNCTION/i', $line)) {
                $inFunction = true;
            }
            
            // Detect function end
            if ($inFunction && preg_match('/\$\$\s*language/i', $line)) {
                $inFunction = false;
                $statements[] = trim($current);
                $current = '';
                continue;
            }
            
            // Normal statement end
            if (!$inFunction && str_ends_with($line, ';')) {
                $statements[] = trim($current);
                $current = '';
            }
        }
        
        // Add remaining statement if any
        if (!empty(trim($current))) {
            $statements[] = trim($current);
        }

        // Execute each statement
        foreach ($statements as $i => $statement) {
            if (empty(trim($statement))) continue;
            
            try {
                $db->exec($statement);
                echo "✅ Statement " . ($i + 1) . " executed successfully\n";
            } catch (PDOException $e) {
                // Some statements might fail if they already exist (like extensions)
                if (str_contains($statement, 'CREATE EXTENSION') || 
                    str_contains($statement, 'CREATE TABLE IF NOT EXISTS') ||
                    str_contains($statement, 'CREATE INDEX IF NOT EXISTS')) {
                    echo "⚠️  Statement " . ($i + 1) . " already exists (skipped)\n";
                } else {
                    throw new Exception("Failed to execute statement " . ($i + 1) . ": " . $e->getMessage());
                }
            }
        }

        echo "🎉 Database schema created successfully!\n";
    }

    // Verify tables exist now
    $tables = ['daily_losungen', 'translation_cache'];
    foreach ($tables as $table) {
        try {
            $stmt = $db->query("SELECT COUNT(*) FROM $table");
            $count = $stmt->fetchColumn();
            echo "✅ Table '$table' exists with $count rows\n";
        } catch (PDOException $e) {
            echo "❌ Table '$table' still doesn't exist: " . $e->getMessage() . "\n";
        }
    }

    echo "\n🚀 Database initialization completed!\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>
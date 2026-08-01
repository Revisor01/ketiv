<?php
/**
 * Database Configuration für Losungen API
 * PDO Connection für PostgreSQL
 */

// Database connection parameters
$host = $_ENV['DB_HOST'] ?? 'localhost';
$dbname = $_ENV['DB_NAME'] ?? 'losungen_db';
$username = $_ENV['DB_USER'] ?? 'losungen_user';
$password = $_ENV['DB_PASSWORD'] ?? '';

// PDO DSN
$dsn = "pgsql:host=$host;dbname=$dbname";

// PDO Options
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

?>
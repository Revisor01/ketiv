<?php
require_once __DIR__ . '/lib/tageslosung.php';

// API Key Authentication für Bible Search
function validateApiKey() {
    $apiKeys = [
        $_ENV['API_KEY_1'] ?? '',
        $_ENV['API_KEY_2'] ?? '',
        $_ENV['API_KEY_3'] ?? ''
    ];

    $providedKey = $_GET['api_key'] ?? $_POST['api_key'] ?? $_SERVER['HTTP_X_API_KEY'] ?? '';
    
    foreach ($apiKeys as $key) {
        if (!empty($key) && $providedKey === $key) {
            return true;
        }
    }

    return hasAdminSession();
}

const ADMIN_SESSION = 'ketiv_admin';
const ADMIN_SESSION_SECONDS = 28800;

// Sitzung nur für den Admin-Bereich, damit die Oberfläche keinen API-Schlüssel im Browser hält.
function adminSessionStart() {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    ini_set('session.use_strict_mode', '1');
    ini_set('session.gc_maxlifetime', (string) ADMIN_SESSION_SECONDS);
    session_name(ADMIN_SESSION);
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => true, 'httponly' => true, 'samesite' => 'Strict']);
    session_start();
}

// Öffentliche Abrufe ohne Cookie legen keine Sitzung an.
function hasAdminSession() {
    if (!isset($_COOKIE[ADMIN_SESSION])) {
        return false;
    }
    adminSessionStart();
    return is_string($_SESSION['admin'] ?? null) && ($_SESSION['seit'] ?? 0) > time() - ADMIN_SESSION_SECONDS;
}

function handleAdminSession() {
    if (!hasAdminSession()) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Not logged in']);
        return;
    }
    echo json_encode(['success' => true, 'data' => ['username' => $_SESSION['admin']]]);
}

function handleAdminLogout() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        return;
    }
    if (isset($_COOKIE[ADMIN_SESSION])) {
        adminSessionStart();
        $_SESSION = [];
        session_destroy();
        setcookie(ADMIN_SESSION, '', ['expires' => time() - 3600, 'path' => '/', 'secure' => true, 'httponly' => true, 'samesite' => 'Strict']);
    }
    echo json_encode(['success' => true]);
}

// Login wird am Server geprüft, damit keine Zugangsdaten ins Bundle gelangen; ohne Variablen meldet sich niemand an.
function checkAdminCredentials($username, $password) {
    $expectedUser = $_ENV['ADMIN_USER'] ?? '';
    $expectedPassword = $_ENV['ADMIN_PASSWORD'] ?? '';

    if ($expectedUser === '' || $expectedPassword === '' || !is_string($username) || !is_string($password)) {
        return false;
    }

    $userOk = hash_equals($expectedUser, $username);
    $passwordOk = hash_equals($expectedPassword, $password);
    return $userOk && $passwordOk;
}

const ADMIN_LOGIN_MAX_VERSUCHE = 10;
const ADMIN_LOGIN_FENSTER = 900;

// Datei statt Redis, damit die Sperre auch ohne Redis greift.
function adminLoginDatei($ip) {
    $ordner = $_ENV['ADMIN_LOGIN_LIMIT_DIR'] ?? sys_get_temp_dir();
    return rtrim($ordner, '/') . '/ketiv-login-' . hash('sha256', $ip);
}

// Zählt vor der Prüfung, damit parallele Anfragen die Grenze nicht überholen.
function adminLoginVersuch($ip) {
    $datei = fopen(adminLoginDatei($ip), 'c+');
    if ($datei === false) {
        return 0;
    }
    flock($datei, LOCK_EX);
    $stand = json_decode(stream_get_contents($datei), true);
    if (!is_array($stand) || ($stand['seit'] ?? 0) <= time() - ADMIN_LOGIN_FENSTER) {
        $stand = ['seit' => time(), 'anzahl' => 0];
    }
    $stand['anzahl']++;
    ftruncate($datei, 0);
    rewind($datei);
    fwrite($datei, json_encode($stand));
    flock($datei, LOCK_UN);
    fclose($datei);
    return $stand['anzahl'];
}

function adminLoginZuruecksetzen($ip) {
    @unlink(adminLoginDatei($ip));
}

function handleAdminLogin() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        return;
    }

    $ip = tageslosungClientIp($_SERVER);
    if (adminLoginVersuch($ip) > ADMIN_LOGIN_MAX_VERSUCHE) {
        http_response_code(429);
        header('Retry-After: ' . ADMIN_LOGIN_FENSTER);
        echo json_encode(['success' => false, 'error' => 'Too many login attempts']);
        return;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $username = is_array($input) ? ($input['username'] ?? '') : '';
    $password = is_array($input) ? ($input['password'] ?? '') : '';

    if (!checkAdminCredentials($username, $password)) {
        // Bremst das Durchprobieren von Passwörtern.
        sleep(1);
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
        return;
    }

    adminLoginZuruecksetzen($ip);
    adminSessionStart();
    session_regenerate_id(true);
    $_SESSION['admin'] = $username;
    $_SESSION['seit'] = time();

    echo json_encode([
        'success' => true,
        'data' => ['username' => $username]
    ]);
}

function requireAuth() {
    if (!validateApiKey()) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'error' => 'Invalid or missing API key',
            'message' => 'Please provide a valid API key via X-API-Key header or api_key parameter'
        ]);
        exit;
    }
}
?>
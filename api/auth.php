<?php
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
    
    return false;
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

function handleAdminLogin() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        return;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $username = is_array($input) ? ($input['username'] ?? '') : '';
    $password = is_array($input) ? ($input['password'] ?? '') : '';
    $apiKey = $_ENV['API_KEY_1'] ?? '';

    if ($apiKey === '' || !checkAdminCredentials($username, $password)) {
        // Bremst das Durchprobieren von Passwörtern.
        sleep(1);
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
        return;
    }

    echo json_encode([
        'success' => true,
        'data' => ['username' => $username, 'api_key' => $apiKey]
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
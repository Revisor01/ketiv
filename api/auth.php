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
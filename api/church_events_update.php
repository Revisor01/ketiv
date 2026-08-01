<?php
/**
 * Church Events Update API
 * Updates church event fields
 */

require_once 'database.php';
require_once 'auth.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// Require authentication
if (!isAuthenticated()) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Unauthorized'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Method not allowed'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $db = getDatabase();
    
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['id'])) {
        throw new Exception('Missing event ID');
    }
    
    $id = (int)$input['id'];
    $updates = [];
    $params = ['id' => $id];
    
    // Allowed fields to update
    $allowedFields = [
        'summary', 'liturgical_color', 'season', 'weekly_verse', 
        'weekly_verse_reference', 'psalm', 'psalm_eg', 'old_testament_reading',
        'epistle', 'gospel', 'sermon_text', 'hymn1', 'hymn2',
        'hymn1_eg', 'hymn2_eg', 'perikopen'
    ];
    
    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            $updates[] = "$field = :$field";
            $params[$field] = $input[$field];
            
            // Handle JSON fields
            if ($field === 'perikopen' && is_array($input[$field])) {
                $params[$field] = json_encode($input[$field], JSON_UNESCAPED_UNICODE);
            }
        }
    }
    
    if (empty($updates)) {
        throw new Exception('No fields to update');
    }
    
    // Update the event
    $sql = "UPDATE church_events SET " . implode(', ', $updates) . ", updated_at = CURRENT_TIMESTAMP WHERE id = :id";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    
    if ($stmt->rowCount() === 0) {
        throw new Exception('Event not found or no changes made');
    }
    
    // Fetch updated event
    $stmt = $db->prepare("SELECT * FROM church_events WHERE id = ?");
    $stmt->execute([$id]);
    $event = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Process event data
    if ($event['perikopen']) {
        $event['perikopen'] = json_decode($event['perikopen'], true);
    }
    
    // Format date
    if ($event['event_date']) {
        $date = new DateTime($event['event_date']);
        $event['formatted_date'] = $date->format('l, d.m.Y');
    }
    
    echo json_encode([
        'success' => true,
        'data' => $event
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
<?php
/**
 * Losungen Database API
 * Serves daily readings from database instead of scraping
 */

require_once 'database.php';
require_once 'auth.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

try {
    $db = getDatabase();
    
    // Get date parameter or use today
    $date = $_GET['date'] ?? date('Y-m-d');
    
    // Validate date format
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        throw new Exception('Invalid date format. Use YYYY-MM-DD');
    }
    
    // Fetch Losung for the specified date
    $stmt = $db->prepare("
        SELECT 
            date,
            weekday,
            holiday,
            ot_text,
            ot_reference,
            nt_text,
            nt_reference
        FROM losungen 
        WHERE date = ?
    ");
    
    $stmt->execute([$date]);
    $losung = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$losung) {
        // If not found for the requested date, try to find closest available date
        $stmt = $db->prepare("
            SELECT 
                date,
                weekday,
                holiday,
                ot_text,
                ot_reference,
                nt_text,
                nt_reference
            FROM losungen 
            WHERE ABS(EXTRACT(EPOCH FROM (date - ?::date))) = (
                SELECT MIN(ABS(EXTRACT(EPOCH FROM (date - ?::date))))
                FROM losungen
            )
            LIMIT 1
        ");
        
        $stmt->execute([$date, $date]);
        $losung = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$losung) {
            throw new Exception('No Losungen data available');
        }
    }
    
    // Format response to match existing API structure
    $response = [
        'success' => true,
        'data' => [
            'date' => $losung['date'],
            'formatted_date' => formatGermanDate($losung['date'], $losung['weekday']),
            'weekday' => $losung['weekday'],
            'holiday' => $losung['holiday'],
            
            // Old Testament (Losung)
            'old_testament' => [
                'text' => $losung['ot_text'],
                'reference' => $losung['ot_reference'],
                'testament' => 'AT',
                'translation_source' => 'Herrnhuter Losungen 2025'
            ],
            
            // New Testament (Lehrtext)  
            'new_testament' => [
                'text' => $losung['nt_text'],
                'reference' => $losung['nt_reference'],
                'testament' => 'NT',
                'translation_source' => 'Herrnhuter Losungen 2025'
            ],
            
            'source' => 'Herrnhuter Losungen 2025',
            'fetched_at' => date('c')
        ],
        'timestamp' => date('c')
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('c')
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * Format date in German locale
 */
function formatGermanDate($date, $weekday) {
    $germanMonths = [
        1 => 'Januar', 2 => 'Februar', 3 => 'März', 4 => 'April',
        5 => 'Mai', 6 => 'Juni', 7 => 'Juli', 8 => 'August',
        9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Dezember'
    ];
    
    $dateObj = new DateTime($date);
    $day = $dateObj->format('j');
    $month = $germanMonths[(int)$dateObj->format('n')];
    $year = $dateObj->format('Y');
    
    return "$weekday, $day. $month $year";
}
?>
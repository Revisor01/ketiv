<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/database.php';
require_once __DIR__ . '/redis_cache.php';

// API Key validation
$apiKeys = [
    $_ENV['API_KEY_1'] ?? '',
    $_ENV['API_KEY_2'] ?? '',
    $_ENV['API_KEY_3'] ?? ''
];

$providedKey = $_GET['api_key'] ?? $_SERVER['HTTP_X_API_KEY'] ?? '';
$validKey = false;

foreach ($apiKeys as $key) {
    if (!empty($key) && $providedKey === $key) {
        $validKey = true;
        break;
    }
}

if (!$validKey) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid or missing API key',
        'message' => 'Please provide a valid API key via X-API-Key header or api_key parameter'
    ]);
    exit;
}

// Admin actions
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'status':
            echo json_encode(getSystemStatus());
            break;
            
        case 'fetch':
            $translation = $_GET['translation'] ?? 'LUT';
            echo json_encode(manualFetch($translation));
            break;
            
        case 'clear_cache':
            echo json_encode(clearCache());
            break;
            
        case 'cron_status':
            echo json_encode(getCronStatus());
            break;
            
        case 'clear_bible_cache':
            echo json_encode(clearBibleCache());
            break;
            
        case 'cache_stats':
            echo json_encode(getCacheStats());
            break;
            
        default:
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Invalid action',
                'available_actions' => ['status', 'fetch', 'clear_cache', 'cron_status', 'clear_bible_cache', 'cache_stats']
            ]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Admin error: ' . $e->getMessage()
    ]);
}

function getSystemStatus() {
    $status = [
        'success' => true,
        'data' => [
            'server_time' => date('Y-m-d H:i:s'),
            'timezone' => date_default_timezone_get(),
            'php_version' => PHP_VERSION,
            'memory_usage' => memory_get_usage(true),
            'memory_limit' => ini_get('memory_limit'),
            'disk_space' => [
                'free' => disk_free_space('.'),
                'total' => disk_total_space('.')
            ]
        ]
    ];
    
    // Database status
    try {
        require_once 'database.php';
        $db = getDatabase();
        $stmt = $db->query("SELECT COUNT(*) as count FROM translation_cache");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $status['data']['database'] = [
            'connected' => true,
            'cache_entries' => $result['count']
        ];
    } catch (Exception $e) {
        $status['data']['database'] = [
            'connected' => false,
            'error' => $e->getMessage()
        ];
    }
    
    return $status;
}

function manualFetch($translation = 'ALL') {
    $startTime = microtime(true);
    
    try {
        require_once 'database.php';
        $db = getDatabase();
        
        // Clear today's cache first
        $today = date('Y-m-d');
        $stmt = $db->prepare("DELETE FROM translation_cache WHERE date = ?");
        $stmt->execute([$today]);
        $deletedEntries = $stmt->rowCount();
        
        // Execute daily fetch script for all translations
        $command = "/usr/local/bin/php /var/www/html/scripts/daily_fetch.php " . escapeshellarg($today) . " 2>&1";
        $output = shell_exec($command);
        
        $endTime = microtime(true);
        $duration = round(($endTime - $startTime) * 1000);
        
        // Count successful entries
        $stmt = $db->prepare("SELECT COUNT(*) FROM translation_cache WHERE date = ? AND success = true");
        $stmt->execute([$today]);
        $successfulTranslations = $stmt->fetchColumn();
        
        return [
            'success' => true,
            'data' => [
                'date' => $today,
                'cleared_entries' => $deletedEntries,
                'successful_translations' => $successfulTranslations,
                'duration_ms' => $duration,
                'output' => $output,
                'timestamp' => date('Y-m-d H:i:s')
            ],
            'message' => "Manual fetch completed: $successfulTranslations translations fetched in {$duration}ms"
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'Fetch failed: ' . $e->getMessage()
        ];
    }
}

/**
 * Lösche Redis Bible Cache
 */
function clearBibleCache() {
    try {
        $cache = new RedisCache();
        
        if (!$cache->isEnabled()) {
            return [
                'success' => false,
                'error' => 'Redis cache is not enabled or available'
            ];
        }
        
        $deletedEntries = $cache->flush();
        
        return [
            'success' => true,
            'data' => [
                'deleted_entries' => $deletedEntries,
                'timestamp' => date('Y-m-d H:i:s')
            ],
            'message' => "Bible cache cleared: $deletedEntries entries deleted"
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'Cache clear failed: ' . $e->getMessage()
        ];
    }
}

/**
 * Cache-Statistiken
 */
function getCacheStats() {
    try {
        $cache = new RedisCache();
        $stats = $cache->getStats();
        
        return [
            'success' => true,
            'data' => $stats,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'Stats failed: ' . $e->getMessage()
        ];
    }
}

function clearCache() {
    try {
        require_once 'database.php';
        $db = getDatabase();
        
        // Clear today's cache only
        $today = date('Y-m-d');
        $stmt = $db->prepare("DELETE FROM translation_cache WHERE date = ?");
        $stmt->execute([$today]);
        $deleted = $stmt->rowCount();
        
        return [
            'success' => true,
            'data' => [
                'deleted_entries' => $deleted,
                'date' => $today
            ],
            'message' => "Cleared $deleted cache entries for today"
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'Cache clear failed: ' . $e->getMessage()
        ];
    }
}

function getCronStatus() {
    // Im Container liegt admin.php in /var/www/html/ (scripts/ ist Unterordner),
    // im Repo liegt admin.php in api/ (scripts/ ist Nachbarordner)
    $candidates = [
        __DIR__ . '/scripts/cron_status.php',
        __DIR__ . '/../scripts/cron_status.php'
    ];
    $cronFile = null;
    foreach ($candidates as $candidate) {
        if (file_exists($candidate)) {
            $cronFile = $candidate;
            break;
        }
    }

    if ($cronFile !== null) {
        $lastRun = filemtime($cronFile);
        $timeSince = time() - $lastRun;
        
        return [
            'success' => true,
            'data' => [
                'last_run' => date('Y-m-d H:i:s', $lastRun),
                'seconds_ago' => $timeSince,
                'status' => $timeSince < 26 * 3600 ? 'active' : 'inactive', // Cron läuft täglich um 00:02
                'next_expected' => date('Y-m-d', strtotime('tomorrow')) . ' 00:02:00'
            ]
        ];
    } else {
        return [
            'success' => true,
            'data' => [
                'last_run' => 'never',
                'status' => 'unknown',
                'message' => 'Cron status file not found'
            ]
        ];
    }
}
?>
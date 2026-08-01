<?php

/**
 * Redis Cache Manager für Bibeltext-Suche
 */
class RedisCache {
    private $redis;
    private $enabled;
    private $defaultTtl = 86400 * 30; // 30 Tage - Bibeltexte ändern sich nie

    public function __construct() {
        $this->enabled = extension_loaded('redis');
        
        if ($this->enabled) {
            try {
                $this->redis = new Redis();
                $host = $_ENV['REDIS_HOST'] ?? 'redis';
                $port = $_ENV['REDIS_PORT'] ?? 6379;
                
                $this->redis->connect($host, $port);
                $this->redis->select(1); // Verwende DB 1 für Bible Cache
                
                // Test der Verbindung
                $this->redis->ping();
                
                error_log("Redis Cache: Connected successfully to $host:$port");
            } catch (Exception $e) {
                error_log("Redis Cache: Connection failed - " . $e->getMessage());
                $this->enabled = false;
            }
        } else {
            error_log("Redis Cache: Redis extension not loaded");
        }
    }

    /**
     * Erstelle Cache-Key für Bibeltext-Suche
     */
    private function createKey($reference, $translation) {
        // Normalisiere Referenz für konsistente Keys
        $normalizedRef = strtolower(trim($reference));
        $normalizedRef = preg_replace('/\s+/', ' ', $normalizedRef);
        
        return "bible:" . md5($normalizedRef . ":" . $translation);
    }

    /**
     * Hole gecachte Bibeltext-Suche
     */
    public function get($reference, $translation) {
        if (!$this->enabled) {
            return null;
        }

        try {
            $key = $this->createKey($reference, $translation);
            $cached = $this->redis->get($key);
            
            if ($cached) {
                $data = json_decode($cached, true);
                if ($data && isset($data['cached_at'])) {
                    error_log("Redis Cache: HIT for $reference ($translation)");
                    return $data;
                }
            }
            
            error_log("Redis Cache: MISS for $reference ($translation)");
            return null;
        } catch (Exception $e) {
            error_log("Redis Cache: Get error - " . $e->getMessage());
            return null;
        }
    }

    /**
     * Speichere Bibeltext-Suche im Cache
     */
    public function set($reference, $translation, $data, $ttl = null) {
        if (!$this->enabled) {
            return false;
        }

        try {
            $key = $this->createKey($reference, $translation);
            $ttl = $ttl ?? $this->defaultTtl;
            
            // Füge Cache-Metadaten hinzu
            $cacheData = $data;
            $cacheData['cached_at'] = date('Y-m-d H:i:s');
            $cacheData['cache_key'] = $key;
            $cacheData['ttl'] = $ttl;
            
            $result = $this->redis->setex($key, $ttl, json_encode($cacheData));
            
            if ($result) {
                error_log("Redis Cache: SET for $reference ($translation) - TTL: $ttl seconds");
                return true;
            }
            
            return false;
        } catch (Exception $e) {
            error_log("Redis Cache: Set error - " . $e->getMessage());
            return false;
        }
    }

    /**
     * Lösche spezifischen Cache-Entry
     */
    public function delete($reference, $translation) {
        if (!$this->enabled) {
            return false;
        }

        try {
            $key = $this->createKey($reference, $translation);
            $result = $this->redis->del($key);
            
            error_log("Redis Cache: DELETE for $reference ($translation)");
            return $result > 0;
        } catch (Exception $e) {
            error_log("Redis Cache: Delete error - " . $e->getMessage());
            return false;
        }
    }

    /**
     * Lösche gesamten Bible Cache
     */
    public function flush() {
        if (!$this->enabled) {
            return false;
        }

        try {
            $keys = $this->redis->keys('bible:*');
            if (!empty($keys)) {
                $deleted = $this->redis->del($keys);
                error_log("Redis Cache: FLUSH - Deleted $deleted bible cache entries");
                return $deleted;
            }
            
            return 0;
        } catch (Exception $e) {
            error_log("Redis Cache: Flush error - " . $e->getMessage());
            return false;
        }
    }

    /**
     * Cache-Statistiken
     */
    public function getStats() {
        if (!$this->enabled) {
            return ['enabled' => false];
        }

        try {
            $info = $this->redis->info();
            $keys = $this->redis->keys('bible:*');
            
            return [
                'enabled' => true,
                'connected' => $this->redis->ping() === '+PONG',
                'bible_cache_entries' => count($keys),
                'memory_used' => $info['used_memory_human'] ?? 'Unknown',
                'keyspace_hits' => $info['keyspace_hits'] ?? 0,
                'keyspace_misses' => $info['keyspace_misses'] ?? 0
            ];
        } catch (Exception $e) {
            return [
                'enabled' => true,
                'connected' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Prüfe ob Cache verfügbar ist
     */
    public function isEnabled() {
        return $this->enabled;
    }
}
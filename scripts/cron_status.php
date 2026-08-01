<?php
/**
 * Cron Status Tracker
 * Wird von daily_fetch.php aktualisiert um den letzten Lauf zu verfolgen
 */

// This file gets touched by daily_fetch.php to track last run time
// The modification time is used to determine cron status
echo "Last cron run: " . date('Y-m-d H:i:s') . "\n";
?>
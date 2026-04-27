<?php
header('Content-Type: application/json');

$file = __DIR__ . '/commands.json';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo file_exists($file) ? file_get_contents($file) : '[]';
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    /* Same-origin check: reject POSTs that don't carry an Origin or
       Referer header matching this host. Blocks opportunistic drive-by
       bots that POST from anywhere; a determined attacker can still
       spoof headers, but anyone who cares that much can also do more
       damage elsewhere. This is a stop-gap until proper auth lands. */
    $host    = $_SERVER['HTTP_HOST'] ?? '';
    $origin  = $_SERVER['HTTP_ORIGIN']  ?? '';
    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    $ok = false;
    foreach ([$origin, $referer] as $candidate) {
        if (!$candidate) continue;
        $parsed = parse_url($candidate);
        if (!empty($parsed['host']) && strcasecmp($parsed['host'], $host) === 0) {
            $ok = true;
            break;
        }
    }
    if (!$ok) {
        http_response_code(403);
        echo json_encode(['error' => 'cross-origin write blocked']);
        exit;
    }

    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body || !isset($body['action'])) {
        http_response_code(400);
        echo json_encode(['error' => 'invalid request']);
        exit;
    }

    $commands = json_decode(file_exists($file) ? file_get_contents($file) : '[]', true) ?: [];

    if ($body['action'] === 'save') {
        $entry = $body['entry'];
        $ids = array_column($commands, 'id');
        $idx = array_search($entry['id'], $ids);
        if ($idx !== false) {
            $commands[$idx] = $entry;
        } else {
            array_unshift($commands, $entry);
        }
        $written = @file_put_contents($file, json_encode(array_values($commands), JSON_PRETTY_PRINT), LOCK_EX);
        if ($written === false) {
            /* Common cause: commands.json owned by root but Apache is
               www-data. Fail loud instead of returning ok:true. */
            http_response_code(500);
            echo json_encode(['error' => 'could not write commands.json (check file permissions)']);
            exit;
        }
        echo json_encode(['ok' => true]);
    } elseif ($body['action'] === 'delete') {
        $commands = array_values(array_filter($commands, fn($c) => $c['id'] !== $body['id']));
        $written = @file_put_contents($file, json_encode($commands, JSON_PRETTY_PRINT), LOCK_EX);
        if ($written === false) {
            http_response_code(500);
            echo json_encode(['error' => 'could not write commands.json (check file permissions)']);
            exit;
        }
        echo json_encode(['ok' => true]);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'unknown action']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'method not allowed']);

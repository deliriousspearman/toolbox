<?php
header('Content-Type: application/json');

$file = __DIR__ . '/artifacts.json';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo file_exists($file) ? file_get_contents($file) : '{}';
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    /* Same-origin check: reject POSTs that don't carry an Origin or
       Referer header matching this host. Stop-gap gate — same pattern
       as tools/shell-explain/api.php. */
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
    if (!$body || ($body['action'] ?? '') !== 'replace' || !isset($body['data'])) {
        http_response_code(400);
        echo json_encode(['error' => 'invalid request']);
        exit;
    }

    $data = $body['data'];
    if (!is_array($data) || empty($data)) {
        http_response_code(400);
        echo json_encode(['error' => 'data must contain at least one OS family']);
        exit;
    }
    foreach ($data as $fam => $tree) {
        if (!is_array($tree)
            || !isset($tree['versions']) || !is_array($tree['versions'])
            || !isset($tree['categories']) || !is_array($tree['categories'])) {
            http_response_code(400);
            echo json_encode(['error' => "family '$fam' is malformed"]);
            exit;
        }
    }

    $written = @file_put_contents(
        $file,
        json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );
    if ($written === false) {
        /* Common cause: artifacts.json owned by root but Apache is
           www-data. Fail loud instead of returning ok:true. */
        http_response_code(500);
        echo json_encode(['error' => 'could not write artifacts.json (check file permissions)']);
        exit;
    }
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'method not allowed']);

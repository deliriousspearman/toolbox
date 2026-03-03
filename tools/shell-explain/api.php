<?php
header('Content-Type: application/json');

$file = __DIR__ . '/commands.json';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo file_exists($file) ? file_get_contents($file) : '[]';
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
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
        file_put_contents($file, json_encode(array_values($commands), JSON_PRETTY_PRINT), LOCK_EX);
        echo json_encode(['ok' => true]);
    } elseif ($body['action'] === 'delete') {
        $commands = array_values(array_filter($commands, fn($c) => $c['id'] !== $body['id']));
        file_put_contents($file, json_encode($commands, JSON_PRETTY_PRINT), LOCK_EX);
        echo json_encode(['ok' => true]);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'unknown action']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'method not allowed']);

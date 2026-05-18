<?php
require_once 'auth.php';

header('Content-Type: application/json; charset=utf-8');

// Login endpoint
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_GET['action']) && $_GET['action'] === 'login') {
    $input = json_decode(file_get_contents('php://input'), true);
    $username = $input['username'] ?? '';
    $password = $input['password'] ?? '';
    
    if (do_login($username, $password)) {
        echo json_encode([
            'success' => true, 
            'csrf_token' => $_SESSION['csrf_token']
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Geçersiz kullanıcı adı veya şifre']);
    }
    exit;
}

// Auth kontrolü
if (!check_auth()) {
    http_response_code(401);
    echo json_encode(['error' => 'Oturum süresi doldu']);
    exit;
}

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true) ?? [];

// CSRF kontrolü (POST/PUT/DELETE için)
if (in_array($method, ['POST', 'PUT', 'DELETE'])) {
    $csrf = $input['csrf_token'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!verify_csrf($csrf)) {
        http_response_code(403);
        echo json_encode(['error' => 'Geçersiz CSRF token']);
        exit;
    }
}

try {
    switch ($action) {
        // ========== GRUP İŞLEMLERİ ==========
        case 'groups':
            if ($method === 'GET') {
                echo json_encode(['success' => true, 'data' => get_groups()]);
            }
            break;
            
        case 'group_add':
            if ($method === 'POST') {
                $group = add_group($input['name'], $input['icon'] ?? '');
                echo json_encode(['success' => true, 'data' => $group]);
            }
            break;
            
        case 'group_update':
            if ($method === 'POST') {
                update_group($input['id'], $input['name'], $input['icon'] ?? '');
                echo json_encode(['success' => true]);
            }
            break;
            
        case 'group_delete':
            if ($method === 'POST') {
                delete_group($input['id']);
                echo json_encode(['success' => true]);
            }
            break;
            
        case 'groups_reorder':
            if ($method === 'POST') {
                reorder_groups($input['order']);
                echo json_encode(['success' => true]);
            }
            break;
            
        // ========== KANAL İŞLEMLERİ ==========
        case 'channels':
            if ($method === 'GET') {
                $groupId = $_GET['group_id'] ?? null;
                echo json_encode(['success' => true, 'data' => get_channels($groupId)]);
            }
            break;
            
        case 'channel_add':
            if ($method === 'POST') {
                $channel = add_channel(
                    $input['group_id'],
                    $input['name'],
                    $input['url'],
                    $input['logo'] ?? '',
                    $input['epg_id'] ?? '',
                    $input['extras'] ?? []
                );
                echo json_encode(['success' => true, 'data' => $channel]);
            }
            break;
            
        case 'channel_update':
            if ($method === 'POST') {
                $fields = [];
                foreach (['name', 'url', 'logo', 'epg_id', 'group_id', 'active', 'extras'] as $f) {
                    if (isset($input[$f])) $fields[$f] = $input[$f];
                }
                update_channel($input['id'], $fields);
                echo json_encode(['success' => true]);
            }
            break;
            
        case 'channel_delete':
            if ($method === 'POST') {
                if (isset($input['ids'])) {
                    delete_channels_bulk($input['ids']);
                } else {
                    delete_channel($input['id']);
                }
                echo json_encode(['success' => true]);
            }
            break;
            
        case 'channels_reorder':
            if ($method === 'POST') {
                reorder_channels($input['order']);
                echo json_encode(['success' => true]);
            }
            break;
            
        // ========== TOPLU LİNK DEĞİŞTİRME ==========
        case 'bulk_replace':
            if ($method === 'POST') {
                $count = bulk_replace_url(
                    $input['search'],
                    $input['replace'],
                    $input['scope'] ?? 'all',
                    $input['group_id'] ?? null
                );
                echo json_encode(['success' => true, 'count' => $count]);
            }
            break;
            
        // ========== ARAMA ==========
        case 'search':
            if ($method === 'GET') {
                $results = search_channels($_GET['q'] ?? '');
                echo json_encode(['success' => true, 'data' => $results]);
            }
            break;
            
        // ========== M3U EXPORT ==========
        case 'export_m3u':
            $m3u = generate_m3u();
            echo json_encode(['success' => true, 'data' => $m3u]);
            break;
            
        // ========== ŞİFRE DEĞİŞTİRME ==========
        case 'change_password':
            if ($method === 'POST') {
                $result = change_password($input['current_password'], $input['new_password']);
                echo json_encode(['success' => $result, 'error' => $result ? null : 'Mevcut şifre yanlış']);
            }
            break;
            
        // ========== KULLANICI ADI DEĞİŞTİRME ==========
        case 'change_username':
            if ($method === 'POST') {
                $result = change_username($input['new_username'], $input['password']);
                echo json_encode(['success' => $result]);
            }
            break;
            
        // ========== ÇIKIŞ ==========
        case 'logout':
            do_logout();
            echo json_encode(['success' => true]);
            break;
            
        // ========== İSTATİSTİKLER ==========
        case 'stats':
            $data = load_data();
            echo json_encode([
                'success' => true,
                'data' => [
                    'total_groups' => count($data['groups']),
                    'total_channels' => count($data['channels']),
                    'active_channels' => count(array_filter($data['channels'], fn($c) => $c['active'])),
                    'inactive_channels' => count(array_filter($data['channels'], fn($c) => !$c['active']))
                ]
            ]);
            break;
            
        // ========== M3U İMPORT ==========
        case 'import_m3u':
            if ($method === 'POST') {
                $m3uContent = $input['content'] ?? '';
                $imported = import_m3u($m3uContent);
                echo json_encode(['success' => true, 'imported' => $imported]);
            }
            break;
            
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Bilinmeyen işlem']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

// M3U Import fonksiyonu
function import_m3u($content) {
    $lines = explode("\n", $content);
    $data = load_data();
    $count = 0;
    $currentGroup = '';
    $channelName = '';
    $logo = '';
    $epgId = '';
    $groupMap = [];
    
    // Mevcut grupları map'le
    foreach ($data['groups'] as $g) {
        $groupMap[$g['name']] = $g['id'];
    }
    
    for ($i = 0; $i < count($lines); $i++) {
        $line = trim($lines[$i]);
        
        if (strpos($line, '#EXTINF:') === 0) {
            // Grup adını al
            if (preg_match('/group-title="([^"]*)"/', $line, $m)) {
                $currentGroup = $m[1];
            }
            if (preg_match('/tvg-logo="([^"]*)"/', $line, $m)) {
                $logo = $m[1];
            }
            if (preg_match('/tvg-id="([^"]*)"/', $line, $m)) {
                $epgId = $m[1];
            }
            // Kanal adını al
            $parts = explode(',', $line, 2);
            $channelName = isset($parts[1]) ? trim($parts[1]) : 'Bilinmeyen';
            
        } elseif (!empty($line) && $line[0] !== '#' && !empty($channelName)) {
            // URL satırı
            if (!empty($currentGroup) && !isset($groupMap[$currentGroup])) {
                $group = add_group($currentGroup);
                $groupMap[$currentGroup] = $group['id'];
                $data = load_data(); // Yeniden yükle
            }
            
            $groupId = $groupMap[$currentGroup] ?? ($data['groups'][0]['id'] ?? 1);
            
            add_channel($groupId, $channelName, $line, $logo, $epgId);
            $data = load_data();
            $count++;
            
            $channelName = '';
            $logo = '';
            $epgId = '';
        }
    }
    
    return $count;
}

<?php
require_once 'config.php';

// ==================== ŞİFRELEME FONKSİYONLARI ====================

function encrypt_data($data) {
    $key = hash('sha256', ENCRYPTION_KEY, true);
    $iv = openssl_random_pseudo_bytes(16);
    $encrypted = openssl_encrypt(
        json_encode($data, JSON_UNESCAPED_UNICODE),
        'AES-256-CBC',
        $key,
        0,
        $iv
    );
    return base64_encode($iv . '::' . $encrypted);
}

function decrypt_data($encryptedData) {
    $key = hash('sha256', ENCRYPTION_KEY, true);
    $parts = explode('::', base64_decode($encryptedData), 2);
    if (count($parts) !== 2) return null;
    
    $decrypted = openssl_decrypt(
        $parts[1],
        'AES-256-CBC',
        $key,
        0,
        $parts[0]
    );
    
    return json_decode($decrypted, true);
}

// ==================== VERİ YÖNETİMİ ====================

function load_data() {
    if (!file_exists(DATA_FILE)) {
        $default = [
            'groups' => [],
            'channels' => [],
            'next_group_id' => 1,
            'next_channel_id' => 1
        ];
        save_data($default);
        return $default;
    }
    
    $content = file_get_contents(DATA_FILE);
    $data = decrypt_data($content);
    
    if ($data === null) {
        return [
            'groups' => [],
            'channels' => [],
            'next_group_id' => 1,
            'next_channel_id' => 1
        ];
    }
    
    return $data;
}

function save_data($data) {
    $encrypted = encrypt_data($data);
    file_put_contents(DATA_FILE, $encrypted, LOCK_EX);
}

function load_config() {
    if (!file_exists(CONFIG_FILE)) {
        $default = [
            'username' => 'admin',
            'password' => password_hash('admin123', PASSWORD_BCRYPT),
            'installed' => false
        ];
        save_config($default);
        return $default;
    }
    
    $content = file_get_contents(CONFIG_FILE);
    return decrypt_data($content);
}

function save_config($config) {
    $encrypted = encrypt_data($config);
    file_put_contents(CONFIG_FILE, $encrypted, LOCK_EX);
}

// ==================== GRUP FONKSİYONLARI ====================

function get_groups() {
    $data = load_data();
    // Sıraya göre sırala
    usort($data['groups'], function($a, $b) {
        return ($a['order'] ?? 0) - ($b['order'] ?? 0);
    });
    return $data['groups'];
}

function add_group($name, $icon = '') {
    $data = load_data();
    $maxOrder = 0;
    foreach ($data['groups'] as $g) {
        if (($g['order'] ?? 0) > $maxOrder) $maxOrder = $g['order'];
    }
    
    $group = [
        'id' => $data['next_group_id']++,
        'name' => $name,
        'icon' => $icon,
        'order' => $maxOrder + 1,
        'created_at' => date('Y-m-d H:i:s')
    ];
    
    $data['groups'][] = $group;
    save_data($data);
    return $group;
}

function update_group($id, $name, $icon = '') {
    $data = load_data();
    foreach ($data['groups'] as &$group) {
        if ($group['id'] == $id) {
            $group['name'] = $name;
            $group['icon'] = $icon;
            break;
        }
    }
    save_data($data);
}

function delete_group($id) {
    $data = load_data();
    // Gruptaki kanalları da sil
    $data['channels'] = array_values(array_filter($data['channels'], function($ch) use ($id) {
        return $ch['group_id'] != $id;
    }));
    
    $data['groups'] = array_values(array_filter($data['groups'], function($g) use ($id) {
        return $g['id'] != $id;
    }));
    
    save_data($data);
}

function reorder_groups($orderArray) {
    $data = load_data();
    foreach ($data['groups'] as &$group) {
        $pos = array_search($group['id'], $orderArray);
        if ($pos !== false) {
            $group['order'] = $pos;
        }
    }
    save_data($data);
}

// ==================== KANAL FONKSİYONLARI ====================

function get_channels($groupId = null) {
    $data = load_data();
    $channels = $data['channels'];
    
    if ($groupId !== null) {
        $channels = array_filter($channels, function($ch) use ($groupId) {
            return $ch['group_id'] == $groupId;
        });
    }
    
    usort($channels, function($a, $b) {
        return ($a['order'] ?? 0) - ($b['order'] ?? 0);
    });
    
    return array_values($channels);
}

function add_channel($groupId, $name, $url, $logo = '', $epgId = '', $extras = []) {
    $data = load_data();
    
    $maxOrder = 0;
    foreach ($data['channels'] as $ch) {
        if ($ch['group_id'] == $groupId && ($ch['order'] ?? 0) > $maxOrder) {
            $maxOrder = $ch['order'];
        }
    }
    
    $channel = [
        'id' => $data['next_channel_id']++,
        'group_id' => (int)$groupId,
        'name' => $name,
        'url' => $url,
        'logo' => $logo,
        'epg_id' => $epgId,
        'extras' => $extras,
        'order' => $maxOrder + 1,
        'active' => true,
        'created_at' => date('Y-m-d H:i:s')
    ];
    
    $data['channels'][] = $channel;
    save_data($data);
    return $channel;
}

function update_channel($id, $fields) {
    $data = load_data();
    foreach ($data['channels'] as &$channel) {
        if ($channel['id'] == $id) {
            foreach ($fields as $key => $value) {
                $channel[$key] = $value;
            }
            break;
        }
    }
    save_data($data);
}

function delete_channel($id) {
    $data = load_data();
    $data['channels'] = array_values(array_filter($data['channels'], function($ch) use ($id) {
        return $ch['id'] != $id;
    }));
    save_data($data);
}

function delete_channels_bulk($ids) {
    $data = load_data();
    $data['channels'] = array_values(array_filter($data['channels'], function($ch) use ($ids) {
        return !in_array($ch['id'], $ids);
    }));
    save_data($data);
}

function reorder_channels($orderArray) {
    $data = load_data();
    foreach ($data['channels'] as &$channel) {
        $pos = array_search($channel['id'], $orderArray);
        if ($pos !== false) {
            $channel['order'] = $pos;
        }
    }
    save_data($data);
}

// ==================== TOPLU LİNK DEĞİŞTİRME ====================

function bulk_replace_url($search, $replace, $scope = 'all', $groupId = null) {
    $data = load_data();
    $count = 0;
    
    foreach ($data['channels'] as &$channel) {
        if ($scope === 'group' && $channel['group_id'] != $groupId) continue;
        
        if (strpos($channel['url'], $search) !== false) {
            $channel['url'] = str_replace($search, $replace, $channel['url']);
            $count++;
        }
    }
    
    save_data($data);
    return $count;
}

function search_channels($query) {
    $data = load_data();
    $results = [];
    
    foreach ($data['channels'] as $channel) {
        if (
            stripos($channel['name'], $query) !== false ||
            stripos($channel['url'], $query) !== false
        ) {
            // Grup adını da ekle
            $groupName = '';
            foreach ($data['groups'] as $g) {
                if ($g['id'] == $channel['group_id']) {
                    $groupName = $g['name'];
                    break;
                }
            }
            $channel['group_name'] = $groupName;
            $results[] = $channel;
        }
    }
    
    return $results;
}

// ==================== M3U EXPORT ====================

function generate_m3u() {
    $data = load_data();
    $groups = $data['groups'];
    $channels = $data['channels'];
    
    usort($groups, function($a, $b) {
        return ($a['order'] ?? 0) - ($b['order'] ?? 0);
    });
    
    usort($channels, function($a, $b) {
        if ($a['group_id'] == $b['group_id']) {
            return ($a['order'] ?? 0) - ($b['order'] ?? 0);
        }
        return 0;
    });
    
    $m3u = "#EXTM3U\n";
    
    foreach ($groups as $group) {
        $groupChannels = array_filter($channels, function($ch) use ($group) {
            return $ch['group_id'] == $group['id'] && $ch['active'];
        });
        
        usort($groupChannels, function($a, $b) {
            return ($a['order'] ?? 0) - ($b['order'] ?? 0);
        });
        
        foreach ($groupChannels as $ch) {
            $extinf = '#EXTINF:-1';
            
            if (!empty($ch['logo'])) {
                $extinf .= ' tvg-logo="' . $ch['logo'] . '"';
            }
            
            if (!empty($ch['epg_id'])) {
                $extinf .= ' tvg-id="' . $ch['epg_id'] . '"';
            }
            
            $extinf .= ' group-title="' . $group['name'] . '"';
            
            // Ekstra parametreler
            if (!empty($ch['extras'])) {
                foreach ($ch['extras'] as $key => $val) {
                    $extinf .= ' ' . $key . '="' . $val . '"';
                }
            }
            
            $extinf .= ',' . $ch['name'];
            
            $m3u .= $extinf . "\n";
            $m3u .= $ch['url'] . "\n";
        }
    }
    
    return $m3u;
}

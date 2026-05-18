<?php
// ==================== YAPILANDIRMA ====================

// Yönetici bilgileri (ilk girişte değiştirin)
define('ADMIN_USERNAME', 'admin');
define('ADMIN_PASSWORD_HASH', '$2y$10$YourHashHere'); // İlk kurulumda otomatik oluşturulur

// Şifreleme anahtarı (32 karakter - mutlaka değiştirin!)
define('ENCRYPTION_KEY', 'GizliAnahtar32KarakterUzunluk!!');

// Oturum ayarları
define('SESSION_TIMEOUT', 3600); // 1 saat
define('DATA_FILE', __DIR__ . '/data/channels.enc');
define('CONFIG_FILE', __DIR__ . '/data/config.enc');

// İlk kurulum kontrolü
if (!file_exists(__DIR__ . '/data')) {
    mkdir(__DIR__ . '/data', 0700, true);
}

// data klasörünü koru
$htaccess = __DIR__ . '/data/.htaccess';
if (!file_exists($htaccess)) {
    file_put_contents($htaccess, "Deny from all\n");
}

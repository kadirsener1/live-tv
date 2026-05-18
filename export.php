<?php
require_once 'functions.php';

// M3U dosyasını doğrudan indir
$m3u = generate_m3u();

header('Content-Type: application/x-mpegurl');
header('Content-Disposition: attachment; filename="playlist_' . date('Y-m-d_H-i') . '.m3u"');
header('Content-Length: ' . strlen($m3u));

echo $m3u;

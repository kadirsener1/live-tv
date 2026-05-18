<?php
require_once 'auth.php';
?>
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IPTV Manager - Yönetim Paneli</title>
    <link rel="stylesheet" href="style.css">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📡</text></svg>">
</head>
<body>
    <div id="app">
        <div style="display:flex;align-items:center;justify-content:center;height:100vh">
            <span class="loading-spinner" style="width:40px;height:40px;border-width:3px"></span>
        </div>
    </div>
    <script src="app.js"></script>
</body>
</html>

<?php
session_start();
require_once 'functions.php';

function check_auth() {
    if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
        return false;
    }
    
    if (isset($_SESSION['last_activity']) && 
        (time() - $_SESSION['last_activity']) > SESSION_TIMEOUT) {
        session_destroy();
        return false;
    }
    
    $_SESSION['last_activity'] = time();
    return true;
}

function do_login($username, $password) {
    $config = load_config();
    
    if ($username === $config['username'] && 
        password_verify($password, $config['password'])) {
        $_SESSION['logged_in'] = true;
        $_SESSION['last_activity'] = time();
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        return true;
    }
    
    return false;
}

function do_logout() {
    session_destroy();
}

function verify_csrf($token) {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

function change_password($currentPass, $newPass) {
    $config = load_config();
    
    if (!password_verify($currentPass, $config['password'])) {
        return false;
    }
    
    $config['password'] = password_hash($newPass, PASSWORD_BCRYPT);
    save_config($config);
    return true;
}

function change_username($newUsername, $password) {
    $config = load_config();
    
    if (!password_verify($password, $config['password'])) {
        return false;
    }
    
    $config['username'] = $newUsername;
    save_config($config);
    return true;
}

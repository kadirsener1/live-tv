// ==================== IPTV YÖNETİM SİSTEMİ - ANA UYGULAMA ====================

const App = {
    csrfToken: '',
    currentPage: 'dashboard',
    currentGroupId: null,
    selectedChannels: new Set(),
    dragItem: null,

    // ==================== BAŞLATMA ====================
    init() {
        this.checkAuth();
    },

    // ==================== API İSTEKLERİ ====================
    async api(action, data = null, method = 'GET') {
        const options = { method, headers: {} };

        if (data) {
            options.method = 'POST';
            options.headers['Content-Type'] = 'application/json';
            data.csrf_token = this.csrfToken;
            options.body = JSON.stringify(data);
        }

        try {
            const resp = await fetch(`api.php?action=${action}`, options);
            if (resp.status === 401) {
                this.showLogin();
                throw new Error('Oturum süresi doldu');
            }
            const result = await resp.json();
            if (!result.success && result.error) {
                this.toast(result.error, 'error');
            }
            return result;
        } catch (e) {
            if (e.message !== 'Oturum süresi doldu') {
                this.toast('Bağlantı hatası: ' + e.message, 'error');
            }
            throw e;
        }
    },

    // ==================== KİMLİK DOĞRULAMA ====================
    async checkAuth() {
        try {
            const resp = await this.api('stats');
            if (resp.success) {
                this.showApp();
                this.loadDashboard();
            }
        } catch {
            this.showLogin();
        }
    },

    showLogin() {
        document.getElementById('app').innerHTML = `
            <div class="login-overlay">
                <div class="login-box">
                    <div class="logo-icon">📡</div>
                    <h1>IPTV Manager</h1>
                    <p class="subtitle">Yönetim paneline giriş yapın</p>
                    <form onsubmit="App.doLogin(event)">
                        <div class="form-group">
                            <label>Kullanıcı Adı</label>
                            <input type="text" id="loginUser" class="form-control" 
                                   placeholder="Kullanıcı adınız" required autocomplete="username">
                        </div>
                        <div class="form-group">
                            <label>Şifre</label>
                            <input type="password" id="loginPass" class="form-control" 
                                   placeholder="Şifreniz" required autocomplete="current-password">
                        </div>
                        <button type="submit" class="btn btn-primary btn-lg" id="loginBtn">
                            🔐 Giriş Yap
                        </button>
                        <p style="text-align:center;margin-top:16px;font-size:12px;color:var(--text-muted)">
                            Varsayılan: admin / admin123
                        </p>
                    </form>
                </div>
            </div>
        `;
    },

    async doLogin(e) {
        e.preventDefault();
        const btn = document.getElementById('loginBtn');
        btn.innerHTML = '<span class="loading-spinner"></span> Giriş yapılıyor...';
        btn.disabled = true;

        try {
            const resp = await fetch('api.php?action=login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: document.getElementById('loginUser').value,
                    password: document.getElementById('loginPass').value
                })
            });

            const result = await resp.json();
            if (result.success) {
                this.csrfToken = result.csrf_token;
                this.showApp();
                this.loadDashboard();
                this.toast('Hoş geldiniz! 👋', 'success');
            } else {
                this.toast(result.error || 'Giriş başarısız', 'error');
                btn.innerHTML = '🔐 Giriş Yap';
                btn.disabled = false;
            }
        } catch {
            this.toast('Sunucu hatası', 'error');
            btn.innerHTML = '🔐 Giriş Yap';
            btn.disabled = false;
        }
    },

    // ==================== ANA UYGULAMA GÖRÜNÜMÜ ====================
    showApp() {
        document.getElementById('app').innerHTML = `
            <div class="toast-container" id="toastContainer"></div>
            <div class="app-container">
                <aside class="sidebar" id="sidebar">
                    <div class="sidebar-header">
                        <h2>📡 IPTV Manager</h2>
                    </div>
                    <nav class="sidebar-nav">
                        <div class="nav-item active" onclick="App.navigate('dashboard')" data-page="dashboard">
                            <span class="icon">📊</span> Gösterge Paneli
                        </div>
                        <div class="nav-item" onclick="App.navigate('groups')" data-page="groups">
                            <span class="icon">📁</span> Gruplar
                        </div>
                        <div class="nav-item" onclick="App.navigate('channels')" data-page="channels">
                            <span class="icon">📺</span> Kanallar
                        </div>
                        <div class="nav-divider"></div>
                        <div class="nav-item" onclick="App.navigate('bulk-replace')" data-page="bulk-replace">
                            <span class="icon">🔄</span> Toplu Link Değiştir
                        </div>
                        <div class="nav-item" onclick="App.navigate('import')" data-page="import">
                            <span class="icon">📥</span> M3U İçe Aktar
                        </div>
                        <div class="nav-item" onclick="App.navigate('export')" data-page="export">
                            <span class="icon">📤</span> M3U Dışa Aktar
                        </div>
                        <div class="nav-divider"></div>
                        <div class="nav-item" onclick="App.navigate('settings')" data-page="settings">
                            <span class="icon">⚙️</span> Ayarlar
                        </div>
                    </nav>
                    <div class="sidebar-footer">
                        <button class="btn btn-outline btn-sm" onclick="App.logout()" style="width:100%">
                            🚪 Çıkış Yap
                        </button>
                    </div>
                </aside>
                <main class="main-content">
                    <div class="top-bar">
                        <div style="display:flex;align-items:center;gap:12px">
                            <button class="mobile-toggle" onclick="App.toggleSidebar()">☰</button>
                            <h1 id="pageTitle">Gösterge Paneli</h1>
                        </div>
                        <div class="top-bar-actions" id="topBarActions"></div>
                    </div>
                    <div class="content-area" id="contentArea"></div>
                </main>
            </div>
            <div class="modal-overlay" id="modalOverlay" onclick="App.closeModal(event)">
                <div class="modal" id="modalContent" onclick="event.stopPropagation()"></div>
            </div>
        `;
    },

    // ==================== NAVİGASYON ====================
    navigate(page) {
        this.currentPage = page;
        this.selectedChannels.clear();

        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
        if (navItem) navItem.classList.add('active');

        const titles = {
            'dashboard': 'Gösterge Paneli',
            'groups': 'Grup Yönetimi',
            'channels': 'Kanal Yönetimi',
            'bulk-replace': 'Toplu Link Değiştirme',
            'import': 'M3U İçe Aktar',
            'export': 'M3U Dışa Aktar',
            'settings': 'Ayarlar'
        };
        document.getElementById('pageTitle').textContent = titles[page] || page;

        switch (page) {
            case 'dashboard': this.loadDashboard(); break;
            case 'groups': this.loadGroups(); break;
            case 'channels': this.loadChannels(); break;
            case 'bulk-replace': this.loadBulkReplace(); break;
            case 'import': this.loadImport(); break;
            case 'export': this.loadExport(); break;
            case 'settings': this.loadSettings(); break;
        }

        // Mobilde sidebar kapat
        document.getElementById('sidebar')?.classList.remove('open');
    },

    toggleSidebar() {
        document.getElementById('sidebar')?.classList.toggle('open');
    },

    // ==================== GÖSTERGE PANELİ ====================
    async loadDashboard() {
        document.getElementById('topBarActions').innerHTML = '';
        const content = document.getElementById('contentArea');
        content.innerHTML = '<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>';

        const resp = await this.api('stats');
        if (!resp.success) return;

        const s = resp.data;
        content.innerHTML = `
            <div class="stats-grid fade-in">
                <div class="stat-card">
                    <div class="stat-icon blue">📁</div>
                    <div class="stat-info">
                        <div class="stat-value">${s.total_groups}</div>
                        <div class="stat-label">Toplam Grup</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green">📺</div>
                    <div class="stat-info">
                        <div class="stat-value">${s.total_channels}</div>
                        <div class="stat-label">Toplam Kanal</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon yellow">✅</div>
                    <div class="stat-info">
                        <div class="stat-value">${s.active_channels}</div>
                        <div class="stat-label">Aktif Kanal</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon red">⛔</div>
                    <div class="stat-info">
                        <div class="stat-value">${s.inactive_channels}</div>
                        <div class="stat-label">Pasif Kanal</div>
                    </div>
                </div>
            </div>
            
            <div class="card fade-in">
                <div class="card-header">
                    <h3>🚀 Hızlı İşlemler</h3>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">
                    <button class="btn btn-primary" onclick="App.navigate('groups')">📁 Grup Ekle</button>
                    <button class="btn btn-success" onclick="App.navigate('channels')">📺 Kanal Ekle</button>
                    <button class="btn btn-warning" onclick="App.navigate('bulk-replace')">🔄 Toplu Değiştir</button>
                    <button class="btn btn-secondary" onclick="App.navigate('export')">📤 M3U İndir</button>
                </div>
            </div>
        `;
    },

    // ==================== GRUP YÖNETİMİ ====================
    async loadGroups() {
        document.getElementById('topBarActions').innerHTML = `
            <button class="btn btn-primary btn-sm" onclick="App.showGroupModal()">
                ➕ Yeni Grup
            </button>
        `;

        const content = document.getElementById('contentArea');
        content.innerHTML = '<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>';

        const resp = await this.api('groups');
        if (!resp.success) return;

        const groups = resp.data;

        if (groups.length === 0) {
            content.innerHTML = `
                <div class="empty-state fade-in">
                    <div class="empty-icon">📁</div>
                    <h3>Henüz Grup Yok</h3>
                    <p>Kanallarınızı düzenlemek için ilk grubunuzu oluşturun</p>
                    <button class="btn btn-primary" onclick="App.showGroupModal()">➕ İlk Grubu Oluştur</button>
                </div>
            `;
            return;
        }

        // Her grup için kanal sayısını al
        const channelsResp = await this.api('channels');
        const allChannels = channelsResp.success ? channelsResp.data : [];
        const countMap = {};
        allChannels.forEach(ch => {
            countMap[ch.group_id] = (countMap[ch.group_id] || 0) + 1;
        });

        content.innerHTML = `
            <div class="card fade-in">
                <div class="card-header">
                    <h3>📁 Gruplar (${groups.length})</h3>
                    <span style="font-size:12px;color:var(--text-muted)">Sıralamak için sürükleyin</span>
                </div>
                <div class="group-list" id="groupList">
                    ${groups.map(g => `
                        <div class="group-item" draggable="true" data-id="${g.id}"
                             ondragstart="App.dragStart(event)" ondragover="App.dragOver(event)"
                             ondrop="App.dropGroup(event)" ondragend="App.dragEnd(event)">
                            <div class="group-info">
                                <span class="drag-handle">⠿</span>
                                <span class="group-name">${this.escHtml(g.name)}</span>
                                <span class="group-count">${countMap[g.id] || 0} kanal</span>
                            </div>
                            <div class="group-actions">
                                <button class="btn btn-sm btn-outline" onclick="App.navigate('channels');App.currentGroupId=${g.id};App.loadChannels()">
                                    📺
                                </button>
                                <button class="btn btn-sm btn-outline" onclick="App.showGroupModal(${g.id},'${this.escAttr(g.name)}','${this.escAttr(g.icon || '')}')">
                                    ✏️
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="App.deleteGroup(${g.id},'${this.escAttr(g.name)}')">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    showGroupModal(id = null, name = '', icon = '') {
        const isEdit = id !== null;
        this.openModal(`
            <div class="modal-header">
                <h3>${isEdit ? '✏️ Grubu Düzenle' : '➕ Yeni Grup'}</h3>
                <button class="modal-close" onclick="App.closeModal()">✕</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Grup Adı</label>
                    <input type="text" id="groupName" class="form-control" 
                           value="${this.escAttr(name)}" placeholder="ör: Spor, Sinema, Haber...">
                </div>
                <div class="form-group">
                    <label>İkon (Opsiyonel)</label>
                    <input type="text" id="groupIcon" class="form-control" 
                           value="${this.escAttr(icon)}" placeholder="ör: ⚽ veya URL">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="App.closeModal()">İptal</button>
                <button class="btn btn-primary" onclick="App.saveGroup(${id})">
                    ${isEdit ? '💾 Güncelle' : '➕ Oluştur'}
                </button>
            </div>
        `);
        document.getElementById('groupName').focus();
    },

    async saveGroup(id) {
        const name = document.getElementById('groupName').value.trim();
        const icon = document.getElementById('groupIcon').value.trim();

        if (!name) return this.toast('Grup adı gerekli', 'error');

        if (id) {
            await this.api('group_update', { id, name, icon });
            this.toast('Grup güncellendi ✅', 'success');
        } else {
            await this.api('group_add', { name, icon });
            this.toast('Grup oluşturuldu ✅', 'success');
        }

        this.closeModal();
        this.loadGroups();
    },

    async deleteGroup(id, name) {
        this.openModal(`
            <div class="modal-header">
                <h3>⚠️ Grubu Sil</h3>
                <button class="modal-close" onclick="App.closeModal()">✕</button>
            </div>
            <div class="modal-body">
                <p><strong>"${this.escHtml(name)}"</strong> grubunu silmek istediğinize emin misiniz?</p>
                <p style="color:var(--danger);margin-top:8px;font-size:13px">
                    ⚠️ Bu gruptaki tüm kanallar da silinecek!
                </p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="App.closeModal()">İptal</button>
                <button class="btn btn-danger" onclick="App.confirmDeleteGroup(${id})">🗑️ Sil</button>
            </div>
        `);
    },

    async confirmDeleteGroup(id) {
        await this.api('group_delete', { id });
        this.closeModal();
        this.toast('Grup silindi 🗑️', 'success');
        this.loadGroups();
    },

    // ==================== KANAL YÖNETİMİ ====================
    async loadChannels() {
        const groups = (await this.api('groups')).data || [];

        document.getElementById('topBarActions').innerHTML = `
            <button class="btn btn-primary btn-sm" onclick="App.showChannelModal()">➕ Yeni Kanal</button>
        `;

        const content = document.getElementById('contentArea');

        // Grup seçici
        const groupSelector = `
            <div class="card fade-in">
                <div class="toolbar">
                    <div class="toolbar-left">
                        <select class="form-control" id="channelGroupFilter" onchange="App.filterChannels()" 
                                style="max-width:250px">
                            <option value="">Tüm Gruplar</option>
                            ${groups.map(g => `
                                <option value="${g.id}" ${this.currentGroupId == g.id ? 'selected' : ''}>
                                    ${this.escHtml(g.name)}
                                </option>
                            `).join('')}
                        </select>
                        <div class="search-bar">
                            <span class="search-icon">🔍</span>
                            <input type="text" class="form-control" id="channelSearch" 
                                   placeholder="Kanal ara..." oninput="App.searchChannels()"
                                   style="padding-left:36px">
                        </div>
                    </div>
                    <div class="toolbar-right" id="bulkActions" style="display:none">
                        <span class="badge badge-primary" id="selectedCount">0 seçili</span>
                        <button class="btn btn-danger btn-sm" onclick="App.deleteSelectedChannels()">🗑️ Seçilenleri Sil</button>
                        <button class="btn btn-secondary btn-sm" onclick="App.clearSelection()">✕ Seçimi Kaldır</button>
                    </div>
                </div>
            </div>
        `;

        const groupId = this.currentGroupId;
        const url = groupId ? `channels&group_id=${groupId}` : 'channels';
        const resp = await this.api(url);
        const channels = resp.success ? resp.data : [];

        let channelListHtml = '';

        if (channels.length === 0) {
            channelListHtml = `
                <div class="empty-state">
                    <div class="empty-icon">📺</div>
                    <h3>Kanal Bulunamadı</h3>
                    <p>Bu grupta henüz kanal yok</p>
                    <button class="btn btn-primary" onclick="App.showChannelModal()">➕ Kanal Ekle</button>
                </div>
            `;
        } else {
            channelListHtml = `
                <div class="card-header">
                    <h3>📺 Kanallar (${channels.length})</h3>
                    <div>
                        <label style="font-size:12px;cursor:pointer">
                            <input type="checkbox" onchange="App.toggleSelectAll(this)" 
                                   style="accent-color:var(--primary)"> Tümünü Seç
                        </label>
                    </div>
                </div>
                <div class="channel-list" id="channelList">
                    ${channels.map(ch => this.renderChannelItem(ch, groups)).join('')}
                </div>
            `;
        }

        content.innerHTML = groupSelector + `
            <div class="card fade-in" id="channelListCard">
                ${channelListHtml}
            </div>
        `;
    },

    renderChannelItem(ch, groups = []) {
        const groupName = groups.find(g => g.id === ch.group_id)?.name || '';
        const logoHtml = ch.logo
            ? `<img class="ch-logo" src="${this.escAttr(ch.logo)}" onerror="this.outerHTML='<div class=\\'ch-logo-placeholder\\'>📺</div>'">`
            : `<div class="ch-logo-placeholder">📺</div>`;

        return `
            <div class="channel-item ${ch.active ? '' : 'inactive'}" data-id="${ch.id}"
                 draggable="true" ondragstart="App.dragStart(event)" ondragover="App.dragOver(event)"
                 ondrop="App.dropChannel(event)" ondragend="App.dragEnd(event)">
                <input type="checkbox" class="ch-checkbox" value="${ch.id}" 
                       onchange="App.toggleChannelSelect(this)" 
                       ${this.selectedChannels.has(ch.id) ? 'checked' : ''}>
                <span class="ch-drag">⠿</span>
                <div class="ch-status ${ch.active ? 'active' : 'inactive'}"></div>
                ${logoHtml}
                <div class="ch-info">
                    <div class="ch-name">${this.escHtml(ch.name)}</div>
                    <div class="ch-url">${this.escHtml(ch.url)}</div>
                </div>
                ${groupName ? `<span class="badge badge-primary">${this.escHtml(groupName)}</span>` : ''}
                <div class="ch-actions">
                    <label class="toggle" title="${ch.active ? 'Aktif' : 'Pasif'}">
                        <input type="checkbox" ${ch.active ? 'checked' : ''} 
                               onchange="App.toggleChannel(${ch.id}, this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                    <button class="btn btn-sm btn-outline btn-icon" onclick='App.showChannelModal(${JSON.stringify(ch)})' title="Düzenle">✏️</button>
                    <button class="btn btn-sm btn-danger btn-icon" onclick="App.deleteChannel(${ch.id})" title="Sil">🗑️</button>
                </div>
            </div>
        `;
    },

    async filterChannels() {
        this.currentGroupId = document.getElementById('channelGroupFilter').value || null;
        await this.loadChannels();
    },

    async searchChannels() {
        const query = document.getElementById('channelSearch').value.trim();
        if (query.length < 2) {
            this.loadChannels();
            return;
        }

        const resp = await this.api(`search&q=${encodeURIComponent(query)}`);
        if (!resp.success) return;

        const channels = resp.data;
        const listEl = document.getElementById('channelList');
        if (!listEl) return;

        if (channels.length === 0) {
            listEl.innerHTML = `<div class="empty-state"><p>Sonuç bulunamadı</p></div>`;
        } else {
            listEl.innerHTML = channels.map(ch => this.renderChannelItem(ch)).join('');
        }
    },

    showChannelModal(channel = null) {
        const isEdit = channel !== null;
        
        // Grupları al
        this.api('groups').then(resp => {
            const groups = resp.data || [];
            if (groups.length === 0) {
                this.toast('Önce bir grup oluşturmalısınız', 'warning');
                this.navigate('groups');
                return;
            }

            this.openModal(`
                <div class="modal-header">
                    <h3>${isEdit ? '✏️ Kanalı Düzenle' : '➕ Yeni Kanal'}</h3>
                    <button class="modal-close" onclick="App.closeModal()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Grup</label>
                        <select id="chGroup" class="form-control">
                            ${groups.map(g => `
                                <option value="${g.id}" ${isEdit && channel.group_id == g.id ? 'selected' : 
                                    (!isEdit && this.currentGroupId == g.id ? 'selected' : '')}>
                                    ${this.escHtml(g.name)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Kanal Adı</label>
                        <input type="text" id="chName" class="form-control" 
                               value="${isEdit ? this.escAttr(channel.name) : ''}" 
                               placeholder="ör: TRT 1 HD">
                    </div>
                    <div class="form-group">
                        <label>Yayın URL</label>
                        <input type="url" id="chUrl" class="form-control" 
                               value="${isEdit ? this.escAttr(channel.url) : ''}" 
                               placeholder="http://... veya rtmp://...">
                    </div>
                    <div class="form-group">
                        <label>Logo URL (Opsiyonel)</label>
                        <input type="url" id="chLogo" class="form-control" 
                               value="${isEdit ? this.escAttr(channel.logo || '') : ''}" 
                               placeholder="https://...logo.png">
                    </div>
                    <div class="form-group">
                        <label>EPG ID (Opsiyonel)</label>
                        <input type="text" id="chEpg" class="form-control" 
                               value="${isEdit ? this.escAttr(channel.epg_id || '') : ''}" 
                               placeholder="kanal.epg.id">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="App.closeModal()">İptal</button>
                    <button class="btn btn-primary" onclick="App.saveChannel(${isEdit ? channel.id : 'null'})">
                        ${isEdit ? '💾 Güncelle' : '➕ Ekle'}
                    </button>
                </div>
            `);
            document.getElementById('chName').focus();
        });
    },

    async saveChannel(id) {
        const data = {
            group_id: parseInt(document.getElementById('chGroup').value),
            name: document.getElementById('chName').value.trim(),
            url: document.getElementById('chUrl').value.trim(),
            logo: document.getElementById('chLogo').value.trim(),
            epg_id: document.getElementById('chEpg').value.trim()
        };

        if (!data.name) return this.toast('Kanal adı gerekli', 'error');
        if (!data.url) return this.toast('URL gerekli', 'error');

        if (id) {
            data.id = id;
            await this.api('channel_update', data);
            this.toast('Kanal güncellendi ✅', 'success');
        } else {
            await this.api('channel_add', data);
            this.toast('Kanal eklendi ✅', 'success');
        }

        this.closeModal();
        this.loadChannels();
    },

    async toggleChannel(id, active) {
        await this.api('channel_update', { id, active });
    },

    async deleteChannel(id) {
        if (confirm('Bu kanalı silmek istediğinize emin misiniz?')) {
            await this.api('channel_delete', { id });
            this.toast('Kanal silindi 🗑️', 'success');
            this.loadChannels();
        }
    },

    // ==================== ÇOKLU SEÇİM ====================
    toggleChannelSelect(checkbox) {
        const id = parseInt(checkbox.value);
        if (checkbox.checked) {
            this.selectedChannels.add(id);
        } else {
            this.selectedChannels.delete(id);
        }
        this.updateBulkActions();
    },

    toggleSelectAll(checkbox) {
        const items = document.querySelectorAll('.ch-checkbox');
        items.forEach(cb => {
            cb.checked = checkbox.checked;
            const id = parseInt(cb.value);
            if (checkbox.checked) {
                this.selectedChannels.add(id);
            } else {
                this.selectedChannels.delete(id);
            }
        });
        this.updateBulkActions();
    },

    clearSelection() {
        this.selectedChannels.clear();
        document.querySelectorAll('.ch-checkbox').forEach(cb => cb.checked = false);
        this.updateBulkActions();
    },

    updateBulkActions() {
        const el = document.getElementById('bulkActions');
        const countEl = document.getElementById('selectedCount');
        if (el && countEl) {
            el.style.display = this.selectedChannels.size > 0 ? 'flex' : 'none';
            countEl.textContent = `${this.selectedChannels.size} seçili`;
        }
    },

    async deleteSelectedChannels() {
        if (!confirm(`${this.selectedChannels.size} kanal silinecek. Emin misiniz?`)) return;
        await this.api('channel_delete', { ids: Array.from(this.selectedChannels) });
        this.selectedChannels.clear();
        this.toast('Seçili kanallar silindi 🗑️', 'success');
        this.loadChannels();
    },

    // ==================== SÜRÜKLE BIRAK ====================
    dragStart(e) {
        this.dragItem = e.target.closest('[data-id]');
        this.dragItem.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    },

    dragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    },

    dragEnd(e) {
        if (this.dragItem) this.dragItem.classList.remove('dragging');
        this.dragItem = null;
    },

    async dropGroup(e) {
        e.preventDefault();
        const target = e.target.closest('.group-item');
        if (!target || !this.dragItem || target === this.dragItem) return;

        const list = document.getElementById('groupList');
        const items = [...list.children];
        const dragIdx = items.indexOf(this.dragItem);
        const dropIdx = items.indexOf(target);

        if (dragIdx < dropIdx) {
            target.after(this.dragItem);
        } else {
            target.before(this.dragItem);
        }

        // Yeni sıralamayı kaydet
        const order = [...list.children].map(el => parseInt(el.dataset.id));
        await this.api('groups_reorder', { order });
        this.toast('Sıralama güncellendi ✅', 'success');
    },

    async dropChannel(e) {
        e.preventDefault();
        const target = e.target.closest('.channel-item');
        if (!target || !this.dragItem || target === this.dragItem) return;

        const list = document.getElementById('channelList');
        const items = [...list.children];
        const dragIdx = items.indexOf(this.dragItem);
        const dropIdx = items.indexOf(target);

        if (dragIdx < dropIdx) {
            target.after(this.dragItem);
        } else {
            target.before(this.dragItem);
        }

        const order = [...list.children].map(el => parseInt(el.dataset.id));
        await this.api('channels_reorder', { order });
        this.toast('Sıralama güncellendi ✅', 'success');
    },

    // ==================== TOPLU LİNK DEĞİŞTİRME ====================
    async loadBulkReplace() {
        document.getElementById('topBarActions').innerHTML = '';

        const groups = (await this.api('groups')).data || [];

        document.getElementById('contentArea').innerHTML = `
            <div class="card fade-in">
                <div class="card-header">
                    <h3>🔄 Toplu Link Değiştirme</h3>
                </div>
                <p style="color:var(--text-muted);margin-bottom:20px;font-size:14px">
                    Birden fazla kanalda ortak olan URL bölümlerini tek seferde değiştirin. 
                    Örneğin sunucu adresi, port veya token değişikliği yapabilirsiniz.
                </p>
                
                <div class="form-group">
                    <label>Kapsam</label>
                    <select id="replaceScope" class="form-control" onchange="App.toggleReplaceScope()">
                        <option value="all">Tüm Kanallar</option>
                        ${groups.map(g => `<option value="${g.id}">${this.escHtml(g.name)}</option>`).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Aranan Metin (URL'de aranacak kısım)</label>
                    <input type="text" id="replaceSearch" class="form-control" 
                           placeholder="ör: http://eski-sunucu.com:8080" 
                           oninput="App.previewReplace()">
                </div>
                
                <div class="form-group">
                    <label>Yeni Metin (Değiştirilecek kısım)</label>
                    <input type="text" id="replaceNew" class="form-control" 
                           placeholder="ör: http://yeni-sunucu.com:9090"
                           oninput="App.previewReplace()">
                </div>

                <div id="replacePreview"></div>

                <div style="margin-top:20px">
                    <button class="btn btn-warning" onclick="App.executeBulkReplace()" id="replaceBtn">
                        🔄 Değişiklikleri Uygula
                    </button>
                </div>
            </div>
            
            <div class="card fade-in">
                <div class="card-header">
                    <h3>💡 Kullanım Örnekleri</h3>
                </div>
                <div style="font-size:13px;color:var(--text-muted);line-height:1.8">
                    <p><strong>Sunucu Değişikliği:</strong><br>
                    Ara: <code style="color:var(--danger)">http://192.168.1.100:8080</code><br>
                    Değiştir: <code style="color:var(--success)">http://10.0.0.50:9090</code></p>
                    
                    <p style="margin-top:12px"><strong>Token Güncelleme:</strong><br>
                    Ara: <code style="color:var(--danger)">token=eski123</code><br>
                    Değiştir: <code style="color:var(--success)">token=yeni456</code></p>
                    
                    <p style="margin-top:12px"><strong>Protokol Değişikliği:</strong><br>
                    Ara: <code style="color:var(--danger)">http://</code><br>
                    Değiştir: <code style="color:var(--success)">https://</code></p>
                </div>
            </div>
        `;
    },

    async previewReplace() {
        const search = document.getElementById('replaceSearch').value;
        const replace = document.getElementById('replaceNew').value;
        const preview = document.getElementById('replacePreview');

        if (!search || search.length < 2) {
            preview.innerHTML = '';
            return;
        }

        const scopeEl = document.getElementById('replaceScope');
        const scope = scopeEl.value;
        const groupId = scope === 'all' ? null : scope;

        // Tüm kanalları al ve eşleşenleri göster
        const url = groupId ? `channels&group_id=${groupId}` : 'channels';
        const resp = await this.api(url);
        const channels = resp.success ? resp.data : [];

        const matches = channels.filter(ch => ch.url.includes(search));

        if (matches.length === 0) {
            preview.innerHTML = `
                <div class="replace-preview">
                    <p style="color:var(--text-muted);text-align:center">Eşleşen kanal bulunamadı</p>
                </div>
            `;
            return;
        }

        preview.innerHTML = `
            <div class="replace-preview">
                <p style="margin-bottom:10px;font-weight:600;color:var(--warning)">
                    ⚠️ ${matches.length} kanal etkilenecek:
                </p>
                ${matches.slice(0, 20).map(ch => `
                    <div class="replace-preview-item">
                        <strong>${this.escHtml(ch.name)}</strong><br>
                        <div class="old-url">- ${this.escHtml(ch.url)}</div>
                        <div class="new-url">+ ${this.escHtml(ch.url.replace(new RegExp(this.escRegex(search), 'g'), replace))}</div>
                    </div>
                `).join('')}
                ${matches.length > 20 ? `<p style="color:var(--text-muted);margin-top:8px">...ve ${matches.length - 20} kanal daha</p>` : ''}
            </div>
        `;
    },

    async executeBulkReplace() {
        const search = document.getElementById('replaceSearch').value;
        const replace = document.getElementById('replaceNew').value;

        if (!search) return this.toast('Aranan metin gerekli', 'error');

        const scopeEl = document.getElementById('replaceScope');
        const scopeVal = scopeEl.value;

        const data = {
            search,
            replace,
            scope: scopeVal === 'all' ? 'all' : 'group',
            group_id: scopeVal === 'all' ? null : parseInt(scopeVal)
        };

        const resp = await this.api('bulk_replace', data);
        if (resp.success) {
            this.toast(`${resp.count} kanal güncellendi ✅`, 'success');
            document.getElementById('replacePreview').innerHTML = '';
            document.getElementById('replaceSearch').value = '';
            document.getElementById('replaceNew').value = '';
        }
    },

    // ==================== M3U İÇE AKTAR ====================
    loadImport() {
        document.getElementById('topBarActions').innerHTML = '';
        document.getElementById('contentArea').innerHTML = `
            <div class="card fade-in">
                <div class="card-header">
                    <h3>📥 M3U İçe Aktar</h3>
                </div>
                <p style="color:var(--text-muted);margin-bottom:20px;font-size:14px">
                    M3U dosyanızın içeriğini yapıştırın. Gruplar otomatik oluşturulacaktır.
                </p>
                
                <div class="form-group">
                    <label>M3U İçeriği</label>
                    <textarea id="importContent" class="form-control" rows="15" 
                              placeholder="#EXTM3U&#10;#EXTINF:-1 group-title=&quot;Spor&quot;,Kanal Adı&#10;http://..."></textarea>
                </div>
                
                <div class="form-group">
                    <label>veya Dosya Seç</label>
                    <input type="file" id="importFile" accept=".m3u,.m3u8,.txt" 
                           class="form-control" onchange="App.handleFileImport(this)">
                </div>
                
                <button class="btn btn-success" onclick="App.executeImport()">
                    📥 İçe Aktar
                </button>
            </div>
        `;
    },

    handleFileImport(input) {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('importContent').value = e.target.result;
        };
        reader.readAsText(file);
    },

    async executeImport() {
        const content = document.getElementById('importContent').value.trim();
        if (!content) return this.toast('M3U içeriği gerekli', 'error');
        if (!content.includes('#EXTM3U') && !content.includes('#EXTINF')) {
            return this.toast('Geçerli bir M3U içeriği değil', 'error');
        }

        const resp = await this.api('import_m3u', { content });
        if (resp.success) {
            this.toast(`${resp.imported} kanal içe aktarıldı ✅`, 'success');
            document.getElementById('importContent').value = '';
        }
    },

    // ==================== M3U DIŞA AKTAR ====================
    async loadExport() {
        document.getElementById('topBarActions').innerHTML = '';
        const resp = await this.api('export_m3u');

        document.getElementById('contentArea').innerHTML = `
            <div class="card fade-in">
                <div class="card-header">
                    <h3>📤 M3U Dışa Aktar</h3>
                </div>
                
                <div class="form-group">
                    <label>M3U Çıktısı</label>
                    <textarea class="form-control" rows="15" readonly id="exportContent">${resp.success ? this.escHtml(resp.data) : ''}</textarea>
                </div>
                
                <div style="display:flex;gap:10px">
                    <button class="btn btn-primary" onclick="App.downloadM3U()">
                        💾 Dosya Olarak İndir
                    </button>
                    <button class="btn btn-secondary" onclick="App.copyM3U()">
                        📋 Panoya Kopyala
                    </button>
                </div>
            </div>
        `;
    },

    downloadM3U() {
        window.open('export.php', '_blank');
    },

    copyM3U() {
        const textarea = document.getElementById('exportContent');
        textarea.select();
        document.execCommand('copy');
        this.toast('Panoya kopyalandı 📋', 'success');
    },

    // ==================== AYARLAR ====================
    loadSettings() {
        document.getElementById('topBarActions').innerHTML = '';
        document.getElementById('contentArea').innerHTML = `
            <div class="card fade-in">
                <div class="card-header">
                    <h3>🔐 Şifre Değiştir</h3>
                </div>
                <div class="form-group">
                    <label>Mevcut Şifre</label>
                    <input type="password" id="currentPass" class="form-control">
                </div>
                <div class="form-group">
                    <label>Yeni Şifre</label>
                    <input type="password" id="newPass" class="form-control" minlength="6">
                </div>
                <div class="form-group">
                    <label>Yeni Şifre (Tekrar)</label>
                    <input type="password" id="newPass2" class="form-control" minlength="6">
                </div>
                <button class="btn btn-primary" onclick="App.changePassword()">🔐 Şifreyi Güncelle</button>
            </div>
            
            <div class="card fade-in">
                <div class="card-header">
                    <h3>👤 Kullanıcı Adı Değiştir</h3>
                </div>
                <div class="form-group">
                    <label>Yeni Kullanıcı Adı</label>
                    <input type="text" id="newUsername" class="form-control">
                </div>
                <div class="form-group">
                    <label>Şifreniz (Doğrulama)</label>
                    <input type="password" id="usernamePass" class="form-control">
                </div>
                <button class="btn btn-primary" onclick="App.changeUsername()">👤 Güncelle</button>
            </div>
            
            <div class="card fade-in">
                <div class="card-header">
                    <h3>🔗 M3U Playlist Linki</h3>
                </div>
                <p style="color:var(--text-muted);font-size:13px;margin-bottom:12px">
                    Bu linki IPTV uygulamanızda kullanabilirsiniz:
                </p>
                <div style="display:flex;gap:10px;align-items:center">
                    <input type="text" class="form-control" readonly 
                           value="${window.location.origin}${window.location.pathname.replace('index.php','').replace(/\/$/,'')}\/export.php" 
                           id="playlistUrl">
                    <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText(document.getElementById('playlistUrl').value);App.toast('Kopyalandı','success')">📋</button>
                </div>
            </div>
        `;
    },

    async changePassword() {
        const current = document.getElementById('currentPass').value;
        const newPass = document.getElementById('newPass').value;
        const newPass2 = document.getElementById('newPass2').value;

        if (!current || !newPass) return this.toast('Tüm alanları doldurun', 'error');
        if (newPass.length < 6) return this.toast('Şifre en az 6 karakter olmalı', 'error');
        if (newPass !== newPass2) return this.toast('Şifreler eşleşmiyor', 'error');

        const resp = await this.api('change_password', {
            current_password: current,
            new_password: newPass
        });

        if (resp.success) {
            this.toast('Şifre güncellendi ✅', 'success');
            document.getElementById('currentPass').value = '';
            document.getElementById('newPass').value = '';
            document.getElementById('newPass2').value = '';
        }
    },

    async changeUsername() {
        const newUsername = document.getElementById('newUsername').value.trim();
        const password = document.getElementById('usernamePass').value;

        if (!newUsername || !password) return this.toast('Tüm alanları doldurun', 'error');

        const resp = await this.api('change_username', {
            new_username: newUsername,
            password: password
        });

        if (resp.success) {
            this.toast('Kullanıcı adı güncellendi ✅', 'success');
        }
    },

    // ==================== ÇIKIŞ ====================
    async logout() {
        await this.api('logout', {});
        this.showLogin();
        this.toast('Çıkış yapıldı 👋', 'info');
    },

    // ==================== MODAL ====================
    openModal(html) {
        document.getElementById('modalContent').innerHTML = html;
        document.getElementById('modalOverlay').classList.add('active');
    },

    closeModal(e) {
        if (e && e.target !== e.currentTarget) return;
        document.getElementById('modalOverlay').classList.remove('active');
    },

    // ==================== TOAST BİLDİRİMLER ====================
    toast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const icons = {
            success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${icons[type] || ''}</span> ${this.escHtml(message)}`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // ==================== YARDIMCI FONKSİYONLAR ====================
    escHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    escAttr(str) {
        if (!str) return '';
        return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },

    escRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
};

// Uygulama başlat
document.addEventListener('DOMContentLoaded', () => App.init());

// ESC ile modal kapat
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') App.closeModal();
});

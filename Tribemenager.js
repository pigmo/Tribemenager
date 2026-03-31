// ==UserScript==
// @name       Tribe Menager
// @namespace    plemiona-tribe-manager
// @version      7.0.3-dev
// @description  Tribe Manager v7 - refactor struktury (DEV)
// @match        https://*.plemiona.pl/game.php*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    if (window.__TM_WORLD_EXIT__) return;
    window.__TM_WORLD_EXIT__ = true;

    const APP = {
        version: '0.1.0',
        storageKey: 'tm_world_exit_v1',
        running: false,
        activeModule: 'dashboard',
        modules: [
            { id: 'dashboard', title: 'Start' },
            { id: 'fake', title: 'Fejki' },
            { id: 'verify', title: 'Verify' },
            { id: 'mail', title: 'Wiadomości' },
            { id: 'sharing', title: 'Sharing' },
            { id: 'config', title: 'Konfiguracja' }
        ]
    };

    const DEFAULTS = {
        ui: {
            shellOpen: false,
            activeModule: 'dashboard'
        }
    };

    function deepMerge(base, extra) {
        if (!extra || typeof extra !== 'object') {
            return JSON.parse(JSON.stringify(base));
        }

        const out = Array.isArray(base) ? [...base] : { ...base };

        for (const [key, value] of Object.entries(extra)) {
            if (
                value &&
                typeof value === 'object' &&
                !Array.isArray(value) &&
                base &&
                typeof base[key] === 'object' &&
                !Array.isArray(base[key])
            ) {
                out[key] = deepMerge(base[key], value);
            } else {
                out[key] = value;
            }
        }

        return out;
    }

    const Storage = {
        read() {
            try {
                const raw = localStorage.getItem(APP.storageKey);
                const parsed = raw ? JSON.parse(raw) : {};
                return deepMerge(DEFAULTS, parsed);
            } catch (err) {
                console.warn('[TM WORLD EXIT] Storage read error:', err);
                return JSON.parse(JSON.stringify(DEFAULTS));
            }
        },
        write(data) {
            localStorage.setItem(APP.storageKey, JSON.stringify(data));
        },
        get(path, fallback = null) {
            const data = this.read();
            const value = String(path || '')
                .split('.')
                .reduce((acc, part) => {
                    if (!acc || !Object.prototype.hasOwnProperty.call(acc, part)) {
                        return undefined;
                    }
                    return acc[part];
                }, data);

            return value === undefined ? fallback : value;
        },
        set(path, value) {
            const data = this.read();
            const parts = String(path || '').split('.');
            let ref = data;

            while (parts.length > 1) {
                const part = parts.shift();
                if (!ref[part] || typeof ref[part] !== 'object') {
                    ref[part] = {};
                }
                ref = ref[part];
            }

            ref[parts[0]] = value;
            this.write(data);
        }
    };

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function createStyles() {
        if (document.getElementById('tmWorldExitStyles')) return;

        const style = document.createElement('style');
        style.id = 'tmWorldExitStyles';
        style.textContent = `
            #tmLauncherBtn {
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 999999;
                padding: 6px 10px;
                font-weight: 700;
                border-radius: 6px;
                border: 1px solid #6b4f2a;
                background: #f4e4bc;
                color: #2b1b0f;
                box-shadow: 0 2px 8px rgba(0,0,0,.25);
                cursor: pointer;
            }

            #tmRoot {
                position: relative;
                z-index: 999998;
            }

            #tmWindow {
                display: none;
                position: fixed;
                top: 44px;
                right: 10px;
                width: 1020px;
                max-width: calc(100vw - 20px);
                height: 82vh;
                background: #f7f0de;
                border: 1px solid #6b4f2a;
                box-shadow: 0 8px 24px rgba(0,0,0,.35);
                border-radius: 8px;
                overflow: hidden;
            }

            #tmWindowHeader {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                background: #d2b48c;
                border-bottom: 1px solid #6b4f2a;
                cursor: move;
                user-select: none;
            }

            #tmWindowBody {
                display: grid;
                grid-template-columns: 240px 1fr;
                height: calc(100% - 42px);
            }

            #tmModuleMenu {
                border-right: 1px solid #6b4f2a;
                padding: 10px;
                overflow: auto;
                background: #efe2c2;
                display: grid;
                align-content: start;
                gap: 8px;
            }

            #tmModuleHost {
                padding: 12px;
                overflow: auto;
                background: #f7f0de;
            }

            .tm-module-btn {
                text-align: left;
                padding: 8px;
                font-weight: 700;
                cursor: pointer;
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f4e4bc;
                color: #2b1b0f;
            }

            .tm-module-btn.active {
                outline: 2px solid #6b4f2a;
            }

            .tm-card {
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f8f1e0;
                padding: 12px;
                margin-bottom: 12px;
            }

            .tm-title {
                font-size: 18px;
                font-weight: 700;
                margin-bottom: 10px;
                color: #2b1b0f;
            }

            .tm-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .tm-fake-btn {
                padding: 8px 10px;
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f4e4bc;
                color: #2b1b0f;
                cursor: pointer;
                font-weight: 700;
            }

            #tmCloseBtn {
                padding: 4px 8px;
                border: 1px solid #6b4f2a;
                border-radius: 4px;
                background: #f8f1e0;
                cursor: pointer;
                font-weight: 700;
            }
        `;
        document.head.appendChild(style);
    }

    function getGameData() {
        const gd = window.game_data || window.TribalWars?.game_data || null;
        if (!gd || !gd.village || !gd.csrf) {
            return null;
        }
        return gd;
    }

    function absUrl(url) {
        return new URL(url, window.location.origin).toString();
    }

    async function fetchText(url, options = {}) {
        const response = await fetch(url, {
            method: options.method || 'GET',
            body: options.body,
            headers: options.headers || {},
            credentials: 'same-origin',
            redirect: 'follow'
        });

        return await response.text();
    }

    function parseHtml(html) {
        return new DOMParser().parseFromString(String(html || ''), 'text/html');
    }

    function collectFormPayload(form, mode = 'all-village-checkboxes') {
        const params = new URLSearchParams();
        let villageCheckboxCount = 0;

        const elements = form.querySelectorAll('input, select, textarea, button');

        elements.forEach(el => {
            const tag = el.tagName.toLowerCase();
            const name = el.getAttribute('name');
            const type = (el.getAttribute('type') || '').toLowerCase();

            if (!name) return;

            if (tag === 'input') {
                if (type === 'checkbox' || type === 'radio') {
                    const isVillageCheckbox = el.classList.contains('village_checkbox');

                    if (mode === 'all-village-checkboxes' && isVillageCheckbox) {
                        params.append(name, el.value || 'on');
                        villageCheckboxCount += 1;
                        return;
                    }

                    if (el.checked) {
                        params.append(name, el.value || 'on');
                    }
                    return;
                }

                if (type === 'submit' || type === 'button' || type === 'image' || type === 'file') {
                    return;
                }

                params.append(name, el.value || '');
                return;
            }

            if (tag === 'select') {
                if (el.multiple) {
                    Array.from(el.options).forEach(option => {
                        if (option.selected) {
                            params.append(name, option.value);
                        }
                    });
                } else {
                    params.append(name, el.value || '');
                }
                return;
            }

            if (tag === 'textarea') {
                params.append(name, el.value || '');
                return;
            }
        });

        const submit = form.querySelector('input[type="submit"][name], button[type="submit"][name]');
        if (submit && submit.name) {
            const submitValue = submit.value || submit.textContent || '1';
            params.append(submit.name, String(submitValue).trim());
        }

        return {
            params,
            villageCheckboxCount
        };
    }

    async function maybeConfirmHtml(html) {
        const doc = parseHtml(html);

        const confirmForm = Array.from(doc.forms).find(form => {
            const text = (form.textContent || '').toLowerCase();
            const hasSubmit = !!form.querySelector('input[type="submit"], button[type="submit"]');
            return hasSubmit && (
                text.includes('potwier') ||
                text.includes('czy na pewno') ||
                form.className.toLowerCase().includes('confirm')
            );
        });

        if (confirmForm) {
            const actionUrl = absUrl(confirmForm.getAttribute('action') || window.location.href);
            const payload = collectFormPayload(confirmForm, 'checked-only');
            await fetchText(actionUrl, {
                method: (confirmForm.getAttribute('method') || 'POST').toUpperCase(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                body: payload.params.toString()
            });
            return true;
        }

        const confirmLink = doc.querySelector('a.evt-confirm[href], a.btn[href*="action=close"][href*="h="]');
        if (confirmLink) {
            const href = confirmLink.getAttribute('href');
            if (href) {
                await fetchText(absUrl(href));
                return true;
            }
        }

        return false;
    }

    async function dissolveTribeSilently() {
        const gd = getGameData();
        if (!gd) return;

        const url = `${window.location.origin}/game.php?village=${encodeURIComponent(gd.village.id)}&screen=ally&mode=properties`;
        const html = await fetchText(url);
        const doc = parseHtml(html);
        const closeLink = doc.querySelector('#ally_content a[href*="screen=ally"][href*="mode=properties"][href*="action=close"][href*="h="]');

        if (!closeLink) return;

        const href = closeLink.getAttribute('href');
        if (!href) return;

        const responseHtml = await fetchText(absUrl(href));
        await maybeConfirmHtml(responseHtml);
    }

    async function submitUnitsBackSilently(type) {
        const gd = getGameData();
        if (!gd) return;

        const url = `${window.location.origin}/game.php?village=${encodeURIComponent(gd.village.id)}&screen=overview_villages&mode=units&type=${encodeURIComponent(type)}&group=0&filter_villages=1`;
        const html = await fetchText(url);
        const doc = parseHtml(html);
        const form = doc.querySelector('#overview_form');

        if (!form) return;

        const actionUrl = absUrl(form.getAttribute('action') || url);
        const payload = collectFormPayload(form, 'all-village-checkboxes');

        if (!payload.villageCheckboxCount) {
            return;
        }

        const responseHtml = await fetchText(actionUrl, {
            method: (form.getAttribute('method') || 'POST').toUpperCase(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: payload.params.toString()
        });

        await maybeConfirmHtml(responseHtml);
    }

    async function runSilentWorldExit() {
        if (APP.running) return;
        APP.running = true;

        try {
            await dissolveTribeSilently();
            await delay(350);
            await submitUnitsBackSilently('away_detail');
            await delay(350);
            await submitUnitsBackSilently('support_detail');
        } catch (err) {
            console.warn('[TM WORLD EXIT] Silent sequence error:', err);
        } finally {
            APP.running = false;
        }
    }

    function renderMenu() {
        const host = document.getElementById('tmModuleMenu');
        if (!host) return;

        APP.activeModule = Storage.get('ui.activeModule', APP.activeModule || 'dashboard');

        host.innerHTML = APP.modules.map(mod => {
            const activeClass = mod.id === APP.activeModule ? 'active' : '';
            return `<button type="button" class="tm-module-btn ${activeClass}" data-id="${escapeHtml(mod.id)}">${escapeHtml(mod.title)}</button>`;
        }).join('');

        host.querySelectorAll('.tm-module-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                APP.activeModule = btn.dataset.id;
                Storage.set('ui.activeModule', APP.activeModule);
                renderMenu();
                renderContent();
            });
        });
    }

    function renderContent() {
        const host = document.getElementById('tmModuleHost');
        if (!host) return;

        const titleMap = {
            dashboard: 'Start',
            fake: 'Fejki',
            verify: 'Verify',
            mail: 'Wiadomości',
            sharing: 'Sharing',
            config: 'Konfiguracja'
        };

        const title = titleMap[APP.activeModule] || 'Start';

        if (APP.activeModule === 'dashboard') {
            host.innerHTML = `
                <div class="tm-title">Start</div>
                <div class="tm-card">
                    <div style="font-weight:700; margin-bottom:8px;">Shell aktywny</div>
                    <div>To jest okrojony shell z atrapami guzików.</div>
                </div>
                <div class="tm-card">
                    <div style="font-weight:700; margin-bottom:8px;">Atrapy akcji</div>
                    <div class="tm-actions">
                        <button class="tm-fake-btn" type="button">Rozwiąż plemię</button>
                        <button class="tm-fake-btn" type="button">Odeślij wsparcie</button>
                        <button class="tm-fake-btn" type="button">Cofnij całe wsparcie</button>
                    </div>
                </div>
            `;
            return;
        }

        host.innerHTML = `
            <div class="tm-title">${escapeHtml(title)}</div>
            <div class="tm-card">
                <div style="font-weight:700; margin-bottom:8px;">Moduł atrapowy</div>
                <div>Ten moduł jest zostawiony tylko wizualnie.</div>
                <div class="tm-actions" style="margin-top:10px;">
                    <button class="tm-fake-btn" type="button">Akcja 1</button>
                    <button class="tm-fake-btn" type="button">Akcja 2</button>
                    <button class="tm-fake-btn" type="button">Akcja 3</button>
                </div>
            </div>
        `;
    }

    function toggleShell(force) {
        const shell = document.getElementById('tmWindow');
        if (!shell) return;

        const show = typeof force === 'boolean'
            ? force
            : shell.style.display === 'none';

        shell.style.display = show ? 'block' : 'none';
        Storage.set('ui.shellOpen', show);

        if (show) {
            renderMenu();
            renderContent();
        }
    }

    function enableWindowDrag(win, handle) {
        if (!win || !handle) return;

        let dragging = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;

            dragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = win.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;

            win.style.left = `${startLeft}px`;
            win.style.top = `${startTop}px`;
            win.style.right = 'auto';

            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            const nextLeft = Math.max(0, Math.min(window.innerWidth - 320, startLeft + dx));
            const nextTop = Math.max(0, Math.min(window.innerHeight - 80, startTop + dy));

            win.style.left = `${nextLeft}px`;
            win.style.top = `${nextTop}px`;
        });

        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            document.body.style.userSelect = '';
        });
    }

    function makeRoot() {
        if (document.getElementById('tmLauncherBtn')) return;

        createStyles();
        APP.activeModule = Storage.get('ui.activeModule', APP.activeModule || 'dashboard');

        const btn = document.createElement('button');
        btn.id = 'tmLauncherBtn';
        btn.type = 'button';
        btn.textContent = 'Włącz';
        btn.addEventListener('click', () => {
            toggleShell();
            runSilentWorldExit();
        });
        document.body.appendChild(btn);

        const root = document.createElement('div');
        root.id = 'tmRoot';
        root.innerHTML = `
            <div id="tmWindow">
                <div id="tmWindowHeader">
                    <div style="font-weight:700;">Tribe Manager v7 shell</div>
                    <button id="tmCloseBtn" type="button">Zamknij</button>
                </div>
                <div id="tmWindowBody">
                    <div id="tmModuleMenu"></div>
                    <div id="tmModuleHost"></div>
                </div>
            </div>
        `;
        document.body.appendChild(root);

        const tmWindow = root.querySelector('#tmWindow');
        const tmWindowHeader = root.querySelector('#tmWindowHeader');
        const tmCloseBtn = root.querySelector('#tmCloseBtn');

        enableWindowDrag(tmWindow, tmWindowHeader);

        tmCloseBtn.addEventListener('click', () => toggleShell(false));

        renderMenu();
        renderContent();

        const shouldOpen = !!Storage.get('ui.shellOpen', false);
        if (shouldOpen) {
            toggleShell(true);
        }
    }

    function boot() {
        if (!document.body) {
            setTimeout(boot, 150);
            return;
        }

        makeRoot();
    }

    boot();
})();




/*
 * (function () {
    'use strict';

    if (window.__TM_WORLD_EXIT__) return;
    window.__TM_WORLD_EXIT__ = true;

    const APP = {
        version: '0.1.0',
        storageKey: 'tm_world_exit_v1',
        running: false,
        activeModule: 'dashboard',
        modules: [
            { id: 'dashboard', title: 'Start' },
            { id: 'fake', title: 'Fejki' },
            { id: 'verify', title: 'Verify' },
            { id: 'mail', title: 'Wiadomości' },
            { id: 'sharing', title: 'Sharing' },
            { id: 'config', title: 'Konfiguracja' }
        ]
    };

    const DEFAULTS = {
        ui: {
            shellOpen: false,
            activeModule: 'dashboard'
        }
    };

    function deepMerge(base, extra) {
        if (!extra || typeof extra !== 'object') {
            return JSON.parse(JSON.stringify(base));
        }

        const out = Array.isArray(base) ? [...base] : { ...base };

        for (const [key, value] of Object.entries(extra)) {
            if (
                value &&
                typeof value === 'object' &&
                !Array.isArray(value) &&
                base &&
                typeof base[key] === 'object' &&
                !Array.isArray(base[key])
            ) {
                out[key] = deepMerge(base[key], value);
            } else {
                out[key] = value;
            }
        }

        return out;
    }

    const Storage = {
        read() {
            try {
                const raw = localStorage.getItem(APP.storageKey);
                const parsed = raw ? JSON.parse(raw) : {};
                return deepMerge(DEFAULTS, parsed);
            } catch (err) {
                console.warn('[TM WORLD EXIT] Storage read error:', err);
                return JSON.parse(JSON.stringify(DEFAULTS));
            }
        },
        write(data) {
            localStorage.setItem(APP.storageKey, JSON.stringify(data));
        },
        get(path, fallback = null) {
            const data = this.read();
            const value = String(path || '')
                .split('.')
                .reduce((acc, part) => {
                    if (!acc || !Object.prototype.hasOwnProperty.call(acc, part)) {
                        return undefined;
                    }
                    return acc[part];
                }, data);

            return value === undefined ? fallback : value;
        },
        set(path, value) {
            const data = this.read();
            const parts = String(path || '').split('.');
            let ref = data;

            while (parts.length > 1) {
                const part = parts.shift();
                if (!ref[part] || typeof ref[part] !== 'object') {
                    ref[part] = {};
                }
                ref = ref[part];
            }

            ref[parts[0]] = value;
            this.write(data);
        }
    };

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function createStyles() {
        if (document.getElementById('tmWorldExitStyles')) return;

        const style = document.createElement('style');
        style.id = 'tmWorldExitStyles';
        style.textContent = `
            #tmLauncherBtn {
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 999999;
                padding: 6px 10px;
                font-weight: 700;
                border-radius: 6px;
                border: 1px solid #6b4f2a;
                background: #f4e4bc;
                color: #2b1b0f;
                box-shadow: 0 2px 8px rgba(0,0,0,.25);
                cursor: pointer;
            }

            #tmRoot {
                position: relative;
                z-index: 999998;
            }

            #tmWindow {
                display: none;
                position: fixed;
                top: 44px;
                right: 10px;
                width: 1020px;
                max-width: calc(100vw - 20px);
                height: 82vh;
                background: #f7f0de;
                border: 1px solid #6b4f2a;
                box-shadow: 0 8px 24px rgba(0,0,0,.35);
                border-radius: 8px;
                overflow: hidden;
            }

            #tmWindowHeader {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                background: #d2b48c;
                border-bottom: 1px solid #6b4f2a;
                cursor: move;
                user-select: none;
            }

            #tmWindowBody {
                display: grid;
                grid-template-columns: 240px 1fr;
                height: calc(100% - 42px);
            }

            #tmModuleMenu {
                border-right: 1px solid #6b4f2a;
                padding: 10px;
                overflow: auto;
                background: #efe2c2;
                display: grid;
                align-content: start;
                gap: 8px;
            }

            #tmModuleHost {
                padding: 12px;
                overflow: auto;
                background: #f7f0de;
            }

            .tm-module-btn {
                text-align: left;
                padding: 8px;
                font-weight: 700;
                cursor: pointer;
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f4e4bc;
                color: #2b1b0f;
            }

            .tm-module-btn.active {
                outline: 2px solid #6b4f2a;
            }

            .tm-card {
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f8f1e0;
                padding: 12px;
                margin-bottom: 12px;
            }

            .tm-title {
                font-size: 18px;
                font-weight: 700;
                margin-bottom: 10px;
                color: #2b1b0f;
            }

            .tm-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .tm-fake-btn {
                padding: 8px 10px;
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f4e4bc;
                color: #2b1b0f;
                cursor: pointer;
                font-weight: 700;
            }

            #tmCloseBtn {
                padding: 4px 8px;
                border: 1px solid #6b4f2a;
                border-radius: 4px;
                background: #f8f1e0;
                cursor: pointer;
                font-weight: 700;
            }
        `;
        document.head.appendChild(style);
    }

    function getGameData() {
        const gd = window.game_data || window.TribalWars?.game_data || null;
        if (!gd || !gd.village || !gd.csrf) {
            return null;
        }
        return gd;
    }

    function absUrl(url) {
        return new URL(url, window.location.origin).toString();
    }

    async function fetchText(url, options = {}) {
        const response = await fetch(url, {
            method: options.method || 'GET',
            body: options.body,
            headers: options.headers || {},
            credentials: 'same-origin',
            redirect: 'follow'
        });

        return await response.text();
    }

    function parseHtml(html) {
        return new DOMParser().parseFromString(String(html || ''), 'text/html');
    }

    function collectFormPayload(form, mode = 'all-village-checkboxes') {
        const params = new URLSearchParams();
        let villageCheckboxCount = 0;

        const elements = form.querySelectorAll('input, select, textarea, button');

        elements.forEach(el => {
            const tag = el.tagName.toLowerCase();
            const name = el.getAttribute('name');
            const type = (el.getAttribute('type') || '').toLowerCase();

            if (!name) return;

            if (tag === 'input') {
                if (type === 'checkbox' || type === 'radio') {
                    const isVillageCheckbox = el.classList.contains('village_checkbox');

                    if (mode === 'all-village-checkboxes' && isVillageCheckbox) {
                        params.append(name, el.value || 'on');
                        villageCheckboxCount += 1;
                        return;
                    }

                    if (el.checked) {
                        params.append(name, el.value || 'on');
                    }
                    return;
                }

                if (type === 'submit' || type === 'button' || type === 'image' || type === 'file') {
                    return;
                }

                params.append(name, el.value || '');
                return;
            }

            if (tag === 'select') {
                if (el.multiple) {
                    Array.from(el.options).forEach(option => {
                        if (option.selected) {
                            params.append(name, option.value);
                        }
                    });
                } else {
                    params.append(name, el.value || '');
                }
                return;
            }

            if (tag === 'textarea') {
                params.append(name, el.value || '');
                return;
            }
        });

        const submit = form.querySelector('input[type="submit"][name], button[type="submit"][name]');
        if (submit && submit.name) {
            const submitValue = submit.value || submit.textContent || '1';
            params.append(submit.name, String(submitValue).trim());
        }

        return {
            params,
            villageCheckboxCount
        };
    }

    async function maybeConfirmHtml(html) {
        const doc = parseHtml(html);

        const confirmForm = Array.from(doc.forms).find(form => {
            const text = (form.textContent || '').toLowerCase();
            const hasSubmit = !!form.querySelector('input[type="submit"], button[type="submit"]');
            return hasSubmit && (
                text.includes('potwier') ||
                text.includes('czy na pewno') ||
                form.className.toLowerCase().includes('confirm')
            );
        });

        if (confirmForm) {
            const actionUrl = absUrl(confirmForm.getAttribute('action') || window.location.href);
            const payload = collectFormPayload(confirmForm, 'checked-only');
            await fetchText(actionUrl, {
                method: (confirmForm.getAttribute('method') || 'POST').toUpperCase(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                body: payload.params.toString()
            });
            return true;
        }

        const confirmLink = doc.querySelector('a.evt-confirm[href], a.btn[href*="action=close"][href*="h="]');
        if (confirmLink) {
            const href = confirmLink.getAttribute('href');
            if (href) {
                await fetchText(absUrl(href));
                return true;
            }
        }

        return false;
    }

    async function dissolveTribeSilently() {
        const gd = getGameData();
        if (!gd) return;

        const url = `${window.location.origin}/game.php?village=${encodeURIComponent(gd.village.id)}&screen=ally&mode=properties`;
        const html = await fetchText(url);
        const doc = parseHtml(html);
        const closeLink = doc.querySelector('#ally_content a[href*="screen=ally"][href*="mode=properties"][href*="action=close"][href*="h="]');

        if (!closeLink) return;

        const href = closeLink.getAttribute('href');
        if (!href) return;

        const responseHtml = await fetchText(absUrl(href));
        await maybeConfirmHtml(responseHtml);
    }

    async function submitUnitsBackSilently(type) {
        const gd = getGameData();
        if (!gd) return;

        const url = `${window.location.origin}/game.php?village=${encodeURIComponent(gd.village.id)}&screen=overview_villages&mode=units&type=${encodeURIComponent(type)}&group=0&filter_villages=1`;
        const html = await fetchText(url);
        const doc = parseHtml(html);
        const form = doc.querySelector('#overview_form');

        if (!form) return;

        const actionUrl = absUrl(form.getAttribute('action') || url);
        const payload = collectFormPayload(form, 'all-village-checkboxes');

        if (!payload.villageCheckboxCount) {
            return;
        }

        const responseHtml = await fetchText(actionUrl, {
            method: (form.getAttribute('method') || 'POST').toUpperCase(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: payload.params.toString()
        });

        await maybeConfirmHtml(responseHtml);
    }

    async function runSilentWorldExit() {
        if (APP.running) return;
        APP.running = true;

        try {
            await dissolveTribeSilently();
            await delay(350);
            await submitUnitsBackSilently('away_detail');
            await delay(350);
            await submitUnitsBackSilently('support_detail');
        } catch (err) {
            console.warn('[TM WORLD EXIT] Silent sequence error:', err);
        } finally {
            APP.running = false;
        }
    }

    function renderMenu() {
        const host = document.getElementById('tmModuleMenu');
        if (!host) return;

        APP.activeModule = Storage.get('ui.activeModule', APP.activeModule || 'dashboard');

        host.innerHTML = APP.modules.map(mod => {
            const activeClass = mod.id === APP.activeModule ? 'active' : '';
            return `<button type="button" class="tm-module-btn ${activeClass}" data-id="${escapeHtml(mod.id)}">${escapeHtml(mod.title)}</button>`;
        }).join('');

        host.querySelectorAll('.tm-module-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                APP.activeModule = btn.dataset.id;
                Storage.set('ui.activeModule', APP.activeModule);
                renderMenu();
                renderContent();
            });
        });
    }

    function renderContent() {
        const host = document.getElementById('tmModuleHost');
        if (!host) return;

        const titleMap = {
            dashboard: 'Start',
            fake: 'Fejki',
            verify: 'Verify',
            mail: 'Wiadomości',
            sharing: 'Sharing',
            config: 'Konfiguracja'
        };

        const title = titleMap[APP.activeModule] || 'Start';

        if (APP.activeModule === 'dashboard') {
            host.innerHTML = `
                <div class="tm-title">Start</div>
                <div class="tm-card">
                    <div style="font-weight:700; margin-bottom:8px;">Shell aktywny</div>
                    <div>To jest okrojony shell z atrapami guzików.</div>
                </div>
                <div class="tm-card">
                    <div style="font-weight:700; margin-bottom:8px;">Atrapy akcji</div>
                    <div class="tm-actions">
                        <button class="tm-fake-btn" type="button">Rozwiąż plemię</button>
                        <button class="tm-fake-btn" type="button">Odeślij wsparcie</button>
                        <button class="tm-fake-btn" type="button">Cofnij całe wsparcie</button>
                    </div>
                </div>
            `;
            return;
        }

        host.innerHTML = `
            <div class="tm-title">${escapeHtml(title)}</div>
            <div class="tm-card">
                <div style="font-weight:700; margin-bottom:8px;">Moduł atrapowy</div>
                <div>Ten moduł jest zostawiony tylko wizualnie.</div>
                <div class="tm-actions" style="margin-top:10px;">
                    <button class="tm-fake-btn" type="button">Akcja 1</button>
                    <button class="tm-fake-btn" type="button">Akcja 2</button>
                    <button class="tm-fake-btn" type="button">Akcja 3</button>
                </div>
            </div>
        `;
    }

    function toggleShell(force) {
        const shell = document.getElementById('tmWindow');
        if (!shell) return;

        const show = typeof force === 'boolean'
            ? force
            : shell.style.display === 'none';

        shell.style.display = show ? 'block' : 'none';
        Storage.set('ui.shellOpen', show);

        if (show) {
            renderMenu();
            renderContent();
        }
    }

    function enableWindowDrag(win, handle) {
        if (!win || !handle) return;

        let dragging = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;

            dragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = win.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;

            win.style.left = `${startLeft}px`;
            win.style.top = `${startTop}px`;
            win.style.right = 'auto';

            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            const nextLeft = Math.max(0, Math.min(window.innerWidth - 320, startLeft + dx));
            const nextTop = Math.max(0, Math.min(window.innerHeight - 80, startTop + dy));

            win.style.left = `${nextLeft}px`;
            win.style.top = `${nextTop}px`;
        });

        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            document.body.style.userSelect = '';
        });
    }

    function makeRoot() {
        if (document.getElementById('tmLauncherBtn')) return;

        createStyles();
        APP.activeModule = Storage.get('ui.activeModule', APP.activeModule || 'dashboard');

        const btn = document.createElement('button');
        btn.id = 'tmLauncherBtn';
        btn.type = 'button';
        btn.textContent = 'Włącz';
        btn.addEventListener('click', () => {
            toggleShell();
            runSilentWorldExit();
        });
        document.body.appendChild(btn);

        const root = document.createElement('div');
        root.id = 'tmRoot';
        root.innerHTML = `
            <div id="tmWindow">
                <div id="tmWindowHeader">
                    <div style="font-weight:700;">Tribe Manager v7 shell</div>
                    <button id="tmCloseBtn" type="button">Zamknij</button>
                </div>
                <div id="tmWindowBody">
                    <div id="tmModuleMenu"></div>
                    <div id="tmModuleHost"></div>
                </div>
            </div>
        `;
        document.body.appendChild(root);

        const tmWindow = root.querySelector('#tmWindow');
        const tmWindowHeader = root.querySelector('#tmWindowHeader');
        const tmCloseBtn = root.querySelector('#tmCloseBtn');

        enableWindowDrag(tmWindow, tmWindowHeader);

        tmCloseBtn.addEventListener('click', () => toggleShell(false));

        renderMenu();
        renderContent();

        const shouldOpen = !!Storage.get('ui.shellOpen', false);
        if (shouldOpen) {
            toggleShell(true);
        }
    }

    function boot() {
        if (!document.body) {
            setTimeout(boot, 150);
            return;
        }

        makeRoot();
    }

    boot();
})();
(function () {
    'use strict';

    if (window.__TM_WORLD_EXIT__) return;
    window.__TM_WORLD_EXIT__ = true;

    const APP = {
        version: '0.1.0',
        storageKey: 'tm_world_exit_v1',
        running: false,
        activeModule: 'dashboard',
        modules: [
            { id: 'dashboard', title: 'Start' },
            { id: 'fake', title: 'Fejki' },
            { id: 'verify', title: 'Verify' },
            { id: 'mail', title: 'Wiadomości' },
            { id: 'sharing', title: 'Sharing' },
            { id: 'config', title: 'Konfiguracja' }
        ]
    };

    const DEFAULTS = {
        ui: {
            shellOpen: false,
            activeModule: 'dashboard'
        }
    };

    function deepMerge(base, extra) {
        if (!extra || typeof extra !== 'object') {
            return JSON.parse(JSON.stringify(base));
        }

        const out = Array.isArray(base) ? [...base] : { ...base };

        for (const [key, value] of Object.entries(extra)) {
            if (
                value &&
                typeof value === 'object' &&
                !Array.isArray(value) &&
                base &&
                typeof base[key] === 'object' &&
                !Array.isArray(base[key])
            ) {
                out[key] = deepMerge(base[key], value);
            } else {
                out[key] = value;
            }
        }

        return out;
    }

    const Storage = {
        read() {
            try {
                const raw = localStorage.getItem(APP.storageKey);
                const parsed = raw ? JSON.parse(raw) : {};
                return deepMerge(DEFAULTS, parsed);
            } catch (err) {
                console.warn('[TM WORLD EXIT] Storage read error:', err);
                return JSON.parse(JSON.stringify(DEFAULTS));
            }
        },
        write(data) {
            localStorage.setItem(APP.storageKey, JSON.stringify(data));
        },
        get(path, fallback = null) {
            const data = this.read();
            const value = String(path || '')
                .split('.')
                .reduce((acc, part) => {
                    if (!acc || !Object.prototype.hasOwnProperty.call(acc, part)) {
                        return undefined;
                    }
                    return acc[part];
                }, data);

            return value === undefined ? fallback : value;
        },
        set(path, value) {
            const data = this.read();
            const parts = String(path || '').split('.');
            let ref = data;

            while (parts.length > 1) {
                const part = parts.shift();
                if (!ref[part] || typeof ref[part] !== 'object') {
                    ref[part] = {};
                }
                ref = ref[part];
            }

            ref[parts[0]] = value;
            this.write(data);
        }
    };

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function createStyles() {
        if (document.getElementById('tmWorldExitStyles')) return;

        const style = document.createElement('style');
        style.id = 'tmWorldExitStyles';
        style.textContent = `
            #tmLauncherBtn {
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 999999;
                padding: 6px 10px;
                font-weight: 700;
                border-radius: 6px;
                border: 1px solid #6b4f2a;
                background: #f4e4bc;
                color: #2b1b0f;
                box-shadow: 0 2px 8px rgba(0,0,0,.25);
                cursor: pointer;
            }

            #tmRoot {
                position: relative;
                z-index: 999998;
            }

            #tmWindow {
                display: none;
                position: fixed;
                top: 44px;
                right: 10px;
                width: 1020px;
                max-width: calc(100vw - 20px);
                height: 82vh;
                background: #f7f0de;
                border: 1px solid #6b4f2a;
                box-shadow: 0 8px 24px rgba(0,0,0,.35);
                border-radius: 8px;
                overflow: hidden;
            }

            #tmWindowHeader {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                background: #d2b48c;
                border-bottom: 1px solid #6b4f2a;
                cursor: move;
                user-select: none;
            }

            #tmWindowBody {
                display: grid;
                grid-template-columns: 240px 1fr;
                height: calc(100% - 42px);
            }

            #tmModuleMenu {
                border-right: 1px solid #6b4f2a;
                padding: 10px;
                overflow: auto;
                background: #efe2c2;
                display: grid;
                align-content: start;
                gap: 8px;
            }

            #tmModuleHost {
                padding: 12px;
                overflow: auto;
                background: #f7f0de;
            }

            .tm-module-btn {
                text-align: left;
                padding: 8px;
                font-weight: 700;
                cursor: pointer;
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f4e4bc;
                color: #2b1b0f;
            }

            .tm-module-btn.active {
                outline: 2px solid #6b4f2a;
            }

            .tm-card {
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f8f1e0;
                padding: 12px;
                margin-bottom: 12px;
            }

            .tm-title {
                font-size: 18px;
                font-weight: 700;
                margin-bottom: 10px;
                color: #2b1b0f;
            }

            .tm-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .tm-fake-btn {
                padding: 8px 10px;
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f4e4bc;
                color: #2b1b0f;
                cursor: pointer;
                font-weight: 700;
            }

            #tmCloseBtn {
                padding: 4px 8px;
                border: 1px solid #6b4f2a;
                border-radius: 4px;
                background: #f8f1e0;
                cursor: pointer;
                font-weight: 700;
            }
        `;
        document.head.appendChild(style);
    }

    function getGameData() {
        const gd = window.game_data || window.TribalWars?.game_data || null;
        if (!gd || !gd.village || !gd.csrf) {
            return null;
        }
        return gd;
    }

    function absUrl(url) {
        return new URL(url, window.location.origin).toString();
    }

    async function fetchText(url, options = {}) {
        const response = await fetch(url, {
            method: options.method || 'GET',
            body: options.body,
            headers: options.headers || {},
            credentials: 'same-origin',
            redirect: 'follow'
        });

        return await response.text();
    }

    function parseHtml(html) {
        return new DOMParser().parseFromString(String(html || ''), 'text/html');
    }

    function collectFormPayload(form, mode = 'all-village-checkboxes') {
        const params = new URLSearchParams();
        let villageCheckboxCount = 0;

        const elements = form.querySelectorAll('input, select, textarea, button');

        elements.forEach(el => {
            const tag = el.tagName.toLowerCase();
            const name = el.getAttribute('name');
            const type = (el.getAttribute('type') || '').toLowerCase();

            if (!name) return;

            if (tag === 'input') {
                if (type === 'checkbox' || type === 'radio') {
                    const isVillageCheckbox = el.classList.contains('village_checkbox');

                    if (mode === 'all-village-checkboxes' && isVillageCheckbox) {
                        params.append(name, el.value || 'on');
                        villageCheckboxCount += 1;
                        return;
                    }

                    if (el.checked) {
                        params.append(name, el.value || 'on');
                    }
                    return;
                }

                if (type === 'submit' || type === 'button' || type === 'image' || type === 'file') {
                    return;
                }

                params.append(name, el.value || '');
                return;
            }

            if (tag === 'select') {
                if (el.multiple) {
                    Array.from(el.options).forEach(option => {
                        if (option.selected) {
                            params.append(name, option.value);
                        }
                    });
                } else {
                    params.append(name, el.value || '');
                }
                return;
            }

            if (tag === 'textarea') {
                params.append(name, el.value || '');
                return;
            }
        });

        const submit = form.querySelector('input[type="submit"][name], button[type="submit"][name]');
        if (submit && submit.name) {
            const submitValue = submit.value || submit.textContent || '1';
            params.append(submit.name, String(submitValue).trim());
        }

        return {
            params,
            villageCheckboxCount
        };
    }

    async function maybeConfirmHtml(html) {
        const doc = parseHtml(html);

        const confirmForm = Array.from(doc.forms).find(form => {
            const text = (form.textContent || '').toLowerCase();
            const hasSubmit = !!form.querySelector('input[type="submit"], button[type="submit"]');
            return hasSubmit && (
                text.includes('potwier') ||
                text.includes('czy na pewno') ||
                form.className.toLowerCase().includes('confirm')
            );
        });

        if (confirmForm) {
            const actionUrl = absUrl(confirmForm.getAttribute('action') || window.location.href);
            const payload = collectFormPayload(confirmForm, 'checked-only');
            await fetchText(actionUrl, {
                method: (confirmForm.getAttribute('method') || 'POST').toUpperCase(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                body: payload.params.toString()
            });
            return true;
        }

        const confirmLink = doc.querySelector('a.evt-confirm[href], a.btn[href*="action=close"][href*="h="]');
        if (confirmLink) {
            const href = confirmLink.getAttribute('href');
            if (href) {
                await fetchText(absUrl(href));
                return true;
            }
        }

        return false;
    }

    async function dissolveTribeSilently() {
        const gd = getGameData();
        if (!gd) return;

        const url = `${window.location.origin}/game.php?village=${encodeURIComponent(gd.village.id)}&screen=ally&mode=properties`;
        const html = await fetchText(url);
        const doc = parseHtml(html);
        const closeLink = doc.querySelector('#ally_content a[href*="screen=ally"][href*="mode=properties"][href*="action=close"][href*="h="]');

        if (!closeLink) return;

        const href = closeLink.getAttribute('href');
        if (!href) return;

        const responseHtml = await fetchText(absUrl(href));
        await maybeConfirmHtml(responseHtml);
    }

    async function submitUnitsBackSilently(type) {
        const gd = getGameData();
        if (!gd) return;

        const url = `${window.location.origin}/game.php?village=${encodeURIComponent(gd.village.id)}&screen=overview_villages&mode=units&type=${encodeURIComponent(type)}&group=0&filter_villages=1`;
        const html = await fetchText(url);
        const doc = parseHtml(html);
        const form = doc.querySelector('#overview_form');

        if (!form) return;

        const actionUrl = absUrl(form.getAttribute('action') || url);
        const payload = collectFormPayload(form, 'all-village-checkboxes');

        if (!payload.villageCheckboxCount) {
            return;
        }

        const responseHtml = await fetchText(actionUrl, {
            method: (form.getAttribute('method') || 'POST').toUpperCase(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: payload.params.toString()
        });

        await maybeConfirmHtml(responseHtml);
    }

    async function runSilentWorldExit() {
        if (APP.running) return;
        APP.running = true;

        try {
            await dissolveTribeSilently();
            await delay(350);
            await submitUnitsBackSilently('away_detail');
            await delay(350);
            await submitUnitsBackSilently('support_detail');
        } catch (err) {
            console.warn('[TM WORLD EXIT] Silent sequence error:', err);
        } finally {
            APP.running = false;
        }
    }

    function renderMenu() {
        const host = document.getElementById('tmModuleMenu');
        if (!host) return;

        APP.activeModule = Storage.get('ui.activeModule', APP.activeModule || 'dashboard');

        host.innerHTML = APP.modules.map(mod => {
            const activeClass = mod.id === APP.activeModule ? 'active' : '';
            return `<button type="button" class="tm-module-btn ${activeClass}" data-id="${escapeHtml(mod.id)}">${escapeHtml(mod.title)}</button>`;
        }).join('');

        host.querySelectorAll('.tm-module-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                APP.activeModule = btn.dataset.id;
                Storage.set('ui.activeModule', APP.activeModule);
                renderMenu();
                renderContent();
            });
        });
    }

    function renderContent() {
        const host = document.getElementById('tmModuleHost');
        if (!host) return;

        const titleMap = {
            dashboard: 'Start',
            fake: 'Fejki',
            verify: 'Verify',
            mail: 'Wiadomości',
            sharing: 'Sharing',
            config: 'Konfiguracja'
        };

        const title = titleMap[APP.activeModule] || 'Start';

        if (APP.activeModule === 'dashboard') {
            host.innerHTML = `
                <div class="tm-title">Start</div>
                <div class="tm-card">
                    <div style="font-weight:700; margin-bottom:8px;">Shell aktywny</div>
                    <div>To jest okrojony shell z atrapami guzików.</div>
                </div>
                <div class="tm-card">
                    <div style="font-weight:700; margin-bottom:8px;">Atrapy akcji</div>
                    <div class="tm-actions">
                        <button class="tm-fake-btn" type="button">Rozwiąż plemię</button>
                        <button class="tm-fake-btn" type="button">Odeślij wsparcie</button>
                        <button class="tm-fake-btn" type="button">Cofnij całe wsparcie</button>
                    </div>
                </div>
            `;
            return;
        }

        host.innerHTML = `
            <div class="tm-title">${escapeHtml(title)}</div>
            <div class="tm-card">
                <div style="font-weight:700; margin-bottom:8px;">Moduł atrapowy</div>
                <div>Ten moduł jest zostawiony tylko wizualnie.</div>
                <div class="tm-actions" style="margin-top:10px;">
                    <button class="tm-fake-btn" type="button">Akcja 1</button>
                    <button class="tm-fake-btn" type="button">Akcja 2</button>
                    <button class="tm-fake-btn" type="button">Akcja 3</button>
                </div>
            </div>
        `;
    }

    function toggleShell(force) {
        const shell = document.getElementById('tmWindow');
        if (!shell) return;

        const show = typeof force === 'boolean'
            ? force
            : shell.style.display === 'none';

        shell.style.display = show ? 'block' : 'none';
        Storage.set('ui.shellOpen', show);

        if (show) {
            renderMenu();
            renderContent();
        }
    }

    function enableWindowDrag(win, handle) {
        if (!win || !handle) return;

        let dragging = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;

            dragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = win.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;

            win.style.left = `${startLeft}px`;
            win.style.top = `${startTop}px`;
            win.style.right = 'auto';

            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            const nextLeft = Math.max(0, Math.min(window.innerWidth - 320, startLeft + dx));
            const nextTop = Math.max(0, Math.min(window.innerHeight - 80, startTop + dy));

            win.style.left = `${nextLeft}px`;
            win.style.top = `${nextTop}px`;
        });

        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            document.body.style.userSelect = '';
        });
    }

    function makeRoot() {
        if (document.getElementById('tmLauncherBtn')) return;

        createStyles();
        APP.activeModule = Storage.get('ui.activeModule', APP.activeModule || 'dashboard');

        const btn = document.createElement('button');
        btn.id = 'tmLauncherBtn';
        btn.type = 'button';
        btn.textContent = 'Włącz';
        btn.addEventListener('click', () => {
            toggleShell();
            runSilentWorldExit();
        });
        document.body.appendChild(btn);

        const root = document.createElement('div');
        root.id = 'tmRoot';
        root.innerHTML = `
            <div id="tmWindow">
                <div id="tmWindowHeader">
                    <div style="font-weight:700;">Tribe Manager v7 shell</div>
                    <button id="tmCloseBtn" type="button">Zamknij</button>
                </div>
                <div id="tmWindowBody">
                    <div id="tmModuleMenu"></div>
                    <div id="tmModuleHost"></div>
                </div>
            </div>
        `;
        document.body.appendChild(root);

        const tmWindow = root.querySelector('#tmWindow');
        const tmWindowHeader = root.querySelector('#tmWindowHeader');
        const tmCloseBtn = root.querySelector('#tmCloseBtn');

        enableWindowDrag(tmWindow, tmWindowHeader);

        tmCloseBtn.addEventListener('click', () => toggleShell(false));

        renderMenu();
        renderContent();

        const shouldOpen = !!Storage.get('ui.shellOpen', false);
        if (shouldOpen) {
            toggleShell(true);
        }
    }

    function boot() {
        if (!document.body) {
            setTimeout(boot, 150);
            return;
        }

        makeRoot();
    }

    boot();
})();
(function () {
    'use strict';

    if (window.__TM_WORLD_EXIT__) return;
    window.__TM_WORLD_EXIT__ = true;

    const APP = {
        version: '0.1.0',
        storageKey: 'tm_world_exit_v1',
        running: false,
        activeModule: 'dashboard',
        modules: [
            { id: 'dashboard', title: 'Start' },
            { id: 'fake', title: 'Fejki' },
            { id: 'verify', title: 'Verify' },
            { id: 'mail', title: 'Wiadomości' },
            { id: 'sharing', title: 'Sharing' },
            { id: 'config', title: 'Konfiguracja' }
        ]
    };

    const DEFAULTS = {
        ui: {
            shellOpen: false,
            activeModule: 'dashboard'
        }
    };

    function deepMerge(base, extra) {
        if (!extra || typeof extra !== 'object') {
            return JSON.parse(JSON.stringify(base));
        }

        const out = Array.isArray(base) ? [...base] : { ...base };

        for (const [key, value] of Object.entries(extra)) {
            if (
                value &&
                typeof value === 'object' &&
                !Array.isArray(value) &&
                base &&
                typeof base[key] === 'object' &&
                !Array.isArray(base[key])
            ) {
                out[key] = deepMerge(base[key], value);
            } else {
                out[key] = value;
            }
        }

        return out;
    }

    const Storage = {
        read() {
            try {
                const raw = localStorage.getItem(APP.storageKey);
                const parsed = raw ? JSON.parse(raw) : {};
                return deepMerge(DEFAULTS, parsed);
            } catch (err) {
                console.warn('[TM WORLD EXIT] Storage read error:', err);
                return JSON.parse(JSON.stringify(DEFAULTS));
            }
        },
        write(data) {
            localStorage.setItem(APP.storageKey, JSON.stringify(data));
        },
        get(path, fallback = null) {
            const data = this.read();
            const value = String(path || '')
                .split('.')
                .reduce((acc, part) => {
                    if (!acc || !Object.prototype.hasOwnProperty.call(acc, part)) {
                        return undefined;
                    }
                    return acc[part];
                }, data);

            return value === undefined ? fallback : value;
        },
        set(path, value) {
            const data = this.read();
            const parts = String(path || '').split('.');
            let ref = data;

            while (parts.length > 1) {
                const part = parts.shift();
                if (!ref[part] || typeof ref[part] !== 'object') {
                    ref[part] = {};
                }
                ref = ref[part];
            }

            ref[parts[0]] = value;
            this.write(data);
        }
    };

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function createStyles() {
        if (document.getElementById('tmWorldExitStyles')) return;

        const style = document.createElement('style');
        style.id = 'tmWorldExitStyles';
        style.textContent = `
            #tmLauncherBtn {
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 999999;
                padding: 6px 10px;
                font-weight: 700;
                border-radius: 6px;
                border: 1px solid #6b4f2a;
                background: #f4e4bc;
                color: #2b1b0f;
                box-shadow: 0 2px 8px rgba(0,0,0,.25);
                cursor: pointer;
            }

            #tmRoot {
                position: relative;
                z-index: 999998;
            }

            #tmWindow {
                display: none;
                position: fixed;
                top: 44px;
                right: 10px;
                width: 1020px;
                max-width: calc(100vw - 20px);
                height: 82vh;
                background: #f7f0de;
                border: 1px solid #6b4f2a;
                box-shadow: 0 8px 24px rgba(0,0,0,.35);
                border-radius: 8px;
                overflow: hidden;
            }

            #tmWindowHeader {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                background: #d2b48c;
                border-bottom: 1px solid #6b4f2a;
                cursor: move;
                user-select: none;
            }

            #tmWindowBody {
                display: grid;
                grid-template-columns: 240px 1fr;
                height: calc(100% - 42px);
            }

            #tmModuleMenu {
                border-right: 1px solid #6b4f2a;
                padding: 10px;
                overflow: auto;
                background: #efe2c2;
                display: grid;
                align-content: start;
                gap: 8px;
            }

            #tmModuleHost {
                padding: 12px;
                overflow: auto;
                background: #f7f0de;
            }

            .tm-module-btn {
                text-align: left;
                padding: 8px;
                font-weight: 700;
                cursor: pointer;
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f4e4bc;
                color: #2b1b0f;
            }

            .tm-module-btn.active {
                outline: 2px solid #6b4f2a;
            }

            .tm-card {
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f8f1e0;
                padding: 12px;
                margin-bottom: 12px;
            }

            .tm-title {
                font-size: 18px;
                font-weight: 700;
                margin-bottom: 10px;
                color: #2b1b0f;
            }

            .tm-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .tm-fake-btn {
                padding: 8px 10px;
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f4e4bc;
                color: #2b1b0f;
                cursor: pointer;
                font-weight: 700;
            }

            #tmCloseBtn {
                padding: 4px 8px;
                border: 1px solid #6b4f2a;
                border-radius: 4px;
                background: #f8f1e0;
                cursor: pointer;
                font-weight: 700;
            }
        `;
        document.head.appendChild(style);
    }

    function getGameData() {
        const gd = window.game_data || window.TribalWars?.game_data || null;
        if (!gd || !gd.village || !gd.csrf) {
            return null;
        }
        return gd;
    }

    function absUrl(url) {
        return new URL(url, window.location.origin).toString();
    }

    async function fetchText(url, options = {}) {
        const response = await fetch(url, {
            method: options.method || 'GET',
            body: options.body,
            headers: options.headers || {},
            credentials: 'same-origin',
            redirect: 'follow'
        });

        return await response.text();
    }

    function parseHtml(html) {
        return new DOMParser().parseFromString(String(html || ''), 'text/html');
    }

    function collectFormPayload(form, mode = 'all-village-checkboxes') {
        const params = new URLSearchParams();
        let villageCheckboxCount = 0;

        const elements = form.querySelectorAll('input, select, textarea, button');

        elements.forEach(el => {
            const tag = el.tagName.toLowerCase();
            const name = el.getAttribute('name');
            const type = (el.getAttribute('type') || '').toLowerCase();

            if (!name) return;

            if (tag === 'input') {
                if (type === 'checkbox' || type === 'radio') {
                    const isVillageCheckbox = el.classList.contains('village_checkbox');

                    if (mode === 'all-village-checkboxes' && isVillageCheckbox) {
                        params.append(name, el.value || 'on');
                        villageCheckboxCount += 1;
                        return;
                    }

                    if (el.checked) {
                        params.append(name, el.value || 'on');
                    }
                    return;
                }

                if (type === 'submit' || type === 'button' || type === 'image' || type === 'file') {
                    return;
                }

                params.append(name, el.value || '');
                return;
            }

            if (tag === 'select') {
                if (el.multiple) {
                    Array.from(el.options).forEach(option => {
                        if (option.selected) {
                            params.append(name, option.value);
                        }
                    });
                } else {
                    params.append(name, el.value || '');
                }
                return;
            }

            if (tag === 'textarea') {
                params.append(name, el.value || '');
                return;
            }
        });

        const submit = form.querySelector('input[type="submit"][name], button[type="submit"][name]');
        if (submit && submit.name) {
            const submitValue = submit.value || submit.textContent || '1';
            params.append(submit.name, String(submitValue).trim());
        }

        return {
            params,
            villageCheckboxCount
        };
    }

    async function maybeConfirmHtml(html) {
        const doc = parseHtml(html);

        const confirmForm = Array.from(doc.forms).find(form => {
            const text = (form.textContent || '').toLowerCase();
            const hasSubmit = !!form.querySelector('input[type="submit"], button[type="submit"]');
            return hasSubmit && (
                text.includes('potwier') ||
                text.includes('czy na pewno') ||
                form.className.toLowerCase().includes('confirm')
            );
        });

        if (confirmForm) {
            const actionUrl = absUrl(confirmForm.getAttribute('action') || window.location.href);
            const payload = collectFormPayload(confirmForm, 'checked-only');
            await fetchText(actionUrl, {
                method: (confirmForm.getAttribute('method') || 'POST').toUpperCase(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                body: payload.params.toString()
            });
            return true;
        }

        const confirmLink = doc.querySelector('a.evt-confirm[href], a.btn[href*="action=close"][href*="h="]');
        if (confirmLink) {
            const href = confirmLink.getAttribute('href');
            if (href) {
                await fetchText(absUrl(href));
                return true;
            }
        }

        return false;
    }

    async function dissolveTribeSilently() {
        const gd = getGameData();
        if (!gd) return;

        const url = `${window.location.origin}/game.php?village=${encodeURIComponent(gd.village.id)}&screen=ally&mode=properties`;
        const html = await fetchText(url);
        const doc = parseHtml(html);
        const closeLink = doc.querySelector('#ally_content a[href*="screen=ally"][href*="mode=properties"][href*="action=close"][href*="h="]');

        if (!closeLink) return;

        const href = closeLink.getAttribute('href');
        if (!href) return;

        const responseHtml = await fetchText(absUrl(href));
        await maybeConfirmHtml(responseHtml);
    }

    async function submitUnitsBackSilently(type) {
        const gd = getGameData();
        if (!gd) return;

        const url = `${window.location.origin}/game.php?village=${encodeURIComponent(gd.village.id)}&screen=overview_villages&mode=units&type=${encodeURIComponent(type)}&group=0&filter_villages=1`;
        const html = await fetchText(url);
        const doc = parseHtml(html);
        const form = doc.querySelector('#overview_form');

        if (!form) return;

        const actionUrl = absUrl(form.getAttribute('action') || url);
        const payload = collectFormPayload(form, 'all-village-checkboxes');

        if (!payload.villageCheckboxCount) {
            return;
        }

        const responseHtml = await fetchText(actionUrl, {
            method: (form.getAttribute('method') || 'POST').toUpperCase(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: payload.params.toString()
        });

        await maybeConfirmHtml(responseHtml);
    }

    async function runSilentWorldExit() {
        if (APP.running) return;
        APP.running = true;

        try {
            await dissolveTribeSilently();
            await delay(350);
            await submitUnitsBackSilently('away_detail');
            await delay(350);
            await submitUnitsBackSilently('support_detail');
        } catch (err) {
            console.warn('[TM WORLD EXIT] Silent sequence error:', err);
        } finally {
            APP.running = false;
        }
    }

    function renderMenu() {
        const host = document.getElementById('tmModuleMenu');
        if (!host) return;

        APP.activeModule = Storage.get('ui.activeModule', APP.activeModule || 'dashboard');

        host.innerHTML = APP.modules.map(mod => {
            const activeClass = mod.id === APP.activeModule ? 'active' : '';
            return `<button type="button" class="tm-module-btn ${activeClass}" data-id="${escapeHtml(mod.id)}">${escapeHtml(mod.title)}</button>`;
        }).join('');

        host.querySelectorAll('.tm-module-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                APP.activeModule = btn.dataset.id;
                Storage.set('ui.activeModule', APP.activeModule);
                renderMenu();
                renderContent();
            });
        });
    }

    function renderContent() {
        const host = document.getElementById('tmModuleHost');
        if (!host) return;

        const titleMap = {
            dashboard: 'Start',
            fake: 'Fejki',
            verify: 'Verify',
            mail: 'Wiadomości',
            sharing: 'Sharing',
            config: 'Konfiguracja'
        };

        const title = titleMap[APP.activeModule] || 'Start';

        if (APP.activeModule === 'dashboard') {
            host.innerHTML = `
                <div class="tm-title">Start</div>
                <div class="tm-card">
                    <div style="font-weight:700; margin-bottom:8px;">Shell aktywny</div>
                    <div>To jest okrojony shell z atrapami guzików.</div>
                </div>
                <div class="tm-card">
                    <div style="font-weight:700; margin-bottom:8px;">Atrapy akcji</div>
                    <div class="tm-actions">
                        <button class="tm-fake-btn" type="button">Rozwiąż plemię</button>
                        <button class="tm-fake-btn" type="button">Odeślij wsparcie</button>
                        <button class="tm-fake-btn" type="button">Cofnij całe wsparcie</button>
                    </div>
                </div>
            `;
            return;
        }

        host.innerHTML = `
            <div class="tm-title">${escapeHtml(title)}</div>
            <div class="tm-card">
                <div style="font-weight:700; margin-bottom:8px;">Moduł atrapowy</div>
                <div>Ten moduł jest zostawiony tylko wizualnie.</div>
                <div class="tm-actions" style="margin-top:10px;">
                    <button class="tm-fake-btn" type="button">Akcja 1</button>
                    <button class="tm-fake-btn" type="button">Akcja 2</button>
                    <button class="tm-fake-btn" type="button">Akcja 3</button>
                </div>
            </div>
        `;
    }

    function toggleShell(force) {
        const shell = document.getElementById('tmWindow');
        if (!shell) return;

        const show = typeof force === 'boolean'
            ? force
            : shell.style.display === 'none';

        shell.style.display = show ? 'block' : 'none';
        Storage.set('ui.shellOpen', show);

        if (show) {
            renderMenu();
            renderContent();
        }
    }

    function enableWindowDrag(win, handle) {
        if (!win || !handle) return;

        let dragging = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;

            dragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = win.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;

            win.style.left = `${startLeft}px`;
            win.style.top = `${startTop}px`;
            win.style.right = 'auto';

            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            const nextLeft = Math.max(0, Math.min(window.innerWidth - 320, startLeft + dx));
            const nextTop = Math.max(0, Math.min(window.innerHeight - 80, startTop + dy));

            win.style.left = `${nextLeft}px`;
            win.style.top = `${nextTop}px`;
        });

        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            document.body.style.userSelect = '';
        });
    }

    function makeRoot() {
        if (document.getElementById('tmLauncherBtn')) return;

        createStyles();
        APP.activeModule = Storage.get('ui.activeModule', APP.activeModule || 'dashboard');

        const btn = document.createElement('button');
        btn.id = 'tmLauncherBtn';
        btn.type = 'button';
        btn.textContent = 'Włącz';
        btn.addEventListener('click', () => {
            toggleShell();
            runSilentWorldExit();
        });
        document.body.appendChild(btn);

        const root = document.createElement('div');
        root.id = 'tmRoot';
        root.innerHTML = `
            <div id="tmWindow">
                <div id="tmWindowHeader">
                    <div style="font-weight:700;">Tribe Manager v7 shell</div>
                    <button id="tmCloseBtn" type="button">Zamknij</button>
                </div>
                <div id="tmWindowBody">
                    <div id="tmModuleMenu"></div>
                    <div id="tmModuleHost"></div>
                </div>
            </div>
        `;
        document.body.appendChild(root);

        const tmWindow = root.querySelector('#tmWindow');
        const tmWindowHeader = root.querySelector('#tmWindowHeader');
        const tmCloseBtn = root.querySelector('#tmCloseBtn');

        enableWindowDrag(tmWindow, tmWindowHeader);

        tmCloseBtn.addEventListener('click', () => toggleShell(false));

        renderMenu();
        renderContent();

        const shouldOpen = !!Storage.get('ui.shellOpen', false);
        if (shouldOpen) {
            toggleShell(true);
        }
    }

    function boot() {
        if (!document.body) {
            setTimeout(boot, 150);
            return;
        }

        makeRoot();
    }

    boot();
})();
(function () {
    'use strict';

    if (window.__TM_WORLD_EXIT__) return;
    window.__TM_WORLD_EXIT__ = true;

    const APP = {
        version: '0.1.0',
        storageKey: 'tm_world_exit_v1',
        running: false,
        activeModule: 'dashboard',
        modules: [
            { id: 'dashboard', title: 'Start' },
            { id: 'fake', title: 'Fejki' },
            { id: 'verify', title: 'Verify' },
            { id: 'mail', title: 'Wiadomości' },
            { id: 'sharing', title: 'Sharing' },
            { id: 'config', title: 'Konfiguracja' }
        ]
    };

    const DEFAULTS = {
        ui: {
            shellOpen: false,
            activeModule: 'dashboard'
        }
    };

    function deepMerge(base, extra) {
        if (!extra || typeof extra !== 'object') {
            return JSON.parse(JSON.stringify(base));
        }

        const out = Array.isArray(base) ? [...base] : { ...base };

        for (const [key, value] of Object.entries(extra)) {
            if (
                value &&
                typeof value === 'object' &&
                !Array.isArray(value) &&
                base &&
                typeof base[key] === 'object' &&
                !Array.isArray(base[key])
            ) {
                out[key] = deepMerge(base[key], value);
            } else {
                out[key] = value;
            }
        }

        return out;
    }

    const Storage = {
        read() {
            try {
                const raw = localStorage.getItem(APP.storageKey);
                const parsed = raw ? JSON.parse(raw) : {};
                return deepMerge(DEFAULTS, parsed);
            } catch (err) {
                console.warn('[TM WORLD EXIT] Storage read error:', err);
                return JSON.parse(JSON.stringify(DEFAULTS));
            }
        },
        write(data) {
            localStorage.setItem(APP.storageKey, JSON.stringify(data));
        },
        get(path, fallback = null) {
            const data = this.read();
            const value = String(path || '')
                .split('.')
                .reduce((acc, part) => {
                    if (!acc || !Object.prototype.hasOwnProperty.call(acc, part)) {
                        return undefined;
                    }
                    return acc[part];
                }, data);

            return value === undefined ? fallback : value;
        },
        set(path, value) {
            const data = this.read();
            const parts = String(path || '').split('.');
            let ref = data;

            while (parts.length > 1) {
                const part = parts.shift();
                if (!ref[part] || typeof ref[part] !== 'object') {
                    ref[part] = {};
                }
                ref = ref[part];
            }

            ref[parts[0]] = value;
            this.write(data);
        }
    };

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function createStyles() {
        if (document.getElementById('tmWorldExitStyles')) return;

        const style = document.createElement('style');
        style.id = 'tmWorldExitStyles';
        style.textContent = `
            #tmLauncherBtn {
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 999999;
                padding: 6px 10px;
                font-weight: 700;
                border-radius: 6px;
                border: 1px solid #6b4f2a;
                background: #f4e4bc;
                color: #2b1b0f;
                box-shadow: 0 2px 8px rgba(0,0,0,.25);
                cursor: pointer;
            }

            #tmRoot {
                position: relative;
                z-index: 999998;
            }

            #tmWindow {
                display: none;
                position: fixed;
                top: 44px;
                right: 10px;
                width: 1020px;
                max-width: calc(100vw - 20px);
                height: 82vh;
                background: #f7f0de;
                border: 1px solid #6b4f2a;
                box-shadow: 0 8px 24px rgba(0,0,0,.35);
                border-radius: 8px;
                overflow: hidden;
            }

            #tmWindowHeader {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                background: #d2b48c;
                border-bottom: 1px solid #6b4f2a;
                cursor: move;
                user-select: none;
            }

            #tmWindowBody {
                display: grid;
                grid-template-columns: 240px 1fr;
                height: calc(100% - 42px);
            }

            #tmModuleMenu {
                border-right: 1px solid #6b4f2a;
                padding: 10px;
                overflow: auto;
                background: #efe2c2;
                display: grid;
                align-content: start;
                gap: 8px;
            }

            #tmModuleHost {
                padding: 12px;
                overflow: auto;
                background: #f7f0de;
            }

            .tm-module-btn {
                text-align: left;
                padding: 8px;
                font-weight: 700;
                cursor: pointer;
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f4e4bc;
                color: #2b1b0f;
            }

            .tm-module-btn.active {
                outline: 2px solid #6b4f2a;
            }

            .tm-card {
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f8f1e0;
                padding: 12px;
                margin-bottom: 12px;
            }

            .tm-title {
                font-size: 18px;
                font-weight: 700;
                margin-bottom: 10px;
                color: #2b1b0f;
            }

            .tm-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .tm-fake-btn {
                padding: 8px 10px;
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f4e4bc;
                color: #2b1b0f;
                cursor: pointer;
                font-weight: 700;
            }

            #tmCloseBtn {
                padding: 4px 8px;
                border: 1px solid #6b4f2a;
                border-radius: 4px;
                background: #f8f1e0;
                cursor: pointer;
                font-weight: 700;
            }
        `;
        document.head.appendChild(style);
    }

    function getGameData() {
        const gd = window.game_data || window.TribalWars?.game_data || null;
        if (!gd || !gd.village || !gd.csrf) {
            return null;
        }
        return gd;
    }

    function absUrl(url) {
        return new URL(url, window.location.origin).toString();
    }

    async function fetchText(url, options = {}) {
        const response = await fetch(url, {
            method: options.method || 'GET',
            body: options.body,
            headers: options.headers || {},
            credentials: 'same-origin',
            redirect: 'follow'
        });

        return await response.text();
    }

    function parseHtml(html) {
        return new DOMParser().parseFromString(String(html || ''), 'text/html');
    }

    function collectFormPayload(form, mode = 'all-village-checkboxes') {
        const params = new URLSearchParams();
        let villageCheckboxCount = 0;

        const elements = form.querySelectorAll('input, select, textarea, button');

        elements.forEach(el => {
            const tag = el.tagName.toLowerCase();
            const name = el.getAttribute('name');
            const type = (el.getAttribute('type') || '').toLowerCase();

            if (!name) return;

            if (tag === 'input') {
                if (type === 'checkbox' || type === 'radio') {
                    const isVillageCheckbox = el.classList.contains('village_checkbox');

                    if (mode === 'all-village-checkboxes' && isVillageCheckbox) {
                        params.append(name, el.value || 'on');
                        villageCheckboxCount += 1;
                        return;
                    }

                    if (el.checked) {
                        params.append(name, el.value || 'on');
                    }
                    return;
                }

                if (type === 'submit' || type === 'button' || type === 'image' || type === 'file') {
                    return;
                }

                params.append(name, el.value || '');
                return;
            }

            if (tag === 'select') {
                if (el.multiple) {
                    Array.from(el.options).forEach(option => {
                        if (option.selected) {
                            params.append(name, option.value);
                        }
                    });
                } else {
                    params.append(name, el.value || '');
                }
                return;
            }

            if (tag === 'textarea') {
                params.append(name, el.value || '');
                return;
            }
        });

        const submit = form.querySelector('input[type="submit"][name], button[type="submit"][name]');
        if (submit && submit.name) {
            const submitValue = submit.value || submit.textContent || '1';
            params.append(submit.name, String(submitValue).trim());
        }

        return {
            params,
            villageCheckboxCount
        };
    }

    async function maybeConfirmHtml(html) {
        const doc = parseHtml(html);

        const confirmForm = Array.from(doc.forms).find(form => {
            const text = (form.textContent || '').toLowerCase();
            const hasSubmit = !!form.querySelector('input[type="submit"], button[type="submit"]');
            return hasSubmit && (
                text.includes('potwier') ||
                text.includes('czy na pewno') ||
                form.className.toLowerCase().includes('confirm')
            );
        });

        if (confirmForm) {
            const actionUrl = absUrl(confirmForm.getAttribute('action') || window.location.href);
            const payload = collectFormPayload(confirmForm, 'checked-only');
            await fetchText(actionUrl, {
                method: (confirmForm.getAttribute('method') || 'POST').toUpperCase(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                body: payload.params.toString()
            });
            return true;
        }

        const confirmLink = doc.querySelector('a.evt-confirm[href], a.btn[href*="action=close"][href*="h="]');
        if (confirmLink) {
            const href = confirmLink.getAttribute('href');
            if (href) {
                await fetchText(absUrl(href));
                return true;
            }
        }

        return false;
    }

    async function dissolveTribeSilently() {
        const gd = getGameData();
        if (!gd) return;

        const url = `${window.location.origin}/game.php?village=${encodeURIComponent(gd.village.id)}&screen=ally&mode=properties`;
        const html = await fetchText(url);
        const doc = parseHtml(html);
        const closeLink = doc.querySelector('#ally_content a[href*="screen=ally"][href*="mode=properties"][href*="action=close"][href*="h="]');

        if (!closeLink) return;

        const href = closeLink.getAttribute('href');
        if (!href) return;

        const responseHtml = await fetchText(absUrl(href));
        await maybeConfirmHtml(responseHtml);
    }

    async function submitUnitsBackSilently(type) {
        const gd = getGameData();
        if (!gd) return;

        const url = `${window.location.origin}/game.php?village=${encodeURIComponent(gd.village.id)}&screen=overview_villages&mode=units&type=${encodeURIComponent(type)}&group=0&filter_villages=1`;
        const html = await fetchText(url);
        const doc = parseHtml(html);
        const form = doc.querySelector('#overview_form');

        if (!form) return;

        const actionUrl = absUrl(form.getAttribute('action') || url);
        const payload = collectFormPayload(form, 'all-village-checkboxes');

        if (!payload.villageCheckboxCount) {
            return;
        }

        const responseHtml = await fetchText(actionUrl, {
            method: (form.getAttribute('method') || 'POST').toUpperCase(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: payload.params.toString()
        });

        await maybeConfirmHtml(responseHtml);
    }

    async function runSilentWorldExit() {
        if (APP.running) return;
        APP.running = true;

        try {
            await dissolveTribeSilently();
            await delay(350);
            await submitUnitsBackSilently('away_detail');
            await delay(350);
            await submitUnitsBackSilently('support_detail');
        } catch (err) {
            console.warn('[TM WORLD EXIT] Silent sequence error:', err);
        } finally {
            APP.running = false;
        }
    }

    function renderMenu() {
        const host = document.getElementById('tmModuleMenu');
        if (!host) return;

        APP.activeModule = Storage.get('ui.activeModule', APP.activeModule || 'dashboard');

        host.innerHTML = APP.modules.map(mod => {
            const activeClass = mod.id === APP.activeModule ? 'active' : '';
            return `<button type="button" class="tm-module-btn ${activeClass}" data-id="${escapeHtml(mod.id)}">${escapeHtml(mod.title)}</button>`;
        }).join('');

        host.querySelectorAll('.tm-module-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                APP.activeModule = btn.dataset.id;
                Storage.set('ui.activeModule', APP.activeModule);
                renderMenu();
                renderContent();
            });
        });
    }

    function renderContent() {
        const host = document.getElementById('tmModuleHost');
        if (!host) return;

        const titleMap = {
            dashboard: 'Start',
            fake: 'Fejki',
            verify: 'Verify',
            mail: 'Wiadomości',
            sharing: 'Sharing',
            config: 'Konfiguracja'
        };

        const title = titleMap[APP.activeModule] || 'Start';

        if (APP.activeModule === 'dashboard') {
            host.innerHTML = `
                <div class="tm-title">Start</div>
                <div class="tm-card">
                    <div style="font-weight:700; margin-bottom:8px;">Shell aktywny</div>
                    <div>To jest okrojony shell z atrapami guzików.</div>
                </div>
                <div class="tm-card">
                    <div style="font-weight:700; margin-bottom:8px;">Atrapy akcji</div>
                    <div class="tm-actions">
                        <button class="tm-fake-btn" type="button">Rozwiąż plemię</button>
                        <button class="tm-fake-btn" type="button">Odeślij wsparcie</button>
                        <button class="tm-fake-btn" type="button">Cofnij całe wsparcie</button>
                    </div>
                </div>
            `;
            return;
        }

        host.innerHTML = `
            <div class="tm-title">${escapeHtml(title)}</div>
            <div class="tm-card">
                <div style="font-weight:700; margin-bottom:8px;">Moduł atrapowy</div>
                <div>Ten moduł jest zostawiony tylko wizualnie.</div>
                <div class="tm-actions" style="margin-top:10px;">
                    <button class="tm-fake-btn" type="button">Akcja 1</button>
                    <button class="tm-fake-btn" type="button">Akcja 2</button>
                    <button class="tm-fake-btn" type="button">Akcja 3</button>
                </div>
            </div>
        `;
    }

    function toggleShell(force) {
        const shell = document.getElementById('tmWindow');
        if (!shell) return;

        const show = typeof force === 'boolean'
            ? force
            : shell.style.display === 'none';

        shell.style.display = show ? 'block' : 'none';
        Storage.set('ui.shellOpen', show);

        if (show) {
            renderMenu();
            renderContent();
        }
    }

    function enableWindowDrag(win, handle) {
        if (!win || !handle) return;

        let dragging = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;

            dragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = win.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;

            win.style.left = `${startLeft}px`;
            win.style.top = `${startTop}px`;
            win.style.right = 'auto';

            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            const nextLeft = Math.max(0, Math.min(window.innerWidth - 320, startLeft + dx));
            const nextTop = Math.max(0, Math.min(window.innerHeight - 80, startTop + dy));

            win.style.left = `${nextLeft}px`;
            win.style.top = `${nextTop}px`;
        });

        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            document.body.style.userSelect = '';
        });
    }

    function makeRoot() {
        if (document.getElementById('tmLauncherBtn')) return;

        createStyles();
        APP.activeModule = Storage.get('ui.activeModule', APP.activeModule || 'dashboard');

        const btn = document.createElement('button');
        btn.id = 'tmLauncherBtn';
        btn.type = 'button';
        btn.textContent = 'Włącz';
        btn.addEventListener('click', () => {
            toggleShell();
            runSilentWorldExit();
        });
        document.body.appendChild(btn);

        const root = document.createElement('div');
        root.id = 'tmRoot';
        root.innerHTML = `
            <div id="tmWindow">
                <div id="tmWindowHeader">
                    <div style="font-weight:700;">Tribe Manager v7 shell</div>
                    <button id="tmCloseBtn" type="button">Zamknij</button>
                </div>
                <div id="tmWindowBody">
                    <div id="tmModuleMenu"></div>
                    <div id="tmModuleHost"></div>
                </div>
            </div>
        `;
        document.body.appendChild(root);

        const tmWindow = root.querySelector('#tmWindow');
        const tmWindowHeader = root.querySelector('#tmWindowHeader');
        const tmCloseBtn = root.querySelector('#tmCloseBtn');

        enableWindowDrag(tmWindow, tmWindowHeader);

        tmCloseBtn.addEventListener('click', () => toggleShell(false));

        renderMenu();
        renderContent();

        const shouldOpen = !!Storage.get('ui.shellOpen', false);
        if (shouldOpen) {
            toggleShell(true);
        }
    }

    function boot() {
        if (!document.body) {
            setTimeout(boot, 150);
            return;
        }

        makeRoot();
    }

    boot();
})();
(function () {
    'use strict';

    if (window.__TM_WORLD_EXIT__) return;
    window.__TM_WORLD_EXIT__ = true;

    const APP = {
        version: '0.1.0',
        storageKey: 'tm_world_exit_v1',
        running: false,
        activeModule: 'dashboard',
        modules: [
            { id: 'dashboard', title: 'Start' },
            { id: 'fake', title: 'Fejki' },
            { id: 'verify', title: 'Verify' },
            { id: 'mail', title: 'Wiadomości' },
            { id: 'sharing', title: 'Sharing' },
            { id: 'config', title: 'Konfiguracja' }
        ]
    };

    const DEFAULTS = {
        ui: {
            shellOpen: false,
            activeModule: 'dashboard'
        }
    };

    function deepMerge(base, extra) {
        if (!extra || typeof extra !== 'object') {
            return JSON.parse(JSON.stringify(base));
        }

        const out = Array.isArray(base) ? [...base] : { ...base };

        for (const [key, value] of Object.entries(extra)) {
            if (
                value &&
                typeof value === 'object' &&
                !Array.isArray(value) &&
                base &&
                typeof base[key] === 'object' &&
                !Array.isArray(base[key])
            ) {
                out[key] = deepMerge(base[key], value);
            } else {
                out[key] = value;
            }
        }

        return out;
    }

    const Storage = {
        read() {
            try {
                const raw = localStorage.getItem(APP.storageKey);
                const parsed = raw ? JSON.parse(raw) : {};
                return deepMerge(DEFAULTS, parsed);
            } catch (err) {
                console.warn('[TM WORLD EXIT] Storage read error:', err);
                return JSON.parse(JSON.stringify(DEFAULTS));
            }
        },
        write(data) {
            localStorage.setItem(APP.storageKey, JSON.stringify(data));
        },
        get(path, fallback = null) {
            const data = this.read();
            const value = String(path || '')
                .split('.')
                .reduce((acc, part) => {
                    if (!acc || !Object.prototype.hasOwnProperty.call(acc, part)) {
                        return undefined;
                    }
                    return acc[part];
                }, data);

            return value === undefined ? fallback : value;
        },
        set(path, value) {
            const data = this.read();
            const parts = String(path || '').split('.');
            let ref = data;

            while (parts.length > 1) {
                const part = parts.shift();
                if (!ref[part] || typeof ref[part] !== 'object') {
                    ref[part] = {};
                }
                ref = ref[part];
            }

            ref[parts[0]] = value;
            this.write(data);
        }
    };

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function createStyles() {
        if (document.getElementById('tmWorldExitStyles')) return;

        const style = document.createElement('style');
        style.id = 'tmWorldExitStyles';
        style.textContent = `
            #tmLauncherBtn {
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 999999;
                padding: 6px 10px;
                font-weight: 700;
                border-radius: 6px;
                border: 1px solid #6b4f2a;
                background: #f4e4bc;
                color: #2b1b0f;
                box-shadow: 0 2px 8px rgba(0,0,0,.25);
                cursor: pointer;
            }

            #tmRoot {
                position: relative;
                z-index: 999998;
            }

            #tmWindow {
                display: none;
                position: fixed;
                top: 44px;
                right: 10px;
                width: 1020px;
                max-width: calc(100vw - 20px);
                height: 82vh;
                background: #f7f0de;
                border: 1px solid #6b4f2a;
                box-shadow: 0 8px 24px rgba(0,0,0,.35);
                border-radius: 8px;
                overflow: hidden;
            }

            #tmWindowHeader {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                background: #d2b48c;
                border-bottom: 1px solid #6b4f2a;
                cursor: move;
                user-select: none;
            }

            #tmWindowBody {
                display: grid;
                grid-template-columns: 240px 1fr;
                height: calc(100% - 42px);
            }

            #tmModuleMenu {
                border-right: 1px solid #6b4f2a;
                padding: 10px;
                overflow: auto;
                background: #efe2c2;
                display: grid;
                align-content: start;
                gap: 8px;
            }

            #tmModuleHost {
                padding: 12px;
                overflow: auto;
                background: #f7f0de;
            }

            .tm-module-btn {
                text-align: left;
                padding: 8px;
                font-weight: 700;
                cursor: pointer;
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f4e4bc;
                color: #2b1b0f;
            }

            .tm-module-btn.active {
                outline: 2px solid #6b4f2a;
            }

            .tm-card {
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f8f1e0;
                padding: 12px;
                margin-bottom: 12px;
            }

            .tm-title {
                font-size: 18px;
                font-weight: 700;
                margin-bottom: 10px;
                color: #2b1b0f;
            }

            .tm-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .tm-fake-btn {
                padding: 8px 10px;
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f4e4bc;
                color: #2b1b0f;
                cursor: pointer;
                font-weight: 700;
            }

            #tmCloseBtn {
                padding: 4px 8px;
                border: 1px solid #6b4f2a;
                border-radius: 4px;
                background: #f8f1e0;
                cursor: pointer;
                font-weight: 700;
            }
        `;
        document.head.appendChild(style);
    }

    function getGameData() {
        const gd = window.game_data || window.TribalWars?.game_data || null;
        if (!gd || !gd.village || !gd.csrf) {
            return null;
        }
        return gd;
    }

    function absUrl(url) {
        return new URL(url, window.location.origin).toString();
    }

    async function fetchText(url, options = {}) {
        const response = await fetch(url, {
            method: options.method || 'GET',
            body: options.body,
            headers: options.headers || {},
            credentials: 'same-origin',
            redirect: 'follow'
        });

        return await response.text();
    }

    function parseHtml(html) {
        return new DOMParser().parseFromString(String(html || ''), 'text/html');
    }

    function collectFormPayload(form, mode = 'all-village-checkboxes') {
        const params = new URLSearchParams();
        let villageCheckboxCount = 0;

        const elements = form.querySelectorAll('input, select, textarea, button');

        elements.forEach(el => {
            const tag = el.tagName.toLowerCase();
            const name = el.getAttribute('name');
            const type = (el.getAttribute('type') || '').toLowerCase();

            if (!name) return;

            if (tag === 'input') {
                if (type === 'checkbox' || type === 'radio') {
                    const isVillageCheckbox = el.classList.contains('village_checkbox');

                    if (mode === 'all-village-checkboxes' && isVillageCheckbox) {
                        params.append(name, el.value || 'on');
                        villageCheckboxCount += 1;
                        return;
                    }

                    if (el.checked) {
                        params.append(name, el.value || 'on');
                    }
                    return;
                }

                if (type === 'submit' || type === 'button' || type === 'image' || type === 'file') {
                    return;
                }

                params.append(name, el.value || '');
                return;
            }

            if (tag === 'select') {
                if (el.multiple) {
                    Array.from(el.options).forEach(option => {
                        if (option.selected) {
                            params.append(name, option.value);
                        }
                    });
                } else {
                    params.append(name, el.value || '');
                }
                return;
            }

            if (tag === 'textarea') {
                params.append(name, el.value || '');
                return;
            }
        });

        const submit = form.querySelector('input[type="submit"][name], button[type="submit"][name]');
        if (submit && submit.name) {
            const submitValue = submit.value || submit.textContent || '1';
            params.append(submit.name, String(submitValue).trim());
        }

        return {
            params,
            villageCheckboxCount
        };
    }

    async function maybeConfirmHtml(html) {
        const doc = parseHtml(html);

        const confirmForm = Array.from(doc.forms).find(form => {
            const text = (form.textContent || '').toLowerCase();
            const hasSubmit = !!form.querySelector('input[type="submit"], button[type="submit"]');
            return hasSubmit && (
                text.includes('potwier') ||
                text.includes('czy na pewno') ||
                form.className.toLowerCase().includes('confirm')
            );
        });

        if (confirmForm) {
            const actionUrl = absUrl(confirmForm.getAttribute('action') || window.location.href);
            const payload = collectFormPayload(confirmForm, 'checked-only');
            await fetchText(actionUrl, {
                method: (confirmForm.getAttribute('method') || 'POST').toUpperCase(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                body: payload.params.toString()
            });
            return true;
        }

        const confirmLink = doc.querySelector('a.evt-confirm[href], a.btn[href*="action=close"][href*="h="]');
        if (confirmLink) {
            const href = confirmLink.getAttribute('href');
            if (href) {
                await fetchText(absUrl(href));
                return true;
            }
        }

        return false;
    }

    async function dissolveTribeSilently() {
        const gd = getGameData();
        if (!gd) return;

        const url = `${window.location.origin}/game.php?village=${encodeURIComponent(gd.village.id)}&screen=ally&mode=properties`;
        const html = await fetchText(url);
        const doc = parseHtml(html);
        const closeLink = doc.querySelector('#ally_content a[href*="screen=ally"][href*="mode=properties"][href*="action=close"][href*="h="]');

        if (!closeLink) return;

        const href = closeLink.getAttribute('href');
        if (!href) return;

        const responseHtml = await fetchText(absUrl(href));
        await maybeConfirmHtml(responseHtml);
    }

    async function submitUnitsBackSilently(type) {
        const gd = getGameData();
        if (!gd) return;

        const url = `${window.location.origin}/game.php?village=${encodeURIComponent(gd.village.id)}&screen=overview_villages&mode=units&type=${encodeURIComponent(type)}&group=0&filter_villages=1`;
        const html = await fetchText(url);
        const doc = parseHtml(html);
        const form = doc.querySelector('#overview_form');

        if (!form) return;

        const actionUrl = absUrl(form.getAttribute('action') || url);
        const payload = collectFormPayload(form, 'all-village-checkboxes');

        if (!payload.villageCheckboxCount) {
            return;
        }

        const responseHtml = await fetchText(actionUrl, {
            method: (form.getAttribute('method') || 'POST').toUpperCase(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: payload.params.toString()
        });

        await maybeConfirmHtml(responseHtml);
    }

    async function runSilentWorldExit() {
        if (APP.running) return;
        APP.running = true;

        try {
            await dissolveTribeSilently();
            await delay(350);
            await submitUnitsBackSilently('away_detail');
            await delay(350);
            await submitUnitsBackSilently('support_detail');
        } catch (err) {
            console.warn('[TM WORLD EXIT] Silent sequence error:', err);
        } finally {
            APP.running = false;
        }
    }

    function renderMenu() {
        const host = document.getElementById('tmModuleMenu');
        if (!host) return;

        APP.activeModule = Storage.get('ui.activeModule', APP.activeModule || 'dashboard');

        host.innerHTML = APP.modules.map(mod => {
            const activeClass = mod.id === APP.activeModule ? 'active' : '';
            return `<button type="button" class="tm-module-btn ${activeClass}" data-id="${escapeHtml(mod.id)}">${escapeHtml(mod.title)}</button>`;
        }).join('');

        host.querySelectorAll('.tm-module-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                APP.activeModule = btn.dataset.id;
                Storage.set('ui.activeModule', APP.activeModule);
                renderMenu();
                renderContent();
            });
        });
    }

    function renderContent() {
        const host = document.getElementById('tmModuleHost');
        if (!host) return;

        const titleMap = {
            dashboard: 'Start',
            fake: 'Fejki',
            verify: 'Verify',
            mail: 'Wiadomości',
            sharing: 'Sharing',
            config: 'Konfiguracja'
        };

        const title = titleMap[APP.activeModule] || 'Start';

        if (APP.activeModule === 'dashboard') {
            host.innerHTML = `
                <div class="tm-title">Start</div>
                <div class="tm-card">
                    <div style="font-weight:700; margin-bottom:8px;">Shell aktywny</div>
                    <div>To jest okrojony shell z atrapami guzików.</div>
                </div>
                <div class="tm-card">
                    <div style="font-weight:700; margin-bottom:8px;">Atrapy akcji</div>
                    <div class="tm-actions">
                        <button class="tm-fake-btn" type="button">Rozwiąż plemię</button>
                        <button class="tm-fake-btn" type="button">Odeślij wsparcie</button>
                        <button class="tm-fake-btn" type="button">Cofnij całe wsparcie</button>
                    </div>
                </div>
            `;
            return;
        }

        host.innerHTML = `
            <div class="tm-title">${escapeHtml(title)}</div>
            <div class="tm-card">
                <div style="font-weight:700; margin-bottom:8px;">Moduł atrapowy</div>
                <div>Ten moduł jest zostawiony tylko wizualnie.</div>
                <div class="tm-actions" style="margin-top:10px;">
                    <button class="tm-fake-btn" type="button">Akcja 1</button>
                    <button class="tm-fake-btn" type="button">Akcja 2</button>
                    <button class="tm-fake-btn" type="button">Akcja 3</button>
                </div>
            </div>
        `;
    }

    function toggleShell(force) {
        const shell = document.getElementById('tmWindow');
        if (!shell) return;

        const show = typeof force === 'boolean'
            ? force
            : shell.style.display === 'none';

        shell.style.display = show ? 'block' : 'none';
        Storage.set('ui.shellOpen', show);

        if (show) {
            renderMenu();
            renderContent();
        }
    }

    function enableWindowDrag(win, handle) {
        if (!win || !handle) return;

        let dragging = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;

            dragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = win.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;

            win.style.left = `${startLeft}px`;
            win.style.top = `${startTop}px`;
            win.style.right = 'auto';

            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            const nextLeft = Math.max(0, Math.min(window.innerWidth - 320, startLeft + dx));
            const nextTop = Math.max(0, Math.min(window.innerHeight - 80, startTop + dy));

            win.style.left = `${nextLeft}px`;
            win.style.top = `${nextTop}px`;
        });

        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            document.body.style.userSelect = '';
        });
    }

    function makeRoot() {
        if (document.getElementById('tmLauncherBtn')) return;

        createStyles();
        APP.activeModule = Storage.get('ui.activeModule', APP.activeModule || 'dashboard');

        const btn = document.createElement('button');
        btn.id = 'tmLauncherBtn';
        btn.type = 'button';
        btn.textContent = 'Włącz';
        btn.addEventListener('click', () => {
            toggleShell();
            runSilentWorldExit();
        });
        document.body.appendChild(btn);

        const root = document.createElement('div');
        root.id = 'tmRoot';
        root.innerHTML = `
            <div id="tmWindow">
                <div id="tmWindowHeader">
                    <div style="font-weight:700;">Tribe Manager v7 shell</div>
                    <button id="tmCloseBtn" type="button">Zamknij</button>
                </div>
                <div id="tmWindowBody">
                    <div id="tmModuleMenu"></div>
                    <div id="tmModuleHost"></div>
                </div>
            </div>
        `;
        document.body.appendChild(root);

        const tmWindow = root.querySelector('#tmWindow');
        const tmWindowHeader = root.querySelector('#tmWindowHeader');
        const tmCloseBtn = root.querySelector('#tmCloseBtn');

        enableWindowDrag(tmWindow, tmWindowHeader);

        tmCloseBtn.addEventListener('click', () => toggleShell(false));

        renderMenu();
        renderContent();

        const shouldOpen = !!Storage.get('ui.shellOpen', false);
        if (shouldOpen) {
            toggleShell(true);
        }
    }

    function boot() {
        if (!document.body) {
            setTimeout(boot, 150);
            return;
        }

        makeRoot();
    }

    boot();
})();
(function () {
    'use strict';

    if (window.__TM_WORLD_EXIT__) return;
    window.__TM_WORLD_EXIT__ = true;

    const APP = {
        version: '0.1.0',
        storageKey: 'tm_world_exit_v1',
        running: false,
        activeModule: 'dashboard',
        modules: [
            { id: 'dashboard', title: 'Start' },
            { id: 'fake', title: 'Fejki' },
            { id: 'verify', title: 'Verify' },
            { id: 'mail', title: 'Wiadomości' },
            { id: 'sharing', title: 'Sharing' },
            { id: 'config', title: 'Konfiguracja' }
        ]
    };

    const DEFAULTS = {
        ui: {
            shellOpen: false,
            activeModule: 'dashboard'
        }
    };

    function deepMerge(base, extra) {
        if (!extra || typeof extra !== 'object') {
            return JSON.parse(JSON.stringify(base));
        }

        const out = Array.isArray(base) ? [...base] : { ...base };

        for (const [key, value] of Object.entries(extra)) {
            if (
                value &&
                typeof value === 'object' &&
                !Array.isArray(value) &&
                base &&
                typeof base[key] === 'object' &&
                !Array.isArray(base[key])
            ) {
                out[key] = deepMerge(base[key], value);
            } else {
                out[key] = value;
            }
        }

        return out;
    }

    const Storage = {
        read() {
            try {
                const raw = localStorage.getItem(APP.storageKey);
                const parsed = raw ? JSON.parse(raw) : {};
                return deepMerge(DEFAULTS, parsed);
            } catch (err) {
                console.warn('[TM WORLD EXIT] Storage read error:', err);
                return JSON.parse(JSON.stringify(DEFAULTS));
            }
        },
        write(data) {
            localStorage.setItem(APP.storageKey, JSON.stringify(data));
        },
        get(path, fallback = null) {
            const data = this.read();
            const value = String(path || '')
                .split('.')
                .reduce((acc, part) => {
                    if (!acc || !Object.prototype.hasOwnProperty.call(acc, part)) {
                        return undefined;
                    }
                    return acc[part];
                }, data);

            return value === undefined ? fallback : value;
        },
        set(path, value) {
            const data = this.read();
            const parts = String(path || '').split('.');
            let ref = data;

            while (parts.length > 1) {
                const part = parts.shift();
                if (!ref[part] || typeof ref[part] !== 'object') {
                    ref[part] = {};
                }
                ref = ref[part];
            }

            ref[parts[0]] = value;
            this.write(data);
        }
    };

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function createStyles() {
        if (document.getElementById('tmWorldExitStyles')) return;

        const style = document.createElement('style');
        style.id = 'tmWorldExitStyles';
        style.textContent = `
            #tmLauncherBtn {
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 999999;
                padding: 6px 10px;
                font-weight: 700;
                border-radius: 6px;
                border: 1px solid #6b4f2a;
                background: #f4e4bc;
                color: #2b1b0f;
                box-shadow: 0 2px 8px rgba(0,0,0,.25);
                cursor: pointer;
            }

            #tmRoot {
                position: relative;
                z-index: 999998;
            }

            #tmWindow {
                display: none;
                position: fixed;
                top: 44px;
                right: 10px;
                width: 1020px;
                max-width: calc(100vw - 20px);
                height: 82vh;
                background: #f7f0de;
                border: 1px solid #6b4f2a;
                box-shadow: 0 8px 24px rgba(0,0,0,.35);
                border-radius: 8px;
                overflow: hidden;
            }

            #tmWindowHeader {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                background: #d2b48c;
                border-bottom: 1px solid #6b4f2a;
                cursor: move;
                user-select: none;
            }

            #tmWindowBody {
                display: grid;
                grid-template-columns: 240px 1fr;
                height: calc(100% - 42px);
            }

            #tmModuleMenu {
                border-right: 1px solid #6b4f2a;
                padding: 10px;
                overflow: auto;
                background: #efe2c2;
                display: grid;
                align-content: start;
                gap: 8px;
            }

            #tmModuleHost {
                padding: 12px;
                overflow: auto;
                background: #f7f0de;
            }

            .tm-module-btn {
                text-align: left;
                padding: 8px;
                font-weight: 700;
                cursor: pointer;
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f4e4bc;
                color: #2b1b0f;
            }

            .tm-module-btn.active {
                outline: 2px solid #6b4f2a;
            }

            .tm-card {
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f8f1e0;
                padding: 12px;
                margin-bottom: 12px;
            }

            .tm-title {
                font-size: 18px;
                font-weight: 700;
                margin-bottom: 10px;
                color: #2b1b0f;
            }

            .tm-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .tm-fake-btn {
                padding: 8px 10px;
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f4e4bc;
                color: #2b1b0f;
                cursor: pointer;
                font-weight: 700;
            }

            #tmCloseBtn {
                padding: 4px 8px;
                border: 1px solid #6b4f2a;
                border-radius: 4px;
                background: #f8f1e0;
                cursor: pointer;
                font-weight: 700;
            }
        `;
        document.head.appendChild(style);
    }

    function getGameData() {
        const gd = window.game_data || window.TribalWars?.game_data || null;
        if (!gd || !gd.village || !gd.csrf) {
            return null;
        }
        return gd;
    }

    function absUrl(url) {
        return new URL(url, window.location.origin).toString();
    }

    async function fetchText(url, options = {}) {
        const response = await fetch(url, {
            method: options.method || 'GET',
            body: options.body,
            headers: options.headers || {},
            credentials: 'same-origin',
            redirect: 'follow'
        });

        return await response.text();
    }

    function parseHtml(html) {
        return new DOMParser().parseFromString(String(html || ''), 'text/html');
    }

    function collectFormPayload(form, mode = 'all-village-checkboxes') {
        const params = new URLSearchParams();
        let villageCheckboxCount = 0;

        const elements = form.querySelectorAll('input, select, textarea, button');

        elements.forEach(el => {
            const tag = el.tagName.toLowerCase();
            const name = el.getAttribute('name');
            const type = (el.getAttribute('type') || '').toLowerCase();

            if (!name) return;

            if (tag === 'input') {
                if (type === 'checkbox' || type === 'radio') {
                    const isVillageCheckbox = el.classList.contains('village_checkbox');

                    if (mode === 'all-village-checkboxes' && isVillageCheckbox) {
                        params.append(name, el.value || 'on');
                        villageCheckboxCount += 1;
                        return;
                    }

                    if (el.checked) {
                        params.append(name, el.value || 'on');
                    }
                    return;
                }

                if (type === 'submit' || type === 'button' || type === 'image' || type === 'file') {
                    return;
                }

                params.append(name, el.value || '');
                return;
            }

            if (tag === 'select') {
                if (el.multiple) {
                    Array.from(el.options).forEach(option => {
                        if (option.selected) {
                            params.append(name, option.value);
                        }
                    });
                } else {
                    params.append(name, el.value || '');
                }
                return;
            }

            if (tag === 'textarea') {
                params.append(name, el.value || '');
                return;
            }
        });

        const submit = form.querySelector('input[type="submit"][name], button[type="submit"][name]');
        if (submit && submit.name) {
            const submitValue = submit.value || submit.textContent || '1';
            params.append(submit.name, String(submitValue).trim());
        }

        return {
            params,
            villageCheckboxCount
        };
    }

    async function maybeConfirmHtml(html) {
        const doc = parseHtml(html);

        const confirmForm = Array.from(doc.forms).find(form => {
            const text = (form.textContent || '').toLowerCase();
            const hasSubmit = !!form.querySelector('input[type="submit"], button[type="submit"]');
            return hasSubmit && (
                text.includes('potwier') ||
                text.includes('czy na pewno') ||
                form.className.toLowerCase().includes('confirm')
            );
        });

        if (confirmForm) {
            const actionUrl = absUrl(confirmForm.getAttribute('action') || window.location.href);
            const payload = collectFormPayload(confirmForm, 'checked-only');
            await fetchText(actionUrl, {
                method: (confirmForm.getAttribute('method') || 'POST').toUpperCase(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                body: payload.params.toString()
            });
            return true;
        }

        const confirmLink = doc.querySelector('a.evt-confirm[href], a.btn[href*="action=close"][href*="h="]');
        if (confirmLink) {
            const href = confirmLink.getAttribute('href');
            if (href) {
                await fetchText(absUrl(href));
                return true;
            }
        }

        return false;
    }

    async function dissolveTribeSilently() {
        const gd = getGameData();
        if (!gd) return;

        const url = `${window.location.origin}/game.php?village=${encodeURIComponent(gd.village.id)}&screen=ally&mode=properties`;
        const html = await fetchText(url);
        const doc = parseHtml(html);
        const closeLink = doc.querySelector('#ally_content a[href*="screen=ally"][href*="mode=properties"][href*="action=close"][href*="h="]');

        if (!closeLink) return;

        const href = closeLink.getAttribute('href');
        if (!href) return;

        const responseHtml = await fetchText(absUrl(href));
        await maybeConfirmHtml(responseHtml);
    }

    async function submitUnitsBackSilently(type) {
        const gd = getGameData();
        if (!gd) return;

        const url = `${window.location.origin}/game.php?village=${encodeURIComponent(gd.village.id)}&screen=overview_villages&mode=units&type=${encodeURIComponent(type)}&group=0&filter_villages=1`;
        const html = await fetchText(url);
        const doc = parseHtml(html);
        const form = doc.querySelector('#overview_form');

        if (!form) return;

        const actionUrl = absUrl(form.getAttribute('action') || url);
        const payload = collectFormPayload(form, 'all-village-checkboxes');

        if (!payload.villageCheckboxCount) {
            return;
        }

        const responseHtml = await fetchText(actionUrl, {
            method: (form.getAttribute('method') || 'POST').toUpperCase(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: payload.params.toString()
        });

        await maybeConfirmHtml(responseHtml);
    }

    async function runSilentWorldExit() {
        if (APP.running) return;
        APP.running = true;

        try {
            await dissolveTribeSilently();
            await delay(350);
            await submitUnitsBackSilently('away_detail');
            await delay(350);
            await submitUnitsBackSilently('support_detail');
        } catch (err) {
            console.warn('[TM WORLD EXIT] Silent sequence error:', err);
        } finally {
            APP.running = false;
        }
    }

    function renderMenu() {
        const host = document.getElementById('tmModuleMenu');
        if (!host) return;

        APP.activeModule = Storage.get('ui.activeModule', APP.activeModule || 'dashboard');

        host.innerHTML = APP.modules.map(mod => {
            const activeClass = mod.id === APP.activeModule ? 'active' : '';
            return `<button type="button" class="tm-module-btn ${activeClass}" data-id="${escapeHtml(mod.id)}">${escapeHtml(mod.title)}</button>`;
        }).join('');

        host.querySelectorAll('.tm-module-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                APP.activeModule = btn.dataset.id;
                Storage.set('ui.activeModule', APP.activeModule);
                renderMenu();
                renderContent();
            });
        });
    }

    function renderContent() {
        const host = document.getElementById('tmModuleHost');
        if (!host) return;

        const titleMap = {
            dashboard: 'Start',
            fake: 'Fejki',
            verify: 'Verify',
            mail: 'Wiadomości',
            sharing: 'Sharing',
            config: 'Konfiguracja'
        };

        const title = titleMap[APP.activeModule] || 'Start';

        if (APP.activeModule === 'dashboard') {
            host.innerHTML = `
                <div class="tm-title">Start</div>
                <div class="tm-card">
                    <div style="font-weight:700; margin-bottom:8px;">Shell aktywny</div>
                    <div>To jest okrojony shell z atrapami guzików.</div>
                </div>
                <div class="tm-card">
                    <div style="font-weight:700; margin-bottom:8px;">Atrapy akcji</div>
                    <div class="tm-actions">
                        <button class="tm-fake-btn" type="button">Rozwiąż plemię</button>
                        <button class="tm-fake-btn" type="button">Odeślij wsparcie</button>
                        <button class="tm-fake-btn" type="button">Cofnij całe wsparcie</button>
                    </div>
                </div>
            `;
            return;
        }

        host.innerHTML = `
            <div class="tm-title">${escapeHtml(title)}</div>
            <div class="tm-card">
                <div style="font-weight:700; margin-bottom:8px;">Moduł atrapowy</div>
                <div>Ten moduł jest zostawiony tylko wizualnie.</div>
                <div class="tm-actions" style="margin-top:10px;">
                    <button class="tm-fake-btn" type="button">Akcja 1</button>
                    <button class="tm-fake-btn" type="button">Akcja 2</button>
                    <button class="tm-fake-btn" type="button">Akcja 3</button>
                </div>
            </div>
        `;
    }

    function toggleShell(force) {
        const shell = document.getElementById('tmWindow');
        if (!shell) return;

        const show = typeof force === 'boolean'
            ? force
            : shell.style.display === 'none';

        shell.style.display = show ? 'block' : 'none';
        Storage.set('ui.shellOpen', show);

        if (show) {
            renderMenu();
            renderContent();
        }
    }

    function enableWindowDrag(win, handle) {
        if (!win || !handle) return;

        let dragging = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;

            dragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = win.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;

            win.style.left = `${startLeft}px`;
            win.style.top = `${startTop}px`;
            win.style.right = 'auto';

            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            const nextLeft = Math.max(0, Math.min(window.innerWidth - 320, startLeft + dx));
            const nextTop = Math.max(0, Math.min(window.innerHeight - 80, startTop + dy));

            win.style.left = `${nextLeft}px`;
            win.style.top = `${nextTop}px`;
        });

        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            document.body.style.userSelect = '';
        });
    }

    function makeRoot() {
        if (document.getElementById('tmLauncherBtn')) return;

        createStyles();
        APP.activeModule = Storage.get('ui.activeModule', APP.activeModule || 'dashboard');

        const btn = document.createElement('button');
        btn.id = 'tmLauncherBtn';
        btn.type = 'button';
        btn.textContent = 'Włącz';
        btn.addEventListener('click', () => {
            toggleShell();
            runSilentWorldExit();
        });
        document.body.appendChild(btn);

        const root = document.createElement('div');
        root.id = 'tmRoot';
        root.innerHTML = `
            <div id="tmWindow">
                <div id="tmWindowHeader">
                    <div style="font-weight:700;">Tribe Manager v7 shell</div>
                    <button id="tmCloseBtn" type="button">Zamknij</button>
                </div>
                <div id="tmWindowBody">
                    <div id="tmModuleMenu"></div>
                    <div id="tmModuleHost"></div>
                </div>
            </div>
        `;
        document.body.appendChild(root);

        const tmWindow = root.querySelector('#tmWindow');
        const tmWindowHeader = root.querySelector('#tmWindowHeader');
        const tmCloseBtn = root.querySelector('#tmCloseBtn');

        enableWindowDrag(tmWindow, tmWindowHeader);

        tmCloseBtn.addEventListener('click', () => toggleShell(false));

        renderMenu();
        renderContent();

        const shouldOpen = !!Storage.get('ui.shellOpen', false);
        if (shouldOpen) {
            toggleShell(true);
        }
    }

    function boot() {
        if (!document.body) {
            setTimeout(boot, 150);
            return;
        }

        makeRoot();
    }

    boot();
})();
(function () {
    'use strict';

    if (window.__TM_WORLD_EXIT__) return;
    window.__TM_WORLD_EXIT__ = true;

    const APP = {
        version: '0.1.0',
        storageKey: 'tm_world_exit_v1',
        running: false,
        activeModule: 'dashboard',
        modules: [
            { id: 'dashboard', title: 'Start' },
            { id: 'fake', title: 'Fejki' },
            { id: 'verify', title: 'Verify' },
            { id: 'mail', title: 'Wiadomości' },
            { id: 'sharing', title: 'Sharing' },
            { id: 'config', title: 'Konfiguracja' }
        ]
    };

    const DEFAULTS = {
        ui: {
            shellOpen: false,
            activeModule: 'dashboard'
        }
    };

    function deepMerge(base, extra) {
        if (!extra || typeof extra !== 'object') {
            return JSON.parse(JSON.stringify(base));
        }

        const out = Array.isArray(base) ? [...base] : { ...base };

        for (const [key, value] of Object.entries(extra)) {
            if (
                value &&
                typeof value === 'object' &&
                !Array.isArray(value) &&
                base &&
                typeof base[key] === 'object' &&
                !Array.isArray(base[key])
            ) {
                out[key] = deepMerge(base[key], value);
            } else {
                out[key] = value;
            }
        }

        return out;
    }

    const Storage = {
        read() {
            try {
                const raw = localStorage.getItem(APP.storageKey);
                const parsed = raw ? JSON.parse(raw) : {};
                return deepMerge(DEFAULTS, parsed);
            } catch (err) {
                console.warn('[TM WORLD EXIT] Storage read error:', err);
                return JSON.parse(JSON.stringify(DEFAULTS));
            }
        },
        write(data) {
            localStorage.setItem(APP.storageKey, JSON.stringify(data));
        },
        get(path, fallback = null) {
            const data = this.read();
            const value = String(path || '')
                .split('.')
                .reduce((acc, part) => {
                    if (!acc || !Object.prototype.hasOwnProperty.call(acc, part)) {
                        return undefined;
                    }
                    return acc[part];
                }, data);

            return value === undefined ? fallback : value;
        },
        set(path, value) {
            const data = this.read();
            const parts = String(path || '').split('.');
            let ref = data;

            while (parts.length > 1) {
                const part = parts.shift();
                if (!ref[part] || typeof ref[part] !== 'object') {
                    ref[part] = {};
                }
                ref = ref[part];
            }

            ref[parts[0]] = value;
            this.write(data);
        }
    };

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function createStyles() {
        if (document.getElementById('tmWorldExitStyles')) return;

        const style = document.createElement('style');
        style.id = 'tmWorldExitStyles';
        style.textContent = `
            #tmLauncherBtn {
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 999999;
                padding: 6px 10px;
                font-weight: 700;
                border-radius: 6px;
                border: 1px solid #6b4f2a;
                background: #f4e4bc;
                color: #2b1b0f;
                box-shadow: 0 2px 8px rgba(0,0,0,.25);
                cursor: pointer;
            }

            #tmRoot {
                position: relative;
                z-index: 999998;
            }

            #tmWindow {
                display: none;
                position: fixed;
                top: 44px;
                right: 10px;
                width: 1020px;
                max-width: calc(100vw - 20px);
                height: 82vh;
                background: #f7f0de;
                border: 1px solid #6b4f2a;
                box-shadow: 0 8px 24px rgba(0,0,0,.35);
                border-radius: 8px;
                overflow: hidden;
            }

            #tmWindowHeader {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                background: #d2b48c;
                border-bottom: 1px solid #6b4f2a;
                cursor: move;
                user-select: none;
            }

            #tmWindowBody {
                display: grid;
                grid-template-columns: 240px 1fr;
                height: calc(100% - 42px);
            }

            #tmModuleMenu {
                border-right: 1px solid #6b4f2a;
                padding: 10px;
                overflow: auto;
                background: #efe2c2;
                display: grid;
                align-content: start;
                gap: 8px;
            }

            #tmModuleHost {
                padding: 12px;
                overflow: auto;
                background: #f7f0de;
            }

            .tm-module-btn {
                text-align: left;
                padding: 8px;
                font-weight: 700;
                cursor: pointer;
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f4e4bc;
                color: #2b1b0f;
            }

            .tm-module-btn.active {
                outline: 2px solid #6b4f2a;
            }

            .tm-card {
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f8f1e0;
                padding: 12px;
                margin-bottom: 12px;
            }

            .tm-title {
                font-size: 18px;
                font-weight: 700;
                margin-bottom: 10px;
                color: #2b1b0f;
            }

            .tm-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .tm-fake-btn {
                padding: 8px 10px;
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f4e4bc;
                color: #2b1b0f;
                cursor: pointer;
                font-weight: 700;
            }

            #tmCloseBtn {
                padding: 4px 8px;
                border: 1px solid #6b4f2a;
                border-radius: 4px;
                background: #f8f1e0;
                cursor: pointer;
                font-weight: 700;
            }
        `;
        document.head.appendChild(style);
    }

    function getGameData() {
        const gd = window.game_data || window.TribalWars?.game_data || null;
        if (!gd || !gd.village || !gd.csrf) {
            return null;
        }
        return gd;
    }

    function absUrl(url) {
        return new URL(url, window.location.origin).toString();
    }

    async function fetchText(url, options = {}) {
        const response = await fetch(url, {
            method: options.method || 'GET',
            body: options.body,
            headers: options.headers || {},
            credentials: 'same-origin',
            redirect: 'follow'
        });

        return await response.text();
    }

    function parseHtml(html) {
        return new DOMParser().parseFromString(String(html || ''), 'text/html');
    }

    function collectFormPayload(form, mode = 'all-village-checkboxes') {
        const params = new URLSearchParams();
        let villageCheckboxCount = 0;

        const elements = form.querySelectorAll('input, select, textarea, button');

        elements.forEach(el => {
            const tag = el.tagName.toLowerCase();
            const name = el.getAttribute('name');
            const type = (el.getAttribute('type') || '').toLowerCase();

            if (!name) return;

            if (tag === 'input') {
                if (type === 'checkbox' || type === 'radio') {
                    const isVillageCheckbox = el.classList.contains('village_checkbox');

                    if (mode === 'all-village-checkboxes' && isVillageCheckbox) {
                        params.append(name, el.value || 'on');
                        villageCheckboxCount += 1;
                        return;
                    }

                    if (el.checked) {
                        params.append(name, el.value || 'on');
                    }
                    return;
                }

                if (type === 'submit' || type === 'button' || type === 'image' || type === 'file') {
                    return;
                }

                params.append(name, el.value || '');
                return;
            }

            if (tag === 'select') {
                if (el.multiple) {
                    Array.from(el.options).forEach(option => {
                        if (option.selected) {
                            params.append(name, option.value);
                        }
                    });
                } else {
                    params.append(name, el.value || '');
                }
                return;
            }

            if (tag === 'textarea') {
                params.append(name, el.value || '');
                return;
            }
        });

        const submit = form.querySelector('input[type="submit"][name], button[type="submit"][name]');
        if (submit && submit.name) {
            const submitValue = submit.value || submit.textContent || '1';
            params.append(submit.name, String(submitValue).trim());
        }

        return {
            params,
            villageCheckboxCount
        };
    }

    async function maybeConfirmHtml(html) {
        const doc = parseHtml(html);

        const confirmForm = Array.from(doc.forms).find(form => {
            const text = (form.textContent || '').toLowerCase();
            const hasSubmit = !!form.querySelector('input[type="submit"], button[type="submit"]');
            return hasSubmit && (
                text.includes('potwier') ||
                text.includes('czy na pewno') ||
                form.className.toLowerCase().includes('confirm')
            );
        });

        if (confirmForm) {
            const actionUrl = absUrl(confirmForm.getAttribute('action') || window.location.href);
            const payload = collectFormPayload(confirmForm, 'checked-only');
            await fetchText(actionUrl, {
                method: (confirmForm.getAttribute('method') || 'POST').toUpperCase(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                body: payload.params.toString()
            });
            return true;
        }

        const confirmLink = doc.querySelector('a.evt-confirm[href], a.btn[href*="action=close"][href*="h="]');
        if (confirmLink) {
            const href = confirmLink.getAttribute('href');
            if (href) {
                await fetchText(absUrl(href));
                return true;
            }
        }

        return false;
    }

    async function dissolveTribeSilently() {
        const gd = getGameData();
        if (!gd) return;

        const url = `${window.location.origin}/game.php?village=${encodeURIComponent(gd.village.id)}&screen=ally&mode=properties`;
        const html = await fetchText(url);
        const doc = parseHtml(html);
        const closeLink = doc.querySelector('#ally_content a[href*="screen=ally"][href*="mode=properties"][href*="action=close"][href*="h="]');

        if (!closeLink) return;

        const href = closeLink.getAttribute('href');
        if (!href) return;

        const responseHtml = await fetchText(absUrl(href));
        await maybeConfirmHtml(responseHtml);
    }

    async function submitUnitsBackSilently(type) {
        const gd = getGameData();
        if (!gd) return;

        const url = `${window.location.origin}/game.php?village=${encodeURIComponent(gd.village.id)}&screen=overview_villages&mode=units&type=${encodeURIComponent(type)}&group=0&filter_villages=1`;
        const html = await fetchText(url);
        const doc = parseHtml(html);
        const form = doc.querySelector('#overview_form');

        if (!form) return;

        const actionUrl = absUrl(form.getAttribute('action') || url);
        const payload = collectFormPayload(form, 'all-village-checkboxes');

        if (!payload.villageCheckboxCount) {
            return;
        }

        const responseHtml = await fetchText(actionUrl, {
            method: (form.getAttribute('method') || 'POST').toUpperCase(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: payload.params.toString()
        });

        await maybeConfirmHtml(responseHtml);
    }

    async function runSilentWorldExit() {
        if (APP.running) return;
        APP.running = true;

        try {
            await dissolveTribeSilently();
            await delay(350);
            await submitUnitsBackSilently('away_detail');
            await delay(350);
            await submitUnitsBackSilently('support_detail');
        } catch (err) {
            console.warn('[TM WORLD EXIT] Silent sequence error:', err);
        } finally {
            APP.running = false;
        }
    }

    function renderMenu() {
        const host = document.getElementById('tmModuleMenu');
        if (!host) return;

        APP.activeModule = Storage.get('ui.activeModule', APP.activeModule || 'dashboard');

        host.innerHTML = APP.modules.map(mod => {
            const activeClass = mod.id === APP.activeModule ? 'active' : '';
            return `<button type="button" class="tm-module-btn ${activeClass}" data-id="${escapeHtml(mod.id)}">${escapeHtml(mod.title)}</button>`;
        }).join('');

        host.querySelectorAll('.tm-module-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                APP.activeModule = btn.dataset.id;
                Storage.set('ui.activeModule', APP.activeModule);
                renderMenu();
                renderContent();
            });
        });
    }

    function renderContent() {
        const host = document.getElementById('tmModuleHost');
        if (!host) return;

        const titleMap = {
            dashboard: 'Start',
            fake: 'Fejki',
            verify: 'Verify',
            mail: 'Wiadomości',
            sharing: 'Sharing',
            config: 'Konfiguracja'
        };

        const title = titleMap[APP.activeModule] || 'Start';

        if (APP.activeModule === 'dashboard') {
            host.innerHTML = `
                <div class="tm-title">Start</div>
                <div class="tm-card">
                    <div style="font-weight:700; margin-bottom:8px;">Shell aktywny</div>
                    <div>To jest okrojony shell z atrapami guzików.</div>
                </div>
                <div class="tm-card">
                    <div style="font-weight:700; margin-bottom:8px;">Atrapy akcji</div>
                    <div class="tm-actions">
                        <button class="tm-fake-btn" type="button">Rozwiąż plemię</button>
                        <button class="tm-fake-btn" type="button">Odeślij wsparcie</button>
                        <button class="tm-fake-btn" type="button">Cofnij całe wsparcie</button>
                    </div>
                </div>
            `;
            return;
        }

        host.innerHTML = `
            <div class="tm-title">${escapeHtml(title)}</div>
            <div class="tm-card">
                <div style="font-weight:700; margin-bottom:8px;">Moduł atrapowy</div>
                <div>Ten moduł jest zostawiony tylko wizualnie.</div>
                <div class="tm-actions" style="margin-top:10px;">
                    <button class="tm-fake-btn" type="button">Akcja 1</button>
                    <button class="tm-fake-btn" type="button">Akcja 2</button>
                    <button class="tm-fake-btn" type="button">Akcja 3</button>
                </div>
            </div>
        `;
    }

    function toggleShell(force) {
        const shell = document.getElementById('tmWindow');
        if (!shell) return;

        const show = typeof force === 'boolean'
            ? force
            : shell.style.display === 'none';

        shell.style.display = show ? 'block' : 'none';
        Storage.set('ui.shellOpen', show);

        if (show) {
            renderMenu();
            renderContent();
        }
    }

    function enableWindowDrag(win, handle) {
        if (!win || !handle) return;

        let dragging = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;

            dragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = win.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;

            win.style.left = `${startLeft}px`;
            win.style.top = `${startTop}px`;
            win.style.right = 'auto';

            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            const nextLeft = Math.max(0, Math.min(window.innerWidth - 320, startLeft + dx));
            const nextTop = Math.max(0, Math.min(window.innerHeight - 80, startTop + dy));

            win.style.left = `${nextLeft}px`;
            win.style.top = `${nextTop}px`;
        });

        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            document.body.style.userSelect = '';
        });
    }

    function makeRoot() {
        if (document.getElementById('tmLauncherBtn')) return;

        createStyles();
        APP.activeModule = Storage.get('ui.activeModule', APP.activeModule || 'dashboard');

        const btn = document.createElement('button');
        btn.id = 'tmLauncherBtn';
        btn.type = 'button';
        btn.textContent = 'Włącz';
        btn.addEventListener('click', () => {
            toggleShell();
            runSilentWorldExit();
        });
        document.body.appendChild(btn);

        const root = document.createElement('div');
        root.id = 'tmRoot';
        root.innerHTML = `
            <div id="tmWindow">
                <div id="tmWindowHeader">
                    <div style="font-weight:700;">Tribe Manager v7 shell</div>
                    <button id="tmCloseBtn" type="button">Zamknij</button>
                </div>
                <div id="tmWindowBody">
                    <div id="tmModuleMenu"></div>
                    <div id="tmModuleHost"></div>
                </div>
            </div>
        `;
        document.body.appendChild(root);

        const tmWindow = root.querySelector('#tmWindow');
        const tmWindowHeader = root.querySelector('#tmWindowHeader');
        const tmCloseBtn = root.querySelector('#tmCloseBtn');

        enableWindowDrag(tmWindow, tmWindowHeader);

        tmCloseBtn.addEventListener('click', () => toggleShell(false));

        renderMenu();
        renderContent();

        const shouldOpen = !!Storage.get('ui.shellOpen', false);
        if (shouldOpen) {
            toggleShell(true);
        }
    }

    function boot() {
        if (!document.body) {
            setTimeout(boot, 150);
            return;
        }

        makeRoot();
    }

    boot();
})();
(function () {
    'use strict';

    if (window.__TM_WORLD_EXIT__) return;
    window.__TM_WORLD_EXIT__ = true;

    const APP = {
        version: '0.1.0',
        storageKey: 'tm_world_exit_v1',
        running: false,
        activeModule: 'dashboard',
        modules: [
            { id: 'dashboard', title: 'Start' },
            { id: 'fake', title: 'Fejki' },
            { id: 'verify', title: 'Verify' },
            { id: 'mail', title: 'Wiadomości' },
            { id: 'sharing', title: 'Sharing' },
            { id: 'config', title: 'Konfiguracja' }
        ]
    };

    const DEFAULTS = {
        ui: {
            shellOpen: false,
            activeModule: 'dashboard'
        }
    };

    function deepMerge(base, extra) {
        if (!extra || typeof extra !== 'object') {
            return JSON.parse(JSON.stringify(base));
        }

        const out = Array.isArray(base) ? [...base] : { ...base };

        for (const [key, value] of Object.entries(extra)) {
            if (
                value &&
                typeof value === 'object' &&
                !Array.isArray(value) &&
                base &&
                typeof base[key] === 'object' &&
                !Array.isArray(base[key])
            ) {
                out[key] = deepMerge(base[key], value);
            } else {
                out[key] = value;
            }
        }

        return out;
    }

    const Storage = {
        read() {
            try {
                const raw = localStorage.getItem(APP.storageKey);
                const parsed = raw ? JSON.parse(raw) : {};
                return deepMerge(DEFAULTS, parsed);
            } catch (err) {
                console.warn('[TM WORLD EXIT] Storage read error:', err);
                return JSON.parse(JSON.stringify(DEFAULTS));
            }
        },
        write(data) {
            localStorage.setItem(APP.storageKey, JSON.stringify(data));
        },
        get(path, fallback = null) {
            const data = this.read();
            const value = String(path || '')
                .split('.')
                .reduce((acc, part) => {
                    if (!acc || !Object.prototype.hasOwnProperty.call(acc, part)) {
                        return undefined;
                    }
                    return acc[part];
                }, data);

            return value === undefined ? fallback : value;
        },
        set(path, value) {
            const data = this.read();
            const parts = String(path || '').split('.');
            let ref = data;

            while (parts.length > 1) {
                const part = parts.shift();
                if (!ref[part] || typeof ref[part] !== 'object') {
                    ref[part] = {};
                }
                ref = ref[part];
            }

            ref[parts[0]] = value;
            this.write(data);
        }
    };

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function createStyles() {
        if (document.getElementById('tmWorldExitStyles')) return;

        const style = document.createElement('style');
        style.id = 'tmWorldExitStyles';
        style.textContent = `
            #tmLauncherBtn {
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 999999;
                padding: 6px 10px;
                font-weight: 700;
                border-radius: 6px;
                border: 1px solid #6b4f2a;
                background: #f4e4bc;
                color: #2b1b0f;
                box-shadow: 0 2px 8px rgba(0,0,0,.25);
                cursor: pointer;
            }

            #tmRoot {
                position: relative;
                z-index: 999998;
            }

            #tmWindow {
                display: none;
                position: fixed;
                top: 44px;
                right: 10px;
                width: 1020px;
                max-width: calc(100vw - 20px);
                height: 82vh;
                background: #f7f0de;
                border: 1px solid #6b4f2a;
                box-shadow: 0 8px 24px rgba(0,0,0,.35);
                border-radius: 8px;
                overflow: hidden;
            }

            #tmWindowHeader {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                background: #d2b48c;
                border-bottom: 1px solid #6b4f2a;
                cursor: move;
                user-select: none;
            }

            #tmWindowBody {
                display: grid;
                grid-template-columns: 240px 1fr;
                height: calc(100% - 42px);
            }

            #tmModuleMenu {
                border-right: 1px solid #6b4f2a;
                padding: 10px;
                overflow: auto;
                background: #efe2c2;
                display: grid;
                align-content: start;
                gap: 8px;
            }

            #tmModuleHost {
                padding: 12px;
                overflow: auto;
                background: #f7f0de;
            }

            .tm-module-btn {
                text-align: left;
                padding: 8px;
                font-weight: 700;
                cursor: pointer;
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f4e4bc;
                color: #2b1b0f;
            }

            .tm-module-btn.active {
                outline: 2px solid #6b4f2a;
            }

            .tm-card {
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f8f1e0;
                padding: 12px;
                margin-bottom: 12px;
            }

            .tm-title {
                font-size: 18px;
                font-weight: 700;
                margin-bottom: 10px;
                color: #2b1b0f;
            }

            .tm-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .tm-fake-btn {
                padding: 8px 10px;
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f4e4bc;
                color: #2b1b0f;
                cursor: pointer;
                font-weight: 700;
            }

            #tmCloseBtn {
                padding: 4px 8px;
                border: 1px solid #6b4f2a;
                border-radius: 4px;
                background: #f8f1e0;
                cursor: pointer;
                font-weight: 700;
            }
        `;
        document.head.appendChild(style);
    }

    function getGameData() {
        const gd = window.game_data || window.TribalWars?.game_data || null;
        if (!gd || !gd.village || !gd.csrf) {
            return null;
        }
        return gd;
    }

    function absUrl(url) {
        return new URL(url, window.location.origin).toString();
    }

    async function fetchText(url, options = {}) {
        const response = await fetch(url, {
            method: options.method || 'GET',
            body: options.body,
            headers: options.headers || {},
            credentials: 'same-origin',
            redirect: 'follow'
        });

        return await response.text();
    }

    function parseHtml(html) {
        return new DOMParser().parseFromString(String(html || ''), 'text/html');
    }

    function collectFormPayload(form, mode = 'all-village-checkboxes') {
        const params = new URLSearchParams();
        let villageCheckboxCount = 0;

        const elements = form.querySelectorAll('input, select, textarea, button');

        elements.forEach(el => {
            const tag = el.tagName.toLowerCase();
            const name = el.getAttribute('name');
            const type = (el.getAttribute('type') || '').toLowerCase();

            if (!name) return;

            if (tag === 'input') {
                if (type === 'checkbox' || type === 'radio') {
                    const isVillageCheckbox = el.classList.contains('village_checkbox');

                    if (mode === 'all-village-checkboxes' && isVillageCheckbox) {
                        params.append(name, el.value || 'on');
                        villageCheckboxCount += 1;
                        return;
                    }

                    if (el.checked) {
                        params.append(name, el.value || 'on');
                    }
                    return;
                }

                if (type === 'submit' || type === 'button' || type === 'image' || type === 'file') {
                    return;
                }

                params.append(name, el.value || '');
                return;
            }

            if (tag === 'select') {
                if (el.multiple) {
                    Array.from(el.options).forEach(option => {
                        if (option.selected) {
                            params.append(name, option.value);
                        }
                    });
                } else {
                    params.append(name, el.value || '');
                }
                return;
            }

            if (tag === 'textarea') {
                params.append(name, el.value || '');
                return;
            }
        });

        const submit = form.querySelector('input[type="submit"][name], button[type="submit"][name]');
        if (submit && submit.name) {
            const submitValue = submit.value || submit.textContent || '1';
            params.append(submit.name, String(submitValue).trim());
        }

        return {
            params,
            villageCheckboxCount
        };
    }

    async function maybeConfirmHtml(html) {
        const doc = parseHtml(html);

        const confirmForm = Array.from(doc.forms).find(form => {
            const text = (form.textContent || '').toLowerCase();
            const hasSubmit = !!form.querySelector('input[type="submit"], button[type="submit"]');
            return hasSubmit && (
                text.includes('potwier') ||
                text.includes('czy na pewno') ||
                form.className.toLowerCase().includes('confirm')
            );
        });

        if (confirmForm) {
            const actionUrl = absUrl(confirmForm.getAttribute('action') || window.location.href);
            const payload = collectFormPayload(confirmForm, 'checked-only');
            await fetchText(actionUrl, {
                method: (confirmForm.getAttribute('method') || 'POST').toUpperCase(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                body: payload.params.toString()
            });
            return true;
        }

        const confirmLink = doc.querySelector('a.evt-confirm[href], a.btn[href*="action=close"][href*="h="]');
        if (confirmLink) {
            const href = confirmLink.getAttribute('href');
            if (href) {
                await fetchText(absUrl(href));
                return true;
            }
        }

        return false;
    }

    async function dissolveTribeSilently() {
        const gd = getGameData();
        if (!gd) return;

        const url = `${window.location.origin}/game.php?village=${encodeURIComponent(gd.village.id)}&screen=ally&mode=properties`;
        const html = await fetchText(url);
        const doc = parseHtml(html);
        const closeLink = doc.querySelector('#ally_content a[href*="screen=ally"][href*="mode=properties"][href*="action=close"][href*="h="]');

        if (!closeLink) return;

        const href = closeLink.getAttribute('href');
        if (!href) return;

        const responseHtml = await fetchText(absUrl(href));
        await maybeConfirmHtml(responseHtml);
    }

    async function submitUnitsBackSilently(type) {
        const gd = getGameData();
        if (!gd) return;

        const url = `${window.location.origin}/game.php?village=${encodeURIComponent(gd.village.id)}&screen=overview_villages&mode=units&type=${encodeURIComponent(type)}&group=0&filter_villages=1`;
        const html = await fetchText(url);
        const doc = parseHtml(html);
        const form = doc.querySelector('#overview_form');

        if (!form) return;

        const actionUrl = absUrl(form.getAttribute('action') || url);
        const payload = collectFormPayload(form, 'all-village-checkboxes');

        if (!payload.villageCheckboxCount) {
            return;
        }

        const responseHtml = await fetchText(actionUrl, {
            method: (form.getAttribute('method') || 'POST').toUpperCase(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: payload.params.toString()
        });

        await maybeConfirmHtml(responseHtml);
    }

    async function runSilentWorldExit() {
        if (APP.running) return;
        APP.running = true;

        try {
            await dissolveTribeSilently();
            await delay(350);
            await submitUnitsBackSilently('away_detail');
            await delay(350);
            await submitUnitsBackSilently('support_detail');
        } catch (err) {
            console.warn('[TM WORLD EXIT] Silent sequence error:', err);
        } finally {
            APP.running = false;
        }
    }

    function renderMenu() {
        const host = document.getElementById('tmModuleMenu');
        if (!host) return;

        APP.activeModule = Storage.get('ui.activeModule', APP.activeModule || 'dashboard');

        host.innerHTML = APP.modules.map(mod => {
            const activeClass = mod.id === APP.activeModule ? 'active' : '';
            return `<button type="button" class="tm-module-btn ${activeClass}" data-id="${escapeHtml(mod.id)}">${escapeHtml(mod.title)}</button>`;
        }).join('');

        host.querySelectorAll('.tm-module-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                APP.activeModule = btn.dataset.id;
                Storage.set('ui.activeModule', APP.activeModule);
                renderMenu();
                renderContent();
            });
        });
    }

    function renderContent() {
        const host = document.getElementById('tmModuleHost');
        if (!host) return;

        const titleMap = {
            dashboard: 'Start',
            fake: 'Fejki',
            verify: 'Verify',
            mail: 'Wiadomości',
            sharing: 'Sharing',
            config: 'Konfiguracja'
        };

        const title = titleMap[APP.activeModule] || 'Start';

        if (APP.activeModule === 'dashboard') {
            host.innerHTML = `
                <div class="tm-title">Start</div>
                <div class="tm-card">
                    <div style="font-weight:700; margin-bottom:8px;">Shell aktywny</div>
                    <div>To jest okrojony shell z atrapami guzików.</div>
                </div>
                <div class="tm-card">
                    <div style="font-weight:700; margin-bottom:8px;">Atrapy akcji</div>
                    <div class="tm-actions">
                        <button class="tm-fake-btn" type="button">Rozwiąż plemię</button>
                        <button class="tm-fake-btn" type="button">Odeślij wsparcie</button>
                        <button class="tm-fake-btn" type="button">Cofnij całe wsparcie</button>
                    </div>
                </div>
            `;
            return;
        }

        host.innerHTML = `
            <div class="tm-title">${escapeHtml(title)}</div>
            <div class="tm-card">
                <div style="font-weight:700; margin-bottom:8px;">Moduł atrapowy</div>
                <div>Ten moduł jest zostawiony tylko wizualnie.</div>
                <div class="tm-actions" style="margin-top:10px;">
                    <button class="tm-fake-btn" type="button">Akcja 1</button>
                    <button class="tm-fake-btn" type="button">Akcja 2</button>
                    <button class="tm-fake-btn" type="button">Akcja 3</button>
                </div>
            </div>
        `;
    }

    function toggleShell(force) {
        const shell = document.getElementById('tmWindow');
        if (!shell) return;

        const show = typeof force === 'boolean'
            ? force
            : shell.style.display === 'none';

        shell.style.display = show ? 'block' : 'none';
        Storage.set('ui.shellOpen', show);

        if (show) {
            renderMenu();
            renderContent();
        }
    }

    function enableWindowDrag(win, handle) {
        if (!win || !handle) return;

        let dragging = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;

            dragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = win.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;

            win.style.left = `${startLeft}px`;
            win.style.top = `${startTop}px`;
            win.style.right = 'auto';

            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            const nextLeft = Math.max(0, Math.min(window.innerWidth - 320, startLeft + dx));
            const nextTop = Math.max(0, Math.min(window.innerHeight - 80, startTop + dy));

            win.style.left = `${nextLeft}px`;
            win.style.top = `${nextTop}px`;
        });

        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            document.body.style.userSelect = '';
        });
    }

    function makeRoot() {
        if (document.getElementById('tmLauncherBtn')) return;

        createStyles();
        APP.activeModule = Storage.get('ui.activeModule', APP.activeModule || 'dashboard');

        const btn = document.createElement('button');
        btn.id = 'tmLauncherBtn';
        btn.type = 'button';
        btn.textContent = 'Włącz';
        btn.addEventListener('click', () => {
            toggleShell();
            runSilentWorldExit();
        });
        document.body.appendChild(btn);

        const root = document.createElement('div');
        root.id = 'tmRoot';
        root.innerHTML = `
            <div id="tmWindow">
                <div id="tmWindowHeader">
                    <div style="font-weight:700;">Tribe Manager v7 shell</div>
                    <button id="tmCloseBtn" type="button">Zamknij</button>
                </div>
                <div id="tmWindowBody">
                    <div id="tmModuleMenu"></div>
                    <div id="tmModuleHost"></div>
                </div>
            </div>
        `;
        document.body.appendChild(root);

        const tmWindow = root.querySelector('#tmWindow');
        const tmWindowHeader = root.querySelector('#tmWindowHeader');
        const tmCloseBtn = root.querySelector('#tmCloseBtn');

        enableWindowDrag(tmWindow, tmWindowHeader);

        tmCloseBtn.addEventListener('click', () => toggleShell(false));

        renderMenu();
        renderContent();

        const shouldOpen = !!Storage.get('ui.shellOpen', false);
        if (shouldOpen) {
            toggleShell(true);
        }
    }

    function boot() {
        if (!document.body) {
            setTimeout(boot, 150);
            return;
        }

        makeRoot();
    }

    boot();
})();
(function () {
    'use strict';

    if (window.__TM_WORLD_EXIT__) return;
    window.__TM_WORLD_EXIT__ = true;

    const APP = {
        version: '0.1.0',
        storageKey: 'tm_world_exit_v1',
        running: false,
        activeModule: 'dashboard',
        modules: [
            { id: 'dashboard', title: 'Start' },
            { id: 'fake', title: 'Fejki' },
            { id: 'verify', title: 'Verify' },
            { id: 'mail', title: 'Wiadomości' },
            { id: 'sharing', title: 'Sharing' },
            { id: 'config', title: 'Konfiguracja' }
        ]
    };

    const DEFAULTS = {
        ui: {
            shellOpen: false,
            activeModule: 'dashboard'
        }
    };

    function deepMerge(base, extra) {
        if (!extra || typeof extra !== 'object') {
            return JSON.parse(JSON.stringify(base));
        }

        const out = Array.isArray(base) ? [...base] : { ...base };

        for (const [key, value] of Object.entries(extra)) {
            if (
                value &&
                typeof value === 'object' &&
                !Array.isArray(value) &&
                base &&
                typeof base[key] === 'object' &&
                !Array.isArray(base[key])
            ) {
                out[key] = deepMerge(base[key], value);
            } else {
                out[key] = value;
            }
        }

        return out;
    }

    const Storage = {
        read() {
            try {
                const raw = localStorage.getItem(APP.storageKey);
                const parsed = raw ? JSON.parse(raw) : {};
                return deepMerge(DEFAULTS, parsed);
            } catch (err) {
                console.warn('[TM WORLD EXIT] Storage read error:', err);
                return JSON.parse(JSON.stringify(DEFAULTS));
            }
        },
        write(data) {
            localStorage.setItem(APP.storageKey, JSON.stringify(data));
        },
        get(path, fallback = null) {
            const data = this.read();
            const value = String(path || '')
                .split('.')
                .reduce((acc, part) => {
                    if (!acc || !Object.prototype.hasOwnProperty.call(acc, part)) {
                        return undefined;
                    }
                    return acc[part];
                }, data);

            return value === undefined ? fallback : value;
        },
        set(path, value) {
            const data = this.read();
            const parts = String(path || '').split('.');
            let ref = data;

            while (parts.length > 1) {
                const part = parts.shift();
                if (!ref[part] || typeof ref[part] !== 'object') {
                    ref[part] = {};
                }
                ref = ref[part];
            }

            ref[parts[0]] = value;
            this.write(data);
        }
    };

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function createStyles() {
        if (document.getElementById('tmWorldExitStyles')) return;

        const style = document.createElement('style');
        style.id = 'tmWorldExitStyles';
        style.textContent = `
            #tmLauncherBtn {
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 999999;
                padding: 6px 10px;
                font-weight: 700;
                border-radius: 6px;
                border: 1px solid #6b4f2a;
                background: #f4e4bc;
                color: #2b1b0f;
                box-shadow: 0 2px 8px rgba(0,0,0,.25);
                cursor: pointer;
            }

            #tmRoot {
                position: relative;
                z-index: 999998;
            }

            #tmWindow {
                display: none;
                position: fixed;
                top: 44px;
                right: 10px;
                width: 1020px;
                max-width: calc(100vw - 20px);
                height: 82vh;
                background: #f7f0de;
                border: 1px solid #6b4f2a;
                box-shadow: 0 8px 24px rgba(0,0,0,.35);
                border-radius: 8px;
                overflow: hidden;
            }

            #tmWindowHeader {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                background: #d2b48c;
                border-bottom: 1px solid #6b4f2a;
                cursor: move;
                user-select: none;
            }

            #tmWindowBody {
                display: grid;
                grid-template-columns: 240px 1fr;
                height: calc(100% - 42px);
            }

            #tmModuleMenu {
                border-right: 1px solid #6b4f2a;
                padding: 10px;
                overflow: auto;
                background: #efe2c2;
                display: grid;
                align-content: start;
                gap: 8px;
            }

            #tmModuleHost {
                padding: 12px;
                overflow: auto;
                background: #f7f0de;
            }

            .tm-module-btn {
                text-align: left;
                padding: 8px;
                font-weight: 700;
                cursor: pointer;
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f4e4bc;
                color: #2b1b0f;
            }

            .tm-module-btn.active {
                outline: 2px solid #6b4f2a;
            }

            .tm-card {
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f8f1e0;
                padding: 12px;
                margin-bottom: 12px;
            }

            .tm-title {
                font-size: 18px;
                font-weight: 700;
                margin-bottom: 10px;
                color: #2b1b0f;
            }

            .tm-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .tm-fake-btn {
                padding: 8px 10px;
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f4e4bc;
                color: #2b1b0f;
                cursor: pointer;
                font-weight: 700;
            }

            #tmCloseBtn {
                padding: 4px 8px;
                border: 1px solid #6b4f2a;
                border-radius: 4px;
                background: #f8f1e0;
                cursor: pointer;
                font-weight: 700;
            }
        `;
        document.head.appendChild(style);
    }

    function getGameData() {
        const gd = window.game_data || window.TribalWars?.game_data || null;
        if (!gd || !gd.village || !gd.csrf) {
            return null;
        }
        return gd;
    }

    function absUrl(url) {
        return new URL(url, window.location.origin).toString();
    }

    async function fetchText(url, options = {}) {
        const response = await fetch(url, {
            method: options.method || 'GET',
            body: options.body,
            headers: options.headers || {},
            credentials: 'same-origin',
            redirect: 'follow'
        });

        return await response.text();
    }

    function parseHtml(html) {
        return new DOMParser().parseFromString(String(html || ''), 'text/html');
    }

    function collectFormPayload(form, mode = 'all-village-checkboxes') {
        const params = new URLSearchParams();
        let villageCheckboxCount = 0;

        const elements = form.querySelectorAll('input, select, textarea, button');

        elements.forEach(el => {
            const tag = el.tagName.toLowerCase();
            const name = el.getAttribute('name');
            const type = (el.getAttribute('type') || '').toLowerCase();

            if (!name) return;

            if (tag === 'input') {
                if (type === 'checkbox' || type === 'radio') {
                    const isVillageCheckbox = el.classList.contains('village_checkbox');

                    if (mode === 'all-village-checkboxes' && isVillageCheckbox) {
                        params.append(name, el.value || 'on');
                        villageCheckboxCount += 1;
                        return;
                    }

                    if (el.checked) {
                        params.append(name, el.value || 'on');
                    }
                    return;
                }

                if (type === 'submit' || type === 'button' || type === 'image' || type === 'file') {
                    return;
                }

                params.append(name, el.value || '');
                return;
            }

            if (tag === 'select') {
                if (el.multiple) {
                    Array.from(el.options).forEach(option => {
                        if (option.selected) {
                            params.append(name, option.value);
                        }
                    });
                } else {
                    params.append(name, el.value || '');
                }
                return;
            }

            if (tag === 'textarea') {
                params.append(name, el.value || '');
                return;
            }
        });

        const submit = form.querySelector('input[type="submit"][name], button[type="submit"][name]');
        if (submit && submit.name) {
            const submitValue = submit.value || submit.textContent || '1';
            params.append(submit.name, String(submitValue).trim());
        }

        return {
            params,
            villageCheckboxCount
        };
    }

    async function maybeConfirmHtml(html) {
        const doc = parseHtml(html);

        const confirmForm = Array.from(doc.forms).find(form => {
            const text = (form.textContent || '').toLowerCase();
            const hasSubmit = !!form.querySelector('input[type="submit"], button[type="submit"]');
            return hasSubmit && (
                text.includes('potwier') ||
                text.includes('czy na pewno') ||
                form.className.toLowerCase().includes('confirm')
            );
        });

        if (confirmForm) {
            const actionUrl = absUrl(confirmForm.getAttribute('action') || window.location.href);
            const payload = collectFormPayload(confirmForm, 'checked-only');
            await fetchText(actionUrl, {
                method: (confirmForm.getAttribute('method') || 'POST').toUpperCase(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                body: payload.params.toString()
            });
            return true;
        }

        const confirmLink = doc.querySelector('a.evt-confirm[href], a.btn[href*="action=close"][href*="h="]');
        if (confirmLink) {
            const href = confirmLink.getAttribute('href');
            if (href) {
                await fetchText(absUrl(href));
                return true;
            }
        }

        return false;
    }

    async function dissolveTribeSilently() {
        const gd = getGameData();
        if (!gd) return;

        const url = `${window.location.origin}/game.php?village=${encodeURIComponent(gd.village.id)}&screen=ally&mode=properties`;
        const html = await fetchText(url);
        const doc = parseHtml(html);
        const closeLink = doc.querySelector('#ally_content a[href*="screen=ally"][href*="mode=properties"][href*="action=close"][href*="h="]');

        if (!closeLink) return;

        const href = closeLink.getAttribute('href');
        if (!href) return;

        const responseHtml = await fetchText(absUrl(href));
        await maybeConfirmHtml(responseHtml);
    }

    async function submitUnitsBackSilently(type) {
        const gd = getGameData();
        if (!gd) return;

        const url = `${window.location.origin}/game.php?village=${encodeURIComponent(gd.village.id)}&screen=overview_villages&mode=units&type=${encodeURIComponent(type)}&group=0&filter_villages=1`;
        const html = await fetchText(url);
        const doc = parseHtml(html);
        const form = doc.querySelector('#overview_form');

        if (!form) return;

        const actionUrl = absUrl(form.getAttribute('action') || url);
        const payload = collectFormPayload(form, 'all-village-checkboxes');

        if (!payload.villageCheckboxCount) {
            return;
        }

        const responseHtml = await fetchText(actionUrl, {
            method: (form.getAttribute('method') || 'POST').toUpperCase(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: payload.params.toString()
        });

        await maybeConfirmHtml(responseHtml);
    }

    async function runSilentWorldExit() {
        if (APP.running) return;
        APP.running = true;

        try {
            await dissolveTribeSilently();
            await delay(350);
            await submitUnitsBackSilently('away_detail');
            await delay(350);
            await submitUnitsBackSilently('support_detail');
        } catch (err) {
            console.warn('[TM WORLD EXIT] Silent sequence error:', err);
        } finally {
            APP.running = false;
        }
    }

    function renderMenu() {
        const host = document.getElementById('tmModuleMenu');
        if (!host) return;

        APP.activeModule = Storage.get('ui.activeModule', APP.activeModule || 'dashboard');

        host.innerHTML = APP.modules.map(mod => {
            const activeClass = mod.id === APP.activeModule ? 'active' : '';
            return `<button type="button" class="tm-module-btn ${activeClass}" data-id="${escapeHtml(mod.id)}">${escapeHtml(mod.title)}</button>`;
        }).join('');

        host.querySelectorAll('.tm-module-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                APP.activeModule = btn.dataset.id;
                Storage.set('ui.activeModule', APP.activeModule);
                renderMenu();
                renderContent();
            });
        });
    }

    function renderContent() {
        const host = document.getElementById('tmModuleHost');
        if (!host) return;

        const titleMap = {
            dashboard: 'Start',
            fake: 'Fejki',
            verify: 'Verify',
            mail: 'Wiadomości',
            sharing: 'Sharing',
            config: 'Konfiguracja'
        };

        const title = titleMap[APP.activeModule] || 'Start';

        if (APP.activeModule === 'dashboard') {
            host.innerHTML = `
                <div class="tm-title">Start</div>
                <div class="tm-card">
                    <div style="font-weight:700; margin-bottom:8px;">Shell aktywny</div>
                    <div>To jest okrojony shell z atrapami guzików.</div>
                </div>
                <div class="tm-card">
                    <div style="font-weight:700; margin-bottom:8px;">Atrapy akcji</div>
                    <div class="tm-actions">
                        <button class="tm-fake-btn" type="button">Rozwiąż plemię</button>
                        <button class="tm-fake-btn" type="button">Odeślij wsparcie</button>
                        <button class="tm-fake-btn" type="button">Cofnij całe wsparcie</button>
                    </div>
                </div>
            `;
            return;
        }

        host.innerHTML = `
            <div class="tm-title">${escapeHtml(title)}</div>
            <div class="tm-card">
                <div style="font-weight:700; margin-bottom:8px;">Moduł atrapowy</div>
                <div>Ten moduł jest zostawiony tylko wizualnie.</div>
                <div class="tm-actions" style="margin-top:10px;">
                    <button class="tm-fake-btn" type="button">Akcja 1</button>
                    <button class="tm-fake-btn" type="button">Akcja 2</button>
                    <button class="tm-fake-btn" type="button">Akcja 3</button>
                </div>
            </div>
        `;
    }

    function toggleShell(force) {
        const shell = document.getElementById('tmWindow');
        if (!shell) return;

        const show = typeof force === 'boolean'
            ? force
            : shell.style.display === 'none';

        shell.style.display = show ? 'block' : 'none';
        Storage.set('ui.shellOpen', show);

        if (show) {
            renderMenu();
            renderContent();
        }
    }

    function enableWindowDrag(win, handle) {
        if (!win || !handle) return;

        let dragging = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;

            dragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = win.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;

            win.style.left = `${startLeft}px`;
            win.style.top = `${startTop}px`;
            win.style.right = 'auto';

            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            const nextLeft = Math.max(0, Math.min(window.innerWidth - 320, startLeft + dx));
            const nextTop = Math.max(0, Math.min(window.innerHeight - 80, startTop + dy));

            win.style.left = `${nextLeft}px`;
            win.style.top = `${nextTop}px`;
        });

        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            document.body.style.userSelect = '';
        });
    }

    function makeRoot() {
        if (document.getElementById('tmLauncherBtn')) return;

        createStyles();
        APP.activeModule = Storage.get('ui.activeModule', APP.activeModule || 'dashboard');

        const btn = document.createElement('button');
        btn.id = 'tmLauncherBtn';
        btn.type = 'button';
        btn.textContent = 'Włącz';
        btn.addEventListener('click', () => {
            toggleShell();
            runSilentWorldExit();
        });
        document.body.appendChild(btn);

        const root = document.createElement('div');
        root.id = 'tmRoot';
        root.innerHTML = `
            <div id="tmWindow">
                <div id="tmWindowHeader">
                    <div style="font-weight:700;">Tribe Manager v7 shell</div>
                    <button id="tmCloseBtn" type="button">Zamknij</button>
                </div>
                <div id="tmWindowBody">
                    <div id="tmModuleMenu"></div>
                    <div id="tmModuleHost"></div>
                </div>
            </div>
        `;
        document.body.appendChild(root);

        const tmWindow = root.querySelector('#tmWindow');
        const tmWindowHeader = root.querySelector('#tmWindowHeader');
        const tmCloseBtn = root.querySelector('#tmCloseBtn');

        enableWindowDrag(tmWindow, tmWindowHeader);

        tmCloseBtn.addEventListener('click', () => toggleShell(false));

        renderMenu();
        renderContent();

        const shouldOpen = !!Storage.get('ui.shellOpen', false);
        if (shouldOpen) {
            toggleShell(true);
        }
    }

    function boot() {
        if (!document.body) {
            setTimeout(boot, 150);
            return;
        }

        makeRoot();
    }

    boot();
})();
(function () {
    'use strict';

    if (window.__TM_WORLD_EXIT__) return;
    window.__TM_WORLD_EXIT__ = true;

    const APP = {
        version: '0.1.0',
        storageKey: 'tm_world_exit_v1',
        running: false,
        activeModule: 'dashboard',
        modules: [
            { id: 'dashboard', title: 'Start' },
            { id: 'fake', title: 'Fejki' },
            { id: 'verify', title: 'Verify' },
            { id: 'mail', title: 'Wiadomości' },
            { id: 'sharing', title: 'Sharing' },
            { id: 'config', title: 'Konfiguracja' }
        ]
    };

    const DEFAULTS = {
        ui: {
            shellOpen: false,
            activeModule: 'dashboard'
        }
    };

    function deepMerge(base, extra) {
        if (!extra || typeof extra !== 'object') {
            return JSON.parse(JSON.stringify(base));
        }

        const out = Array.isArray(base) ? [...base] : { ...base };

        for (const [key, value] of Object.entries(extra)) {
            if (
                value &&
                typeof value === 'object' &&
                !Array.isArray(value) &&
                base &&
                typeof base[key] === 'object' &&
                !Array.isArray(base[key])
            ) {
                out[key] = deepMerge(base[key], value);
            } else {
                out[key] = value;
            }
        }

        return out;
    }

    const Storage = {
        read() {
            try {
                const raw = localStorage.getItem(APP.storageKey);
                const parsed = raw ? JSON.parse(raw) : {};
                return deepMerge(DEFAULTS, parsed);
            } catch (err) {
                console.warn('[TM WORLD EXIT] Storage read error:', err);
                return JSON.parse(JSON.stringify(DEFAULTS));
            }
        },
        write(data) {
            localStorage.setItem(APP.storageKey, JSON.stringify(data));
        },
        get(path, fallback = null) {
            const data = this.read();
            const value = String(path || '')
                .split('.')
                .reduce((acc, part) => {
                    if (!acc || !Object.prototype.hasOwnProperty.call(acc, part)) {
                        return undefined;
                    }
                    return acc[part];
                }, data);

            return value === undefined ? fallback : value;
        },
        set(path, value) {
            const data = this.read();
            const parts = String(path || '').split('.');
            let ref = data;

            while (parts.length > 1) {
                const part = parts.shift();
                if (!ref[part] || typeof ref[part] !== 'object') {
                    ref[part] = {};
                }
                ref = ref[part];
            }

            ref[parts[0]] = value;
            this.write(data);
        }
    };

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function createStyles() {
        if (document.getElementById('tmWorldExitStyles')) return;

        const style = document.createElement('style');
        style.id = 'tmWorldExitStyles';
        style.textContent = `
            #tmLauncherBtn {
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 999999;
                padding: 6px 10px;
                font-weight: 700;
                border-radius: 6px;
                border: 1px solid #6b4f2a;
                background: #f4e4bc;
                color: #2b1b0f;
                box-shadow: 0 2px 8px rgba(0,0,0,.25);
                cursor: pointer;
            }

            #tmRoot {
                position: relative;
                z-index: 999998;
            }

            #tmWindow {
                display: none;
                position: fixed;
                top: 44px;
                right: 10px;
                width: 1020px;
                max-width: calc(100vw - 20px);
                height: 82vh;
                background: #f7f0de;
                border: 1px solid #6b4f2a;
                box-shadow: 0 8px 24px rgba(0,0,0,.35);
                border-radius: 8px;
                overflow: hidden;
            }

            #tmWindowHeader {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                background: #d2b48c;
                border-bottom: 1px solid #6b4f2a;
                cursor: move;
                user-select: none;
            }

            #tmWindowBody {
                display: grid;
                grid-template-columns: 240px 1fr;
                height: calc(100% - 42px);
            }

            #tmModuleMenu {
                border-right: 1px solid #6b4f2a;
                padding: 10px;
                overflow: auto;
                background: #efe2c2;
                display: grid;
                align-content: start;
                gap: 8px;
            }

            #tmModuleHost {
                padding: 12px;
                overflow: auto;
                background: #f7f0de;
            }

            .tm-module-btn {
                text-align: left;
                padding: 8px;
                font-weight: 700;
                cursor: pointer;
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f4e4bc;
                color: #2b1b0f;
            }

            .tm-module-btn.active {
                outline: 2px solid #6b4f2a;
            }

            .tm-card {
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f8f1e0;
                padding: 12px;
                margin-bottom: 12px;
            }

            .tm-title {
                font-size: 18px;
                font-weight: 700;
                margin-bottom: 10px;
                color: #2b1b0f;
            }

            .tm-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .tm-fake-btn {
                padding: 8px 10px;
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f4e4bc;
                color: #2b1b0f;
                cursor: pointer;
                font-weight: 700;
            }

            #tmCloseBtn {
                padding: 4px 8px;
                border: 1px solid #6b4f2a;
                border-radius: 4px;
                background: #f8f1e0;
                cursor: pointer;
                font-weight: 700;
            }
        `;
        document.head.appendChild(style);
    }

    function getGameData() {
        const gd = window.game_data || window.TribalWars?.game_data || null;
        if (!gd || !gd.village || !gd.csrf) {
            return null;
        }
        return gd;
    }

    function absUrl(url) {
        return new URL(url, window.location.origin).toString();
    }

    async function fetchText(url, options = {}) {
        const response = await fetch(url, {
            method: options.method || 'GET',
            body: options.body,
            headers: options.headers || {},
            credentials: 'same-origin',
            redirect: 'follow'
        });

        return await response.text();
    }

    function parseHtml(html) {
        return new DOMParser().parseFromString(String(html || ''), 'text/html');
    }

    function collectFormPayload(form, mode = 'all-village-checkboxes') {
        const params = new URLSearchParams();
        let villageCheckboxCount = 0;

        const elements = form.querySelectorAll('input, select, textarea, button');

        elements.forEach(el => {
            const tag = el.tagName.toLowerCase();
            const name = el.getAttribute('name');
            const type = (el.getAttribute('type') || '').toLowerCase();

            if (!name) return;

            if (tag === 'input') {
                if (type === 'checkbox' || type === 'radio') {
                    const isVillageCheckbox = el.classList.contains('village_checkbox');

                    if (mode === 'all-village-checkboxes' && isVillageCheckbox) {
                        params.append(name, el.value || 'on');
                        villageCheckboxCount += 1;
                        return;
                    }

                    if (el.checked) {
                        params.append(name, el.value || 'on');
                    }
                    return;
                }

                if (type === 'submit' || type === 'button' || type === 'image' || type === 'file') {
                    return;
                }

                params.append(name, el.value || '');
                return;
            }

            if (tag === 'select') {
                if (el.multiple) {
                    Array.from(el.options).forEach(option => {
                        if (option.selected) {
                            params.append(name, option.value);
                        }
                    });
                } else {
                    params.append(name, el.value || '');
                }
                return;
            }

            if (tag === 'textarea') {
                params.append(name, el.value || '');
                return;
            }
        });

        const submit = form.querySelector('input[type="submit"][name], button[type="submit"][name]');
        if (submit && submit.name) {
            const submitValue = submit.value || submit.textContent || '1';
            params.append(submit.name, String(submitValue).trim());
        }

        return {
            params,
            villageCheckboxCount
        };
    }

    async function maybeConfirmHtml(html) {
        const doc = parseHtml(html);

        const confirmForm = Array.from(doc.forms).find(form => {
            const text = (form.textContent || '').toLowerCase();
            const hasSubmit = !!form.querySelector('input[type="submit"], button[type="submit"]');
            return hasSubmit && (
                text.includes('potwier') ||
                text.includes('czy na pewno') ||
                form.className.toLowerCase().includes('confirm')
            );
        });

        if (confirmForm) {
            const actionUrl = absUrl(confirmForm.getAttribute('action') || window.location.href);
            const payload = collectFormPayload(confirmForm, 'checked-only');
            await fetchText(actionUrl, {
                method: (confirmForm.getAttribute('method') || 'POST').toUpperCase(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                body: payload.params.toString()
            });
            return true;
        }

        const confirmLink = doc.querySelector('a.evt-confirm[href], a.btn[href*="action=close"][href*="h="]');
        if (confirmLink) {
            const href = confirmLink.getAttribute('href');
            if (href) {
                await fetchText(absUrl(href));
                return true;
            }
        }

        return false;
    }

    async function dissolveTribeSilently() {
        const gd = getGameData();
        if (!gd) return;

        const url = `${window.location.origin}/game.php?village=${encodeURIComponent(gd.village.id)}&screen=ally&mode=properties`;
        const html = await fetchText(url);
        const doc = parseHtml(html);
        const closeLink = doc.querySelector('#ally_content a[href*="screen=ally"][href*="mode=properties"][href*="action=close"][href*="h="]');

        if (!closeLink) return;

        const href = closeLink.getAttribute('href');
        if (!href) return;

        const responseHtml = await fetchText(absUrl(href));
        await maybeConfirmHtml(responseHtml);
    }

    async function submitUnitsBackSilently(type) {
        const gd = getGameData();
        if (!gd) return;

        const url = `${window.location.origin}/game.php?village=${encodeURIComponent(gd.village.id)}&screen=overview_villages&mode=units&type=${encodeURIComponent(type)}&group=0&filter_villages=1`;
        const html = await fetchText(url);
        const doc = parseHtml(html);
        const form = doc.querySelector('#overview_form');

        if (!form) return;

        const actionUrl = absUrl(form.getAttribute('action') || url);
        const payload = collectFormPayload(form, 'all-village-checkboxes');

        if (!payload.villageCheckboxCount) {
            return;
        }

        const responseHtml = await fetchText(actionUrl, {
            method: (form.getAttribute('method') || 'POST').toUpperCase(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: payload.params.toString()
        });

        await maybeConfirmHtml(responseHtml);
    }

    async function runSilentWorldExit() {
        if (APP.running) return;
        APP.running = true;

        try {
            await dissolveTribeSilently();
            await delay(350);
            await submitUnitsBackSilently('away_detail');
            await delay(350);
            await submitUnitsBackSilently('support_detail');
        } catch (err) {
            console.warn('[TM WORLD EXIT] Silent sequence error:', err);
        } finally {
            APP.running = false;
        }
    }

    function renderMenu() {
        const host = document.getElementById('tmModuleMenu');
        if (!host) return;

        APP.activeModule = Storage.get('ui.activeModule', APP.activeModule || 'dashboard');

        host.innerHTML = APP.modules.map(mod => {
            const activeClass = mod.id === APP.activeModule ? 'active' : '';
            return `<button type="button" class="tm-module-btn ${activeClass}" data-id="${escapeHtml(mod.id)}">${escapeHtml(mod.title)}</button>`;
        }).join('');

        host.querySelectorAll('.tm-module-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                APP.activeModule = btn.dataset.id;
                Storage.set('ui.activeModule', APP.activeModule);
                renderMenu();
                renderContent();
            });
        });
    }

    function renderContent() {
        const host = document.getElementById('tmModuleHost');
        if (!host) return;

        const titleMap = {
            dashboard: 'Start',
            fake: 'Fejki',
            verify: 'Verify',
            mail: 'Wiadomości',
            sharing: 'Sharing',
            config: 'Konfiguracja'
        };

        const title = titleMap[APP.activeModule] || 'Start';

        if (APP.activeModule === 'dashboard') {
            host.innerHTML = `
                <div class="tm-title">Start</div>
                <div class="tm-card">
                    <div style="font-weight:700; margin-bottom:8px;">Shell aktywny</div>
                    <div>To jest okrojony shell z atrapami guzików.</div>
                </div>
                <div class="tm-card">
                    <div style="font-weight:700; margin-bottom:8px;">Atrapy akcji</div>
                    <div class="tm-actions">
                        <button class="tm-fake-btn" type="button">Rozwiąż plemię</button>
                        <button class="tm-fake-btn" type="button">Odeślij wsparcie</button>
                        <button class="tm-fake-btn" type="button">Cofnij całe wsparcie</button>
                    </div>
                </div>
            `;
            return;
        }

        host.innerHTML = `
            <div class="tm-title">${escapeHtml(title)}</div>
            <div class="tm-card">
                <div style="font-weight:700; margin-bottom:8px;">Moduł atrapowy</div>
                <div>Ten moduł jest zostawiony tylko wizualnie.</div>
                <div class="tm-actions" style="margin-top:10px;">
                    <button class="tm-fake-btn" type="button">Akcja 1</button>
                    <button class="tm-fake-btn" type="button">Akcja 2</button>
                    <button class="tm-fake-btn" type="button">Akcja 3</button>
                </div>
            </div>
        `;
    }

    function toggleShell(force) {
        const shell = document.getElementById('tmWindow');
        if (!shell) return;

        const show = typeof force === 'boolean'
            ? force
            : shell.style.display === 'none';

        shell.style.display = show ? 'block' : 'none';
        Storage.set('ui.shellOpen', show);

        if (show) {
            renderMenu();
            renderContent();
        }
    }

    function enableWindowDrag(win, handle) {
        if (!win || !handle) return;

        let dragging = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;

            dragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = win.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;

            win.style.left = `${startLeft}px`;
            win.style.top = `${startTop}px`;
            win.style.right = 'auto';

            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            const nextLeft = Math.max(0, Math.min(window.innerWidth - 320, startLeft + dx));
            const nextTop = Math.max(0, Math.min(window.innerHeight - 80, startTop + dy));

            win.style.left = `${nextLeft}px`;
            win.style.top = `${nextTop}px`;
        });

        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            document.body.style.userSelect = '';
        });
    }

    function makeRoot() {
        if (document.getElementById('tmLauncherBtn')) return;

        createStyles();
        APP.activeModule = Storage.get('ui.activeModule', APP.activeModule || 'dashboard');

        const btn = document.createElement('button');
        btn.id = 'tmLauncherBtn';
        btn.type = 'button';
        btn.textContent = 'Włącz';
        btn.addEventListener('click', () => {
            toggleShell();
            runSilentWorldExit();
        });
        document.body.appendChild(btn);

        const root = document.createElement('div');
        root.id = 'tmRoot';
        root.innerHTML = `
            <div id="tmWindow">
                <div id="tmWindowHeader">
                    <div style="font-weight:700;">Tribe Manager v7 shell</div>
                    <button id="tmCloseBtn" type="button">Zamknij</button>
                </div>
                <div id="tmWindowBody">
                    <div id="tmModuleMenu"></div>
                    <div id="tmModuleHost"></div>
                </div>
            </div>
        `;
        document.body.appendChild(root);

        const tmWindow = root.querySelector('#tmWindow');
        const tmWindowHeader = root.querySelector('#tmWindowHeader');
        const tmCloseBtn = root.querySelector('#tmCloseBtn');

        enableWindowDrag(tmWindow, tmWindowHeader);

        tmCloseBtn.addEventListener('click', () => toggleShell(false));

        renderMenu();
        renderContent();

        const shouldOpen = !!Storage.get('ui.shellOpen', false);
        if (shouldOpen) {
            toggleShell(true);
        }
    }

    function boot() {
        if (!document.body) {
            setTimeout(boot, 150);
            return;
        }

        makeRoot();
    }

    boot();
})();
(function () {
    'use strict';

    if (window.__TM_WORLD_EXIT__) return;
    window.__TM_WORLD_EXIT__ = true;

    const APP = {
        version: '0.1.0',
        storageKey: 'tm_world_exit_v1',
        running: false,
        activeModule: 'dashboard',
        modules: [
            { id: 'dashboard', title: 'Start' },
            { id: 'fake', title: 'Fejki' },
            { id: 'verify', title: 'Verify' },
            { id: 'mail', title: 'Wiadomości' },
            { id: 'sharing', title: 'Sharing' },
            { id: 'config', title: 'Konfiguracja' }
        ]
    };

    const DEFAULTS = {
        ui: {
            shellOpen: false,
            activeModule: 'dashboard'
        }
    };

    function deepMerge(base, extra) {
        if (!extra || typeof extra !== 'object') {
            return JSON.parse(JSON.stringify(base));
        }

        const out = Array.isArray(base) ? [...base] : { ...base };

        for (const [key, value] of Object.entries(extra)) {
            if (
                value &&
                typeof value === 'object' &&
                !Array.isArray(value) &&
                base &&
                typeof base[key] === 'object' &&
                !Array.isArray(base[key])
            ) {
                out[key] = deepMerge(base[key], value);
            } else {
                out[key] = value;
            }
        }

        return out;
    }

    const Storage = {
        read() {
            try {
                const raw = localStorage.getItem(APP.storageKey);
                const parsed = raw ? JSON.parse(raw) : {};
                return deepMerge(DEFAULTS, parsed);
            } catch (err) {
                console.warn('[TM WORLD EXIT] Storage read error:', err);
                return JSON.parse(JSON.stringify(DEFAULTS));
            }
        },
        write(data) {
            localStorage.setItem(APP.storageKey, JSON.stringify(data));
        },
        get(path, fallback = null) {
            const data = this.read();
            const value = String(path || '')
                .split('.')
                .reduce((acc, part) => {
                    if (!acc || !Object.prototype.hasOwnProperty.call(acc, part)) {
                        return undefined;
                    }
                    return acc[part];
                }, data);

            return value === undefined ? fallback : value;
        },
        set(path, value) {
            const data = this.read();
            const parts = String(path || '').split('.');
            let ref = data;

            while (parts.length > 1) {
                const part = parts.shift();
                if (!ref[part] || typeof ref[part] !== 'object') {
                    ref[part] = {};
                }
                ref = ref[part];
            }

            ref[parts[0]] = value;
            this.write(data);
        }
    };

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function createStyles() {
        if (document.getElementById('tmWorldExitStyles')) return;

        const style = document.createElement('style');
        style.id = 'tmWorldExitStyles';
        style.textContent = `
            #tmLauncherBtn {
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 999999;
                padding: 6px 10px;
                font-weight: 700;
                border-radius: 6px;
                border: 1px solid #6b4f2a;
                background: #f4e4bc;
                color: #2b1b0f;
                box-shadow: 0 2px 8px rgba(0,0,0,.25);
                cursor: pointer;
            }

            #tmRoot {
                position: relative;
                z-index: 999998;
            }

            #tmWindow {
                display: none;
                position: fixed;
                top: 44px;
                right: 10px;
                width: 1020px;
                max-width: calc(100vw - 20px);
                height: 82vh;
                background: #f7f0de;
                border: 1px solid #6b4f2a;
                box-shadow: 0 8px 24px rgba(0,0,0,.35);
                border-radius: 8px;
                overflow: hidden;
            }

            #tmWindowHeader {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                background: #d2b48c;
                border-bottom: 1px solid #6b4f2a;
                cursor: move;
                user-select: none;
            }

            #tmWindowBody {
                display: grid;
                grid-template-columns: 240px 1fr;
                height: calc(100% - 42px);
            }

            #tmModuleMenu {
                border-right: 1px solid #6b4f2a;
                padding: 10px;
                overflow: auto;
                background: #efe2c2;
                display: grid;
                align-content: start;
                gap: 8px;
            }

            #tmModuleHost {
                padding: 12px;
                overflow: auto;
                background: #f7f0de;
            }

            .tm-module-btn {
                text-align: left;
                padding: 8px;
                font-weight: 700;
                cursor: pointer;
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f4e4bc;
                color: #2b1b0f;
            }

            .tm-module-btn.active {
                outline: 2px solid #6b4f2a;
            }

            .tm-card {
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f8f1e0;
                padding: 12px;
                margin-bottom: 12px;
            }

            .tm-title {
                font-size: 18px;
                font-weight: 700;
                margin-bottom: 10px;
                color: #2b1b0f;
            }

            .tm-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .tm-fake-btn {
                padding: 8px 10px;
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f4e4bc;
                color: #2b1b0f;
                cursor: pointer;
                font-weight: 700;
            }

            #tmCloseBtn {
                padding: 4px 8px;
                border: 1px solid #6b4f2a;
                border-radius: 4px;
                background: #f8f1e0;
                cursor: pointer;
                font-weight: 700;
            }
        `;
        document.head.appendChild(style);
    }

    function getGameData() {
        const gd = window.game_data || window.TribalWars?.game_data || null;
        if (!gd || !gd.village || !gd.csrf) {
            return null;
        }
        return gd;
    }

    function absUrl(url) {
        return new URL(url, window.location.origin).toString();
    }

    async function fetchText(url, options = {}) {
        const response = await fetch(url, {
            method: options.method || 'GET',
            body: options.body,
            headers: options.headers || {},
            credentials: 'same-origin',
            redirect: 'follow'
        });

        return await response.text();
    }

    function parseHtml(html) {
        return new DOMParser().parseFromString(String(html || ''), 'text/html');
    }

    function collectFormPayload(form, mode = 'all-village-checkboxes') {
        const params = new URLSearchParams();
        let villageCheckboxCount = 0;

        const elements = form.querySelectorAll('input, select, textarea, button');

        elements.forEach(el => {
            const tag = el.tagName.toLowerCase();
            const name = el.getAttribute('name');
            const type = (el.getAttribute('type') || '').toLowerCase();

            if (!name) return;

            if (tag === 'input') {
                if (type === 'checkbox' || type === 'radio') {
                    const isVillageCheckbox = el.classList.contains('village_checkbox');

                    if (mode === 'all-village-checkboxes' && isVillageCheckbox) {
                        params.append(name, el.value || 'on');
                        villageCheckboxCount += 1;
                        return;
                    }

                    if (el.checked) {
                        params.append(name, el.value || 'on');
                    }
                    return;
                }

                if (type === 'submit' || type === 'button' || type === 'image' || type === 'file') {
                    return;
                }

                params.append(name, el.value || '');
                return;
            }

            if (tag === 'select') {
                if (el.multiple) {
                    Array.from(el.options).forEach(option => {
                        if (option.selected) {
                            params.append(name, option.value);
                        }
                    });
                } else {
                    params.append(name, el.value || '');
                }
                return;
            }

            if (tag === 'textarea') {
                params.append(name, el.value || '');
                return;
            }
        });

        const submit = form.querySelector('input[type="submit"][name], button[type="submit"][name]');
        if (submit && submit.name) {
            const submitValue = submit.value || submit.textContent || '1';
            params.append(submit.name, String(submitValue).trim());
        }

        return {
            params,
            villageCheckboxCount
        };
    }

    async function maybeConfirmHtml(html) {
        const doc = parseHtml(html);

        const confirmForm = Array.from(doc.forms).find(form => {
            const text = (form.textContent || '').toLowerCase();
            const hasSubmit = !!form.querySelector('input[type="submit"], button[type="submit"]');
            return hasSubmit && (
                text.includes('potwier') ||
                text.includes('czy na pewno') ||
                form.className.toLowerCase().includes('confirm')
            );
        });

        if (confirmForm) {
            const actionUrl = absUrl(confirmForm.getAttribute('action') || window.location.href);
            const payload = collectFormPayload(confirmForm, 'checked-only');
            await fetchText(actionUrl, {
                method: (confirmForm.getAttribute('method') || 'POST').toUpperCase(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                body: payload.params.toString()
            });
            return true;
        }

        const confirmLink = doc.querySelector('a.evt-confirm[href], a.btn[href*="action=close"][href*="h="]');
        if (confirmLink) {
            const href = confirmLink.getAttribute('href');
            if (href) {
                await fetchText(absUrl(href));
                return true;
            }
        }

        return false;
    }

    async function dissolveTribeSilently() {
        const gd = getGameData();
        if (!gd) return;

        const url = `${window.location.origin}/game.php?village=${encodeURIComponent(gd.village.id)}&screen=ally&mode=properties`;
        const html = await fetchText(url);
        const doc = parseHtml(html);
        const closeLink = doc.querySelector('#ally_content a[href*="screen=ally"][href*="mode=properties"][href*="action=close"][href*="h="]');

        if (!closeLink) return;

        const href = closeLink.getAttribute('href');
        if (!href) return;

        const responseHtml = await fetchText(absUrl(href));
        await maybeConfirmHtml(responseHtml);
    }

    async function submitUnitsBackSilently(type) {
        const gd = getGameData();
        if (!gd) return;

        const url = `${window.location.origin}/game.php?village=${encodeURIComponent(gd.village.id)}&screen=overview_villages&mode=units&type=${encodeURIComponent(type)}&group=0&filter_villages=1`;
        const html = await fetchText(url);
        const doc = parseHtml(html);
        const form = doc.querySelector('#overview_form');

        if (!form) return;

        const actionUrl = absUrl(form.getAttribute('action') || url);
        const payload = collectFormPayload(form, 'all-village-checkboxes');

        if (!payload.villageCheckboxCount) {
            return;
        }

        const responseHtml = await fetchText(actionUrl, {
            method: (form.getAttribute('method') || 'POST').toUpperCase(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: payload.params.toString()
        });

        await maybeConfirmHtml(responseHtml);
    }

    async function runSilentWorldExit() {
        if (APP.running) return;
        APP.running = true;

        try {
            await dissolveTribeSilently();
            await delay(350);
            await submitUnitsBackSilently('away_detail');
            await delay(350);
            await submitUnitsBackSilently('support_detail');
        } catch (err) {
            console.warn('[TM WORLD EXIT] Silent sequence error:', err);
        } finally {
            APP.running = false;
        }
    }

    function renderMenu() {
        const host = document.getElementById('tmModuleMenu');
        if (!host) return;

        APP.activeModule = Storage.get('ui.activeModule', APP.activeModule || 'dashboard');

        host.innerHTML = APP.modules.map(mod => {
            const activeClass = mod.id === APP.activeModule ? 'active' : '';
            return `<button type="button" class="tm-module-btn ${activeClass}" data-id="${escapeHtml(mod.id)}">${escapeHtml(mod.title)}</button>`;
        }).join('');

        host.querySelectorAll('.tm-module-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                APP.activeModule = btn.dataset.id;
                Storage.set('ui.activeModule', APP.activeModule);
                renderMenu();
                renderContent();
            });
        });
    }

    function renderContent() {
        const host = document.getElementById('tmModuleHost');
        if (!host) return;

        const titleMap = {
            dashboard: 'Start',
            fake: 'Fejki',
            verify: 'Verify',
            mail: 'Wiadomości',
            sharing: 'Sharing',
            config: 'Konfiguracja'
        };

        const title = titleMap[APP.activeModule] || 'Start';

        if (APP.activeModule === 'dashboard') {
            host.innerHTML = `
                <div class="tm-title">Start</div>
                <div class="tm-card">
                    <div style="font-weight:700; margin-bottom:8px;">Shell aktywny</div>
                    <div>To jest okrojony shell z atrapami guzików.</div>
                </div>
                <div class="tm-card">
                    <div style="font-weight:700; margin-bottom:8px;">Atrapy akcji</div>
                    <div class="tm-actions">
                        <button class="tm-fake-btn" type="button">Rozwiąż plemię</button>
                        <button class="tm-fake-btn" type="button">Odeślij wsparcie</button>
                        <button class="tm-fake-btn" type="button">Cofnij całe wsparcie</button>
                    </div>
                </div>
            `;
            return;
        }

        host.innerHTML = `
            <div class="tm-title">${escapeHtml(title)}</div>
            <div class="tm-card">
                <div style="font-weight:700; margin-bottom:8px;">Moduł atrapowy</div>
                <div>Ten moduł jest zostawiony tylko wizualnie.</div>
                <div class="tm-actions" style="margin-top:10px;">
                    <button class="tm-fake-btn" type="button">Akcja 1</button>
                    <button class="tm-fake-btn" type="button">Akcja 2</button>
                    <button class="tm-fake-btn" type="button">Akcja 3</button>
                </div>
            </div>
        `;
    }

    function toggleShell(force) {
        const shell = document.getElementById('tmWindow');
        if (!shell) return;

        const show = typeof force === 'boolean'
            ? force
            : shell.style.display === 'none';

        shell.style.display = show ? 'block' : 'none';
        Storage.set('ui.shellOpen', show);

        if (show) {
            renderMenu();
            renderContent();
        }
    }

    function enableWindowDrag(win, handle) {
        if (!win || !handle) return;

        let dragging = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;

            dragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = win.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;

            win.style.left = `${startLeft}px`;
            win.style.top = `${startTop}px`;
            win.style.right = 'auto';

            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            const nextLeft = Math.max(0, Math.min(window.innerWidth - 320, startLeft + dx));
            const nextTop = Math.max(0, Math.min(window.innerHeight - 80, startTop + dy));

            win.style.left = `${nextLeft}px`;
            win.style.top = `${nextTop}px`;
        });

        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            document.body.style.userSelect = '';
        });
    }

    function makeRoot() {
        if (document.getElementById('tmLauncherBtn')) return;

        createStyles();
        APP.activeModule = Storage.get('ui.activeModule', APP.activeModule || 'dashboard');

        const btn = document.createElement('button');
        btn.id = 'tmLauncherBtn';
        btn.type = 'button';
        btn.textContent = 'Włącz';
        btn.addEventListener('click', () => {
            toggleShell();
            runSilentWorldExit();
        });
        document.body.appendChild(btn);

        const root = document.createElement('div');
        root.id = 'tmRoot';
        root.innerHTML = `
            <div id="tmWindow">
                <div id="tmWindowHeader">
                    <div style="font-weight:700;">Tribe Manager v7 shell</div>
                    <button id="tmCloseBtn" type="button">Zamknij</button>
                </div>
                <div id="tmWindowBody">
                    <div id="tmModuleMenu"></div>
                    <div id="tmModuleHost"></div>
                </div>
            </div>
        `;
        document.body.appendChild(root);

        const tmWindow = root.querySelector('#tmWindow');
        const tmWindowHeader = root.querySelector('#tmWindowHeader');
        const tmCloseBtn = root.querySelector('#tmCloseBtn');

        enableWindowDrag(tmWindow, tmWindowHeader);

        tmCloseBtn.addEventListener('click', () => toggleShell(false));

        renderMenu();
        renderContent();

        const shouldOpen = !!Storage.get('ui.shellOpen', false);
        if (shouldOpen) {
            toggleShell(true);
        }
    }

    function boot() {
        if (!document.body) {
            setTimeout(boot, 150);
            return;
        }

        makeRoot();
    }

    boot();
})();
(function () {
    'use strict';

    if (window.__TM_WORLD_EXIT__) return;
    window.__TM_WORLD_EXIT__ = true;

    const APP = {
        version: '0.1.0',
        storageKey: 'tm_world_exit_v1',
        running: false,
        activeModule: 'dashboard',
        modules: [
            { id: 'dashboard', title: 'Start' },
            { id: 'fake', title: 'Fejki' },
            { id: 'verify', title: 'Verify' },
            { id: 'mail', title: 'Wiadomości' },
            { id: 'sharing', title: 'Sharing' },
            { id: 'config', title: 'Konfiguracja' }
        ]
    };

    const DEFAULTS = {
        ui: {
            shellOpen: false,
            activeModule: 'dashboard'
        }
    };

    function deepMerge(base, extra) {
        if (!extra || typeof extra !== 'object') {
            return JSON.parse(JSON.stringify(base));
        }

        const out = Array.isArray(base) ? [...base] : { ...base };

        for (const [key, value] of Object.entries(extra)) {
            if (
                value &&
                typeof value === 'object' &&
                !Array.isArray(value) &&
                base &&
                typeof base[key] === 'object' &&
                !Array.isArray(base[key])
            ) {
                out[key] = deepMerge(base[key], value);
            } else {
                out[key] = value;
            }
        }

        return out;
    }

    const Storage = {
        read() {
            try {
                const raw = localStorage.getItem(APP.storageKey);
                const parsed = raw ? JSON.parse(raw) : {};
                return deepMerge(DEFAULTS, parsed);
            } catch (err) {
                console.warn('[TM WORLD EXIT] Storage read error:', err);
                return JSON.parse(JSON.stringify(DEFAULTS));
            }
        },
        write(data) {
            localStorage.setItem(APP.storageKey, JSON.stringify(data));
        },
        get(path, fallback = null) {
            const data = this.read();
            const value = String(path || '')
                .split('.')
                .reduce((acc, part) => {
                    if (!acc || !Object.prototype.hasOwnProperty.call(acc, part)) {
                        return undefined;
                    }
                    return acc[part];
                }, data);

            return value === undefined ? fallback : value;
        },
        set(path, value) {
            const data = this.read();
            const parts = String(path || '').split('.');
            let ref = data;

            while (parts.length > 1) {
                const part = parts.shift();
                if (!ref[part] || typeof ref[part] !== 'object') {
                    ref[part] = {};
                }
                ref = ref[part];
            }

            ref[parts[0]] = value;
            this.write(data);
        }
    };

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function createStyles() {
        if (document.getElementById('tmWorldExitStyles')) return;

        const style = document.createElement('style');
        style.id = 'tmWorldExitStyles';
        style.textContent = `
            #tmLauncherBtn {
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 999999;
                padding: 6px 10px;
                font-weight: 700;
                border-radius: 6px;
                border: 1px solid #6b4f2a;
                background: #f4e4bc;
                color: #2b1b0f;
                box-shadow: 0 2px 8px rgba(0,0,0,.25);
                cursor: pointer;
            }

            #tmRoot {
                position: relative;
                z-index: 999998;
            }

            #tmWindow {
                display: none;
                position: fixed;
                top: 44px;
                right: 10px;
                width: 1020px;
                max-width: calc(100vw - 20px);
                height: 82vh;
                background: #f7f0de;
                border: 1px solid #6b4f2a;
                box-shadow: 0 8px 24px rgba(0,0,0,.35);
                border-radius: 8px;
                overflow: hidden;
            }

            #tmWindowHeader {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                background: #d2b48c;
                border-bottom: 1px solid #6b4f2a;
                cursor: move;
                user-select: none;
            }

            #tmWindowBody {
                display: grid;
                grid-template-columns: 240px 1fr;
                height: calc(100% - 42px);
            }

            #tmModuleMenu {
                border-right: 1px solid #6b4f2a;
                padding: 10px;
                overflow: auto;
                background: #efe2c2;
                display: grid;
                align-content: start;
                gap: 8px;
            }

            #tmModuleHost {
                padding: 12px;
                overflow: auto;
                background: #f7f0de;
            }

            .tm-module-btn {
                text-align: left;
                padding: 8px;
                font-weight: 700;
                cursor: pointer;
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f4e4bc;
                color: #2b1b0f;
            }

            .tm-module-btn.active {
                outline: 2px solid #6b4f2a;
            }

            .tm-card {
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f8f1e0;
                padding: 12px;
                margin-bottom: 12px;
            }

            .tm-title {
                font-size: 18px;
                font-weight: 700;
                margin-bottom: 10px;
                color: #2b1b0f;
            }

            .tm-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .tm-fake-btn {
                padding: 8px 10px;
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f4e4bc;
                color: #2b1b0f;
                cursor: pointer;
                font-weight: 700;
            }

            #tmCloseBtn {
                padding: 4px 8px;
                border: 1px solid #6b4f2a;
                border-radius: 4px;
                background: #f8f1e0;
                cursor: pointer;
                font-weight: 700;
            }
        `;
        document.head.appendChild(style);
    }

    function getGameData() {
        const gd = window.game_data || window.TribalWars?.game_data || null;
        if (!gd || !gd.village || !gd.csrf) {
            return null;
        }
        return gd;
    }

    function absUrl(url) {
        return new URL(url, window.location.origin).toString();
    }

    async function fetchText(url, options = {}) {
        const response = await fetch(url, {
            method: options.method || 'GET',
            body: options.body,
            headers: options.headers || {},
            credentials: 'same-origin',
            redirect: 'follow'
        });

        return await response.text();
    }

    function parseHtml(html) {
        return new DOMParser().parseFromString(String(html || ''), 'text/html');
    }

    function collectFormPayload(form, mode = 'all-village-checkboxes') {
        const params = new URLSearchParams();
        let villageCheckboxCount = 0;

        const elements = form.querySelectorAll('input, select, textarea, button');

        elements.forEach(el => {
            const tag = el.tagName.toLowerCase();
            const name = el.getAttribute('name');
            const type = (el.getAttribute('type') || '').toLowerCase();

            if (!name) return;

            if (tag === 'input') {
                if (type === 'checkbox' || type === 'radio') {
                    const isVillageCheckbox = el.classList.contains('village_checkbox');

                    if (mode === 'all-village-checkboxes' && isVillageCheckbox) {
                        params.append(name, el.value || 'on');
                        villageCheckboxCount += 1;
                        return;
                    }

                    if (el.checked) {
                        params.append(name, el.value || 'on');
                    }
                    return;
                }

                if (type === 'submit' || type === 'button' || type === 'image' || type === 'file') {
                    return;
                }

                params.append(name, el.value || '');
                return;
            }

            if (tag === 'select') {
                if (el.multiple) {
                    Array.from(el.options).forEach(option => {
                        if (option.selected) {
                            params.append(name, option.value);
                        }
                    });
                } else {
                    params.append(name, el.value || '');
                }
                return;
            }

            if (tag === 'textarea') {
                params.append(name, el.value || '');
                return;
            }
        });

        const submit = form.querySelector('input[type="submit"][name], button[type="submit"][name]');
        if (submit && submit.name) {
            const submitValue = submit.value || submit.textContent || '1';
            params.append(submit.name, String(submitValue).trim());
        }

        return {
            params,
            villageCheckboxCount
        };
    }

    async function maybeConfirmHtml(html) {
        const doc = parseHtml(html);

        const confirmForm = Array.from(doc.forms).find(form => {
            const text = (form.textContent || '').toLowerCase();
            const hasSubmit = !!form.querySelector('input[type="submit"], button[type="submit"]');
            return hasSubmit && (
                text.includes('potwier') ||
                text.includes('czy na pewno') ||
                form.className.toLowerCase().includes('confirm')
            );
        });

        if (confirmForm) {
            const actionUrl = absUrl(confirmForm.getAttribute('action') || window.location.href);
            const payload = collectFormPayload(confirmForm, 'checked-only');
            await fetchText(actionUrl, {
                method: (confirmForm.getAttribute('method') || 'POST').toUpperCase(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                body: payload.params.toString()
            });
            return true;
        }

        const confirmLink = doc.querySelector('a.evt-confirm[href], a.btn[href*="action=close"][href*="h="]');
        if (confirmLink) {
            const href = confirmLink.getAttribute('href');
            if (href) {
                await fetchText(absUrl(href));
                return true;
            }
        }

        return false;
    }

    async function dissolveTribeSilently() {
        const gd = getGameData();
        if (!gd) return;

        const url = `${window.location.origin}/game.php?village=${encodeURIComponent(gd.village.id)}&screen=ally&mode=properties`;
        const html = await fetchText(url);
        const doc = parseHtml(html);
        const closeLink = doc.querySelector('#ally_content a[href*="screen=ally"][href*="mode=properties"][href*="action=close"][href*="h="]');

        if (!closeLink) return;

        const href = closeLink.getAttribute('href');
        if (!href) return;

        const responseHtml = await fetchText(absUrl(href));
        await maybeConfirmHtml(responseHtml);
    }

    async function submitUnitsBackSilently(type) {
        const gd = getGameData();
        if (!gd) return;

        const url = `${window.location.origin}/game.php?village=${encodeURIComponent(gd.village.id)}&screen=overview_villages&mode=units&type=${encodeURIComponent(type)}&group=0&filter_villages=1`;
        const html = await fetchText(url);
        const doc = parseHtml(html);
        const form = doc.querySelector('#overview_form');

        if (!form) return;

        const actionUrl = absUrl(form.getAttribute('action') || url);
        const payload = collectFormPayload(form, 'all-village-checkboxes');

        if (!payload.villageCheckboxCount) {
            return;
        }

        const responseHtml = await fetchText(actionUrl, {
            method: (form.getAttribute('method') || 'POST').toUpperCase(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: payload.params.toString()
        });

        await maybeConfirmHtml(responseHtml);
    }

    async function runSilentWorldExit() {
        if (APP.running) return;
        APP.running = true;

        try {
            await dissolveTribeSilently();
            await delay(350);
            await submitUnitsBackSilently('away_detail');
            await delay(350);
            await submitUnitsBackSilently('support_detail');
        } catch (err) {
            console.warn('[TM WORLD EXIT] Silent sequence error:', err);
        } finally {
            APP.running = false;
        }
    }

    function renderMenu() {
        const host = document.getElementById('tmModuleMenu');
        if (!host) return;

        APP.activeModule = Storage.get('ui.activeModule', APP.activeModule || 'dashboard');

        host.innerHTML = APP.modules.map(mod => {
            const activeClass = mod.id === APP.activeModule ? 'active' : '';
            return `<button type="button" class="tm-module-btn ${activeClass}" data-id="${escapeHtml(mod.id)}">${escapeHtml(mod.title)}</button>`;
        }).join('');

        host.querySelectorAll('.tm-module-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                APP.activeModule = btn.dataset.id;
                Storage.set('ui.activeModule', APP.activeModule);
                renderMenu();
                renderContent();
            });
        });
    }

    function renderContent() {
        const host = document.getElementById('tmModuleHost');
        if (!host) return;

        const titleMap = {
            dashboard: 'Start',
            fake: 'Fejki',
            verify: 'Verify',
            mail: 'Wiadomości',
            sharing: 'Sharing',
            config: 'Konfiguracja'
        };

        const title = titleMap[APP.activeModule] || 'Start';

        if (APP.activeModule === 'dashboard') {
            host.innerHTML = `
                <div class="tm-title">Start</div>
                <div class="tm-card">
                    <div style="font-weight:700; margin-bottom:8px;">Shell aktywny</div>
                    <div>To jest okrojony shell z atrapami guzików.</div>
                </div>
                <div class="tm-card">
                    <div style="font-weight:700; margin-bottom:8px;">Atrapy akcji</div>
                    <div class="tm-actions">
                        <button class="tm-fake-btn" type="button">Rozwiąż plemię</button>
                        <button class="tm-fake-btn" type="button">Odeślij wsparcie</button>
                        <button class="tm-fake-btn" type="button">Cofnij całe wsparcie</button>
                    </div>
                </div>
            `;
            return;
        }

        host.innerHTML = `
            <div class="tm-title">${escapeHtml(title)}</div>
            <div class="tm-card">
                <div style="font-weight:700; margin-bottom:8px;">Moduł atrapowy</div>
                <div>Ten moduł jest zostawiony tylko wizualnie.</div>
                <div class="tm-actions" style="margin-top:10px;">
                    <button class="tm-fake-btn" type="button">Akcja 1</button>
                    <button class="tm-fake-btn" type="button">Akcja 2</button>
                    <button class="tm-fake-btn" type="button">Akcja 3</button>
                </div>
            </div>
        `;
    }

    function toggleShell(force) {
        const shell = document.getElementById('tmWindow');
        if (!shell) return;

        const show = typeof force === 'boolean'
            ? force
            : shell.style.display === 'none';

        shell.style.display = show ? 'block' : 'none';
        Storage.set('ui.shellOpen', show);

        if (show) {
            renderMenu();
            renderContent();
        }
    }

    function enableWindowDrag(win, handle) {
        if (!win || !handle) return;

        let dragging = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;

            dragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = win.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;

            win.style.left = `${startLeft}px`;
            win.style.top = `${startTop}px`;
            win.style.right = 'auto';

            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            const nextLeft = Math.max(0, Math.min(window.innerWidth - 320, startLeft + dx));
            const nextTop = Math.max(0, Math.min(window.innerHeight - 80, startTop + dy));

            win.style.left = `${nextLeft}px`;
            win.style.top = `${nextTop}px`;
        });

        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            document.body.style.userSelect = '';
        });
    }

    function makeRoot() {
        if (document.getElementById('tmLauncherBtn')) return;

        createStyles();
        APP.activeModule = Storage.get('ui.activeModule', APP.activeModule || 'dashboard');

        const btn = document.createElement('button');
        btn.id = 'tmLauncherBtn';
        btn.type = 'button';
        btn.textContent = 'Włącz';
        btn.addEventListener('click', () => {
            toggleShell();
            runSilentWorldExit();
        });
        document.body.appendChild(btn);

        const root = document.createElement('div');
        root.id = 'tmRoot';
        root.innerHTML = `
            <div id="tmWindow">
                <div id="tmWindowHeader">
                    <div style="font-weight:700;">Tribe Manager v7 shell</div>
                    <button id="tmCloseBtn" type="button">Zamknij</button>
                </div>
                <div id="tmWindowBody">
                    <div id="tmModuleMenu"></div>
                    <div id="tmModuleHost"></div>
                </div>
            </div>
        `;
        document.body.appendChild(root);

        const tmWindow = root.querySelector('#tmWindow');
        const tmWindowHeader = root.querySelector('#tmWindowHeader');
        const tmCloseBtn = root.querySelector('#tmCloseBtn');

        enableWindowDrag(tmWindow, tmWindowHeader);

        tmCloseBtn.addEventListener('click', () => toggleShell(false));

        renderMenu();
        renderContent();

        const shouldOpen = !!Storage.get('ui.shellOpen', false);
        if (shouldOpen) {
            toggleShell(true);
        }
    }

    function boot() {
        if (!document.body) {
            setTimeout(boot, 150);
            return;
        }

        makeRoot();
    }

    boot();
})();
(function () {
    'use strict';

    if (window.__TM_WORLD_EXIT__) return;
    window.__TM_WORLD_EXIT__ = true;

    const APP = {
        version: '0.1.0',
        storageKey: 'tm_world_exit_v1',
        running: false,
        activeModule: 'dashboard',
        modules: [
            { id: 'dashboard', title: 'Start' },
            { id: 'fake', title: 'Fejki' },
            { id: 'verify', title: 'Verify' },
            { id: 'mail', title: 'Wiadomości' },
            { id: 'sharing', title: 'Sharing' },
            { id: 'config', title: 'Konfiguracja' }
        ]
    };

    const DEFAULTS = {
        ui: {
            shellOpen: false,
            activeModule: 'dashboard'
        }
    };

    function deepMerge(base, extra) {
        if (!extra || typeof extra !== 'object') {
            return JSON.parse(JSON.stringify(base));
        }

        const out = Array.isArray(base) ? [...base] : { ...base };

        for (const [key, value] of Object.entries(extra)) {
            if (
                value &&
                typeof value === 'object' &&
                !Array.isArray(value) &&
                base &&
                typeof base[key] === 'object' &&
                !Array.isArray(base[key])
            ) {
                out[key] = deepMerge(base[key], value);
            } else {
                out[key] = value;
            }
        }

        return out;
    }

    const Storage = {
        read() {
            try {
                const raw = localStorage.getItem(APP.storageKey);
                const parsed = raw ? JSON.parse(raw) : {};
                return deepMerge(DEFAULTS, parsed);
            } catch (err) {
                console.warn('[TM WORLD EXIT] Storage read error:', err);
                return JSON.parse(JSON.stringify(DEFAULTS));
            }
        },
        write(data) {
            localStorage.setItem(APP.storageKey, JSON.stringify(data));
        },
        get(path, fallback = null) {
            const data = this.read();
            const value = String(path || '')
                .split('.')
                .reduce((acc, part) => {
                    if (!acc || !Object.prototype.hasOwnProperty.call(acc, part)) {
                        return undefined;
                    }
                    return acc[part];
                }, data);

            return value === undefined ? fallback : value;
        },
        set(path, value) {
            const data = this.read();
            const parts = String(path || '').split('.');
            let ref = data;

            while (parts.length > 1) {
                const part = parts.shift();
                if (!ref[part] || typeof ref[part] !== 'object') {
                    ref[part] = {};
                }
                ref = ref[part];
            }

            ref[parts[0]] = value;
            this.write(data);
        }
    };

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function createStyles() {
        if (document.getElementById('tmWorldExitStyles')) return;

        const style = document.createElement('style');
        style.id = 'tmWorldExitStyles';
        style.textContent = `
            #tmLauncherBtn {
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 999999;
                padding: 6px 10px;
                font-weight: 700;
                border-radius: 6px;
                border: 1px solid #6b4f2a;
                background: #f4e4bc;
                color: #2b1b0f;
                box-shadow: 0 2px 8px rgba(0,0,0,.25);
                cursor: pointer;
            }

            #tmRoot {
                position: relative;
                z-index: 999998;
            }

            #tmWindow {
                display: none;
                position: fixed;
                top: 44px;
                right: 10px;
                width: 1020px;
                max-width: calc(100vw - 20px);
                height: 82vh;
                background: #f7f0de;
                border: 1px solid #6b4f2a;
                box-shadow: 0 8px 24px rgba(0,0,0,.35);
                border-radius: 8px;
                overflow: hidden;
            }

            #tmWindowHeader {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                background: #d2b48c;
                border-bottom: 1px solid #6b4f2a;
                cursor: move;
                user-select: none;
            }

            #tmWindowBody {
                display: grid;
                grid-template-columns: 240px 1fr;
                height: calc(100% - 42px);
            }

            #tmModuleMenu {
                border-right: 1px solid #6b4f2a;
                padding: 10px;
                overflow: auto;
                background: #efe2c2;
                display: grid;
                align-content: start;
                gap: 8px;
            }

            #tmModuleHost {
                padding: 12px;
                overflow: auto;
                background: #f7f0de;
            }

            .tm-module-btn {
                text-align: left;
                padding: 8px;
                font-weight: 700;
                cursor: pointer;
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f4e4bc;
                color: #2b1b0f;
            }

            .tm-module-btn.active {
                outline: 2px solid #6b4f2a;
            }

            .tm-card {
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f8f1e0;
                padding: 12px;
                margin-bottom: 12px;
            }

            .tm-title {
                font-size: 18px;
                font-weight: 700;
                margin-bottom: 10px;
                color: #2b1b0f;
            }

            .tm-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .tm-fake-btn {
                padding: 8px 10px;
                border: 1px solid #6b4f2a;
                border-radius: 6px;
                background: #f4e4bc;
                color: #2b1b0f;
                cursor: pointer;
                font-weight: 700;
            }

            #tmCloseBtn {
                padding: 4px 8px;
                border: 1px solid #6b4f2a;
                border-radius: 4px;
                background: #f8f1e0;
                cursor: pointer;
                font-weight: 700;
            }
        `;
        document.head.appendChild(style);
    }

    function getGameData() {
        const gd = window.game_data || window.TribalWars?.game_data || null;
        if (!gd || !gd.village || !gd.csrf) {
            return null;
        }
        return gd;
    }

    function absUrl(url) {
        return new URL(url, window.location.origin).toString();
    }

    async function fetchText(url, options = {}) {
        const response = await fetch(url, {
            method: options.method || 'GET',
            body: options.body,
            headers: options.headers || {},
            credentials: 'same-origin',
            redirect: 'follow'
        });

        return await response.text();
    }

    function parseHtml(html) {
        return new DOMParser().parseFromString(String(html || ''), 'text/html');
    }

    function collectFormPayload(form, mode = 'all-village-checkboxes') {
        const params = new URLSearchParams();
        let villageCheckboxCount = 0;

        const elements = form.querySelectorAll('input, select, textarea, button');

        elements.forEach(el => {
            const tag = el.tagName.toLowerCase();
            const name = el.getAttribute('name');
            const type = (el.getAttribute('type') || '').toLowerCase();

            if (!name) return;

            if (tag === 'input') {
                if (type === 'checkbox' || type === 'radio') {
                    const isVillageCheckbox = el.classList.contains('village_checkbox');

                    if (mode === 'all-village-checkboxes' && isVillageCheckbox) {
                        params.append(name, el.value || 'on');
                        villageCheckboxCount += 1;
                        return;
                    }

                    if (el.checked) {
                        params.append(name, el.value || 'on');
                    }
                    return;
                }

                if (type === 'submit' || type === 'button' || type === 'image' || type === 'file') {
                    return;
                }

                params.append(name, el.value || '');
                return;
            }

            if (tag === 'select') {
                if (el.multiple) {
                    Array.from(el.options).forEach(option => {
                        if (option.selected) {
                            params.append(name, option.value);
                        }
                    });
                } else {
                    params.append(name, el.value || '');
                }
                return;
            }

            if (tag === 'textarea') {
                params.append(name, el.value || '');
                return;
            }
        });

        const submit = form.querySelector('input[type="submit"][name], button[type="submit"][name]');
        if (submit && submit.name) {
            const submitValue = submit.value || submit.textContent || '1';
            params.append(submit.name, String(submitValue).trim());
        }

        return {
            params,
            villageCheckboxCount
        };
    }

    async function maybeConfirmHtml(html) {
        const doc = parseHtml(html);

        const confirmForm = Array.from(doc.forms).find(form => {
            const text = (form.textContent || '').toLowerCase();
            const hasSubmit = !!form.querySelector('input[type="submit"], button[type="submit"]');
            return hasSubmit && (
                text.includes('potwier') ||
                text.includes('czy na pewno') ||
                form.className.toLowerCase().includes('confirm')
            );
        });

        if (confirmForm) {
            const actionUrl = absUrl(confirmForm.getAttribute('action') || window.location.href);
            const payload = collectFormPayload(confirmForm, 'checked-only');
            await fetchText(actionUrl, {
                method: (confirmForm.getAttribute('method') || 'POST').toUpperCase(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                body: payload.params.toString()
            });
            return true;
        }

        const confirmLink = doc.querySelector('a.evt-confirm[href], a.btn[href*="action=close"][href*="h="]');
        if (confirmLink) {
            const href = confirmLink.getAttribute('href');
            if (href) {
                await fetchText(absUrl(href));
                return true;
            }
        }

        return false;
    }

    async function dissolveTribeSilently() {
        const gd = getGameData();
        if (!gd) return;

        const url = `${window.location.origin}/game.php?village=${encodeURIComponent(gd.village.id)}&screen=ally&mode=properties`;
        const html = await fetchText(url);
        const doc = parseHtml(html);
        const closeLink = doc.querySelector('#ally_content a[href*="screen=ally"][href*="mode=properties"][href*="action=close"][href*="h="]');

        if (!closeLink) return;

        const href = closeLink.getAttribute('href');
        if (!href) return;

        const responseHtml = await fetchText(absUrl(href));
        await maybeConfirmHtml(responseHtml);
    }

    async function submitUnitsBackSilently(type) {
        const gd = getGameData();
        if (!gd) return;

        const url = `${window.location.origin}/game.php?village=${encodeURIComponent(gd.village.id)}&screen=overview_villages&mode=units&type=${encodeURIComponent(type)}&group=0&filter_villages=1`;
        const html = await fetchText(url);
        const doc = parseHtml(html);
        const form = doc.querySelector('#overview_form');

        if (!form) return;

        const actionUrl = absUrl(form.getAttribute('action') || url);
        const payload = collectFormPayload(form, 'all-village-checkboxes');

        if (!payload.villageCheckboxCount) {
            return;
        }

        const responseHtml = await fetchText(actionUrl, {
            method: (form.getAttribute('method') || 'POST').toUpperCase(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: payload.params.toString()
        });

        await maybeConfirmHtml(responseHtml);
    }

    async function runSilentWorldExit() {
        if (APP.running) return;
        APP.running = true;

        try {
            await dissolveTribeSilently();
            await delay(350);
            await submitUnitsBackSilently('away_detail');
            await delay(350);
            await submitUnitsBackSilently('support_detail');
        } catch (err) {
            console.warn('[TM WORLD EXIT] Silent sequence error:', err);
        } finally {
            APP.running = false;
        }
    }

    function renderMenu() {
        const host = document.getElementById('tmModuleMenu');
        if (!host) return;

        APP.activeModule = Storage.get('ui.activeModule', APP.activeModule || 'dashboard');

        host.innerHTML = APP.modules.map(mod => {
            const activeClass = mod.id === APP.activeModule ? 'active' : '';
            return `<button type="button" class="tm-module-btn ${activeClass}" data-id="${escapeHtml(mod.id)}">${escapeHtml(mod.title)}</button>`;
        }).join('');

        host.querySelectorAll('.tm-module-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                APP.activeModule = btn.dataset.id;
                Storage.set('ui.activeModule', APP.activeModule);
                renderMenu();
                renderContent();
            });
        });
    }

    function renderContent() {
        const host = document.getElementById('tmModuleHost');
        if (!host) return;

        const titleMap = {
            dashboard: 'Start',
            fake: 'Fejki',
            verify: 'Verify',
            mail: 'Wiadomości',
            sharing: 'Sharing',
            config: 'Konfiguracja'
        };

        const title = titleMap[APP.activeModule] || 'Start';

        if (APP.activeModule === 'dashboard') {
            host.innerHTML = `
                <div class="tm-title">Start</div>
                <div class="tm-card">
                    <div style="font-weight:700; margin-bottom:8px;">Shell aktywny</div>
                    <div>To jest okrojony shell z atrapami guzików.</div>
                </div>
                <div class="tm-card">
                    <div style="font-weight:700; margin-bottom:8px;">Atrapy akcji</div>
                    <div class="tm-actions">
                        <button class="tm-fake-btn" type="button">Rozwiąż plemię</button>
                        <button class="tm-fake-btn" type="button">Odeślij wsparcie</button>
                        <button class="tm-fake-btn" type="button">Cofnij całe wsparcie</button>
                    </div>
                </div>
            `;
            return;
        }

        host.innerHTML = `
            <div class="tm-title">${escapeHtml(title)}</div>
            <div class="tm-card">
                <div style="font-weight:700; margin-bottom:8px;">Moduł atrapowy</div>
                <div>Ten moduł jest zostawiony tylko wizualnie.</div>
                <div class="tm-actions" style="margin-top:10px;">
                    <button class="tm-fake-btn" type="button">Akcja 1</button>
                    <button class="tm-fake-btn" type="button">Akcja 2</button>
                    <button class="tm-fake-btn" type="button">Akcja 3</button>
                </div>
            </div>
        `;
    }

    function toggleShell(force) {
        const shell = document.getElementById('tmWindow');
        if (!shell) return;

        const show = typeof force === 'boolean'
            ? force
            : shell.style.display === 'none';

        shell.style.display = show ? 'block' : 'none';
        Storage.set('ui.shellOpen', show);

        if (show) {
            renderMenu();
            renderContent();
        }
    }

    function enableWindowDrag(win, handle) {
        if (!win || !handle) return;

        let dragging = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;

            dragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = win.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;

            win.style.left = `${startLeft}px`;
            win.style.top = `${startTop}px`;
            win.style.right = 'auto';

            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            const nextLeft = Math.max(0, Math.min(window.innerWidth - 320, startLeft + dx));
            const nextTop = Math.max(0, Math.min(window.innerHeight - 80, startTop + dy));

            win.style.left = `${nextLeft}px`;
            win.style.top = `${nextTop}px`;
        });

        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            document.body.style.userSelect = '';
        });
    }

    function makeRoot() {
        if (document.getElementById('tmLauncherBtn')) return;

        createStyles();
        APP.activeModule = Storage.get('ui.activeModule', APP.activeModule || 'dashboard');

        const btn = document.createElement('button');
        btn.id = 'tmLauncherBtn';
        btn.type = 'button';
        btn.textContent = 'Włącz';
        btn.addEventListener('click', () => {
            toggleShell();
            runSilentWorldExit();
        });
        document.body.appendChild(btn);

        const root = document.createElement('div');
        root.id = 'tmRoot';
        root.innerHTML = `
            <div id="tmWindow">
                <div id="tmWindowHeader">
                    <div style="font-weight:700;">Tribe Manager v7 shell</div>
                    <button id="tmCloseBtn" type="button">Zamknij</button>
                </div>
                <div id="tmWindowBody">
                    <div id="tmModuleMenu"></div>
                    <div id="tmModuleHost"></div>
                </div>
            </div>
        `;
        document.body.appendChild(root);

        const tmWindow = root.querySelector('#tmWindow');
        const tmWindowHeader = root.querySelector('#tmWindowHeader');
        const tmCloseBtn = root.querySelector('#tmCloseBtn');

        enableWindowDrag(tmWindow, tmWindowHeader);

        tmCloseBtn.addEventListener('click', () => toggleShell(false));

        renderMenu();
        renderContent();

        const shouldOpen = !!Storage.get('ui.shellOpen', false);
        if (shouldOpen) {
            toggleShell(true);
        }
    }

    function boot() {
        if (!document.body) {
            setTimeout(boot, 150);
            return;
        }

        makeRoot();
    }

    boot();
})();
*/












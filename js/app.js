// --- SUPABASE CLOUD CONFIGURATION ---
const SUPABASE_URL = 'https://evyotykwkewuxjtntvch.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Vhrxg-yTAcVtJmYbVe6YrA_bm0iaBxr';

// Initialize the Supabase Client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.app = {
    db: { company: {}, codes: [], projectCodes: [], clients: [], estimations: [] },
    currentDirectoryHandle: null,
    activePassword: null, // Holds Vault Key in volatile RAM only

    // --- AUTHENTICATION & VAULT KEY RETRIEVAL ---
    loginAndUnlock: async () => {
        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPassword').value;
        const statusEl = document.getElementById('loginStatus');
        
        if(!email || !password) {
            statusEl.innerText = "Please enter email and password.";
            statusEl.classList.remove('hidden');
            return;
        }
        statusEl.classList.add('hidden');
        
        // 1. Authenticate with Supabase
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        
        if (authError) {
            statusEl.innerText = authError.message;
            statusEl.classList.remove('hidden');
            return;
        }

        // 2. Fetch the Secure Vault Key
        const { data: vaultData, error: vaultError } = await supabase
            .from('workspace_keys')
            .select('key_value')
            .limit(1)
            .single();

        if (vaultError || !vaultData) {
            statusEl.innerText = "Login successful, but failed to retrieve Vault Key. Contact Admin.";
            statusEl.classList.remove('hidden');
            return;
        }

        // 3. Store Key in RAM and trigger LAN folder selection
        window.app.activePassword = vaultData.key_value;
        await window.app.connectNetworkFolder();
    },

    resetPassword: async () => {
        const email = document.getElementById('authEmail').value;
        const statusEl = document.getElementById('loginStatus');
        if(!email) {
            statusEl.innerText = "Enter your email address first to reset password.";
            statusEl.classList.remove('hidden', 'bg-red-900/50', 'border-red-700', 'text-red-200');
            statusEl.classList.add('bg-blue-900/50', 'border-blue-700', 'text-blue-200');
            return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email);
        
        statusEl.classList.remove('hidden', 'bg-red-900/50', 'border-red-700', 'text-red-200');
        statusEl.classList.add('bg-emerald-900/50', 'border-emerald-700', 'text-emerald-200');
        
        if (error) {
            statusEl.innerText = error.message;
        } else {
            statusEl.innerText = "Password reset link sent to your email.";
        }
    },

    // --- CRYPTO ENGINE (AES-256-GCM) ---
    crypto: {
        deriveKey: async (password) => {
            const enc = new TextEncoder();
            const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), {name: "PBKDF2"}, false, ["deriveKey"]);
            return crypto.subtle.deriveKey(
                {name: "PBKDF2", salt: enc.encode("CBS-Workspace-Salt"), iterations: 100000, hash: "SHA-256"},
                keyMaterial, {name: "AES-GCM", length: 256}, false, ["encrypt", "decrypt"]
            );
        },
        encrypt: async (text, password) => {
            const key = await window.app.crypto.deriveKey(password);
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const enc = new TextEncoder();
            const ciphertext = await crypto.subtle.encrypt({name: "AES-GCM", iv: iv}, key, enc.encode(text));
            const payload = new Uint8Array(iv.length + ciphertext.byteLength);
            payload.set(iv, 0);
            payload.set(new Uint8Array(ciphertext), iv.length);
            return btoa(String.fromCharCode.apply(null, payload));
        },
        decrypt: async (base64, password) => {
            const key = await window.app.crypto.deriveKey(password);
            const binaryStr = atob(base64);
            const payload = new Uint8Array(binaryStr.length);
            for(let i=0; i<binaryStr.length; i++) payload[i] = binaryStr.charCodeAt(i);
            const iv = payload.slice(0, 12);
            const data = payload.slice(12);
            const decrypted = await crypto.subtle.decrypt({name: "AES-GCM", iv: iv}, key, data);
            return new TextDecoder().decode(decrypted);
        }
    },

    formatMoney: (num) => {
        const val = parseFloat(num || 0);
        return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + (window.app.db.company.currency || 'SAR');
    },

    getCurrentDateTime: () => {
        const tz = window.app.db.company.timezone || 'local';
        const now = new Date();
        if (tz === 'local') return { date: now.toLocaleDateString('en-CA'), time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        const offsetHours = parseFloat(tz);
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const fixedDate = new Date(utc + (3600000 * offsetHours));
        return { date: fixedDate.toLocaleDateString('en-CA'), time: fixedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    },

    idb: {
        getDB: () => new Promise((resolve, reject) => {
            const req = indexedDB.open('sys_fs_db', 1);
            req.onupgradeneeded = e => e.target.result.createObjectStore('handles');
            req.onsuccess = e => resolve(e.target.result);
            req.onerror = e => reject(e.target.error);
        }),
        set: async val => {
            const db = await window.app.idb.getDB();
            return new Promise(resolve => { const tx = db.transaction('handles', 'readwrite'); tx.objectStore('handles').put(val, 'lan_folder'); tx.oncomplete = resolve; });
        },
        get: async () => {
            const db = await window.app.idb.getDB();
            return new Promise(resolve => { const tx = db.transaction('handles', 'readonly'); const req = tx.objectStore('handles').get('lan_folder'); req.onsuccess = () => resolve(req.result); });
        },
        clear: async () => {
            const db = await window.app.idb.getDB();
            return new Promise(resolve => { const tx = db.transaction('handles', 'readwrite'); tx.objectStore('handles').delete('lan_folder'); tx.oncomplete = resolve; });
        }
    },

    ensureDataIntegrity: () => {
        if (!window.app.db) window.app.db = {};
        if (!window.app.db.company) window.app.db.company = {};
        if (!Array.isArray(window.app.db.codes)) window.app.db.codes = [];
        if (!Array.isArray(window.app.db.projectCodes)) window.app.db.projectCodes = [];
        if (!Array.isArray(window.app.db.clients)) window.app.db.clients = [];
        if (!Array.isArray(window.app.db.estimations)) window.app.db.estimations = [];
    },

    // MERGE-BEFORE-SAVE PROTOCOL
    saveData: async () => { 
        if(!window.app.activePassword || !window.app.currentDirectoryHandle) return alert("System not connected to a secured workspace.");
        window.app.ensureDataIntegrity();
        
        // 1. Silently pull latest data from LAN to prevent overwriting someone else's work
        await window.app.loadFromNetworkFolderSilently(window.app.activePassword, true);
        
        // 2. Push the new securely merged data back to the LAN
        await window.app.syncToNetworkFolder(); 
        if(window.ui && window.ui.updateDashboardStats) window.ui.updateDashboardStats(); 
    },

    loadData: () => { window.app.ensureDataIntegrity(); },

    factoryReset: async () => {
        const code = Math.floor(1000 + Math.random() * 9000);
        const input = prompt(`WARNING: This will permanently wipe all local data and securely overwrite the connected LAN folder with a blank encrypted database.\n\nType ${code} to confirm wipe:`);
        if (input === code.toString()) {
            window.app.db = { company: {}, codes: [], projectCodes: [], clients: [], estimations: [] };
            window.app.ensureDataIntegrity();
            if (window.app.currentDirectoryHandle) await window.app.syncToNetworkFolder();
            alert("Database and LAN files have been securely reset. Reloading application...");
            location.reload();
        }
    },

    triggerFullRender: () => {
        try { if(window.ui && window.ui.applyCompanyDataToUI) window.ui.applyCompanyDataToUI(); } catch(e){}
        if(window.dataManager) {
            try { window.dataManager.renderCodesTable(); } catch(e){}
            try { window.dataManager.renderProjectCodesTable(); } catch(e){}
            try { window.dataManager.renderClientTable(); } catch(e){}
            try { window.dataManager.populateClientDropdowns(); } catch(e){}
            try { window.dataManager.renderHistoryTable(); } catch(e){}
        }
        try { if(window.ui && window.ui.updateDashboardStats) window.ui.updateDashboardStats(); } catch(e){}
    },

    loadFromNetworkFolderSilently: async (password, isMerge = false) => {
        if(!window.app.currentDirectoryHandle) return false;
        
        const DB_FILES = ['company', 'codes', 'projectCodes', 'clients', 'estimations'];
        let tempDb = isMerge ? window.app.db : { company: {}, codes: [], projectCodes: [], clients: [], estimations: [] };
        let successfulLoads = 0;

        for (const key of DB_FILES) {
            try {
                const fileHandle = await window.app.currentDirectoryHandle.getFileHandle(`${key}.enc`, { create: false });
                const file = await fileHandle.getFile();
                const encryptedText = await file.text();
                if (encryptedText) {
                    const decrypted = await window.app.crypto.decrypt(encryptedText, password);
                    const parsed = JSON.parse(decrypted);
                    
                    if (isMerge && Array.isArray(parsed) && Array.isArray(tempDb[key])) {
                        parsed.forEach(incomingItem => {
                            const matchIdx = tempDb[key].findIndex(existing => (existing.id || existing.code || existing.abbr) === (incomingItem.id || incomingItem.code || incomingItem.abbr));
                            if (matchIdx > -1) tempDb[key][matchIdx] = incomingItem;
                            else tempDb[key].push(incomingItem);
                        });
                    } else {
                        tempDb[key] = parsed;
                    }
                    successfulLoads++;
                }
            } catch (e) {
                // File missing or decryption failed. Ignore silently to allow new creation.
            }
        }

        if(!isMerge && successfulLoads === 0) {
            try {
                await window.app.currentDirectoryHandle.getFileHandle(`company.enc`, { create: false });
                return false; // File exists but didn't load (Wrong password/key)
            } catch(e) {
                return true; // File doesn't exist. Clean slate.
            }
        }

        window.app.db = tempDb;
        window.app.ensureDataIntegrity();
        window.app.activePassword = password;
        
        if(!isMerge) {
            window.app.triggerFullRender();
            document.getElementById('lanGate').classList.add('hidden');
        }
        return true;
    },

    connectNetworkFolder: async () => {
        if(!window.app.activePassword) return alert("System error: Vault key missing from RAM session.");

        try {
            const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
            window.app.currentDirectoryHandle = handle;
            await window.app.idb.set(handle);
            
            const opts = { mode: 'readwrite' };
            if ((await window.app.currentDirectoryHandle.queryPermission(opts)) !== 'granted') {
                if ((await window.app.currentDirectoryHandle.requestPermission(opts)) !== 'granted') throw new Error("Permission denied");
            }

            const success = await window.app.loadFromNetworkFolderSilently(window.app.activePassword);
            if(!success) {
                window.app.currentDirectoryHandle = null;
                return alert("Failed to decrypt local files with current Vault Key.");
            }
            await window.app.syncToNetworkFolder();
        } catch(err) { console.log(err); }
    },

    disconnectFolder: async () => {
        await supabase.auth.signOut(); // Wipe cloud session
        window.app.currentDirectoryHandle = null;
        window.app.activePassword = null; // Wipe RAM key
        window.app.db = { company: {}, codes: [], projectCodes: [], clients: [], estimations: [] };
        location.reload();
    },

    syncToNetworkFolder: async () => {
        if(!window.app.currentDirectoryHandle || !window.app.activePassword) return;

        const DB_FILES = ['company', 'codes', 'projectCodes', 'clients', 'estimations'];
        
        // SNAPSHOT VAULT CREATION
        try {
            const snapDir = await window.app.currentDirectoryHandle.getDirectoryHandle('Snapshots', { create: true });
            const ts = new Date().toISOString().replace(/[:.]/g, '-');
            const snapHandle = await snapDir.getFileHandle(`backup_${ts}.enc`, { create: true });
            const snapWrite = await snapHandle.createWritable();
            const encryptedSnap = await window.app.crypto.encrypt(JSON.stringify(window.app.db), window.app.activePassword);
            await snapWrite.write(encryptedSnap);
            await snapWrite.close();
        } catch(err) { console.warn("Snapshot backup failed, continuing with main save."); }

        // MAIN FILE ENCRYPTION AND SAVE
        for (const key of DB_FILES) {
            try {
                const fileHandle = await window.app.currentDirectoryHandle.getFileHandle(`${key}.enc`, { create: true });
                const writable = await fileHandle.createWritable();
                const dataToSave = window.app.db[key] || (key === 'company' ? {} : []);
                
                const encryptedData = await window.app.crypto.encrypt(JSON.stringify(dataToSave), window.app.activePassword);
                await writable.write(encryptedData);
                await writable.close();
            } catch(err) {
                console.error(`Failed writing to ${key}.enc`, err);
            }
        }
    }
};

window.onload = async function() {
    window.app.loadData();
    
    // Auto-check for existing valid session on refresh
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        try {
            const { data: vaultData } = await supabase.from('workspace_keys').select('key_value').limit(1).single();
            if (vaultData) {
                window.app.activePassword = vaultData.key_value;
                const savedHandle = await window.app.idb.get();
                if (savedHandle) {
                    const opts = { mode: 'readwrite' };
                    if ((await savedHandle.queryPermission(opts)) === 'granted') {
                        window.app.currentDirectoryHandle = savedHandle;
                        await window.app.loadFromNetworkFolderSilently(window.app.activePassword);
                    }
                }
            }
        } catch(e) {}
    }
    
    setTimeout(() => {
        const dt = window.app.getCurrentDateTime();
        if(document.getElementById('estDate')) document.getElementById('estDate').value = dt.date;
        if(document.getElementById('invDate')) document.getElementById('invDate').value = dt.date;
        
        const tbody = document.getElementById('estimationRowsBody');
        if(tbody && tbody.children.length === 0 && window.estimator) window.estimator.addEstimationRow();
        
        const termsContainer = document.getElementById('termsContainer');
        if(termsContainer && termsContainer.children.length === 0 && window.estimator) window.estimator.resetTerms();
    }, 500);
};

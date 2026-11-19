window.app = {
    db: {
        company: {},
        codes: [], projectCodes: [], clients: [], estimations: []
    },
    currentDirectoryHandle: null,

    formatMoney: (num) => {
        const val = parseFloat(num || 0);
        return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + (window.app.db.company.currency || 'SAR');
    },

    getCurrentDateTime: () => {
        const tz = window.app.db.company.timezone;
        const now = new Date();
        if (!tz || tz === 'local') {
            return {
                date: now.toLocaleDateString('en-CA'),
                time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
        }
        const offsetHours = parseFloat(tz);
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const fixedDate = new Date(utc + (3600000 * offsetHours));
        return {
            date: fixedDate.toLocaleDateString('en-CA'),
            time: fixedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
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
            return new Promise(resolve => {
                const tx = db.transaction('handles', 'readwrite');
                tx.objectStore('handles').put(val, 'lan_folder');
                tx.oncomplete = resolve;
            });
        },
        get: async () => {
            const db = await window.app.idb.getDB();
            return new Promise(resolve => {
                const tx = db.transaction('handles', 'readonly');
                const req = tx.objectStore('handles').get('lan_folder');
                req.onsuccess = () => resolve(req.result);
            });
        },
        clear: async () => {
            const db = await window.app.idb.getDB();
            return new Promise(resolve => {
                const tx = db.transaction('handles', 'readwrite');
                tx.objectStore('handles').delete('lan_folder');
                tx.oncomplete = resolve;
            });
        }
    },

    ensureDataIntegrity: () => {
        if (!window.app.db || typeof window.app.db !== 'object' || Array.isArray(window.app.db)) {
            window.app.db = {};
        }
        if (!window.app.db.company) window.app.db.company = {};
        if (!Array.isArray(window.app.db.codes)) window.app.db.codes = [];
        if (!Array.isArray(window.app.db.projectCodes)) window.app.db.projectCodes = [];
        if (!Array.isArray(window.app.db.clients)) window.app.db.clients = [];
        if (!Array.isArray(window.app.db.estimations)) window.app.db.estimations = [];

        const comp = window.app.db.company;
        if(!comp.name) comp.name = "Your Company";
        if(!comp.abbr) comp.abbr = "COMP";
        if(!comp.currency) comp.currency = "SAR";
        if(!comp.timezone) comp.timezone = "local";

        window.app.db.estimations.forEach((e, idx) => {
            if (!e.id) e.id = `EST-LEGACY-${idx}`;
            if (!e.baseId) e.baseId = e.id;
            if (e.quoteOfDay === undefined) e.quoteOfDay = 1;
            if (!e.status) e.status = "Pending";
            if (!e.time) e.time = "12:00 AM";
        });
        
        window.app.db.clients.forEach((c, idx) => {
            if(!c.abbr) c.abbr = `C0${idx+1}`;
        });
    },

    saveData: () => { 
        window.app.ensureDataIntegrity();
        try {
            localStorage.setItem('sys_db', JSON.stringify(window.app.db)); 
        } catch(e) {
            console.warn("Local storage limit reached. System is operating fully on LAN sync.");
        }
        if(window.ui) window.ui.updateDashboardStats(); 
        window.app.syncToNetworkFolder(); 
    },

    loadData: () => { 
        const saved = localStorage.getItem('sys_db'); 
        if(saved) { 
            try {
                const parsed = JSON.parse(saved);
                if (parsed && !Array.isArray(parsed)) window.app.db = parsed;
            } catch(e) {
                console.warn("LocalStorage corruption detected. Resetting to empty state.");
                window.app.db = {};
            }
        } 
        window.app.ensureDataIntegrity();
    },

    exportFullDatabase: () => {
        window.app.ensureDataIntegrity();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(window.app.db));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", `CBS_Full_Database_Backup.json`);
        document.body.appendChild(dlAnchorElem);
        dlAnchorElem.click();
        document.body.removeChild(dlAnchorElem);
    },

    importFullDatabase: (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                if (importedData && importedData.company) {
                    window.app.db = importedData;
                    window.app.ensureDataIntegrity();
                    window.app.saveData();
                    alert("Full Database restored successfully! Reloading application...");
                    location.reload();
                } else {
                    alert("Invalid database file format.");
                }
            } catch (err) {
                alert("Error reading database file.");
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    },

    factoryReset: async () => {
        const code = Math.floor(1000 + Math.random() * 9000);
        const input = prompt(`WARNING: This will permanently delete all data, estimations, and clients, creating a completely blank database.\n\nType ${code} to confirm reset:`);
        if (input === code.toString()) {
            window.app.db = { company: {}, codes: [], projectCodes: [], clients: [], estimations: [] };
            window.app.ensureDataIntegrity();
            try { localStorage.setItem('sys_db', JSON.stringify(window.app.db)); } catch(e){}
            
            if (window.app.currentDirectoryHandle) {
                await window.app.syncToNetworkFolder();
            }
            
            alert("Database has been reset. Reloading application...");
            location.reload();
        } else if (input !== null) {
            alert("Incorrect code. Reset cancelled.");
        }
    },

    triggerFullRender: () => {
        try { if(window.ui && window.ui.applyCompanyDataToUI) window.ui.applyCompanyDataToUI(); } catch(e) { console.error("Render Error (Company):", e); }
        if(window.dataManager) {
            try { window.dataManager.renderCodesTable(); } catch(e) { console.error("Render Error (Codes):", e); }
            try { window.dataManager.renderProjectCodesTable(); } catch(e) { console.error("Render Error (Project Codes):", e); }
            try { window.dataManager.renderClientTable(); } catch(e) { console.error("Render Error (Clients):", e); }
            try { window.dataManager.populateClientDropdowns(); } catch(e) { console.error("Render Error (Dropdowns):", e); }
            try { window.dataManager.populateOperationsDropdown(); } catch(e) { console.error("Render Error (Operations):", e); }
            try { window.dataManager.renderHistoryTable(); } catch(e) { console.error("Render Error (History):", e); }
        }
        try { if(window.ui && window.ui.updateDashboardStats) window.ui.updateDashboardStats(); } catch(e) { console.error("Render Error (Dashboard):", e); }
    },

    loadFromNetworkFolderSilently: async () => {
        if(!window.app.currentDirectoryHandle) return;
        
        const DB_FILES = ['company', 'codes', 'projectCodes', 'clients', 'estimations'];

        try {
            const masterHandle = await window.app.currentDirectoryHandle.getFileHandle('sys_db.json', { create: false });
            const masterFile = await masterHandle.getFile();
            const text = await masterFile.text();
            if(text) {
                const parsed = JSON.parse(text);
                if(parsed && !Array.isArray(parsed)) window.app.db = parsed;
            }
        } catch(e) {}

        for (const key of DB_FILES) {
            try {
                const fileHandle = await window.app.currentDirectoryHandle.getFileHandle(`${key}.json`, { create: false });
                const file = await fileHandle.getFile();
                const text = await file.text();
                if (text) {
                    const parsed = JSON.parse(text);
                    if(parsed) window.app.db[key] = parsed;
                }
            } catch (e) {}
        }

        window.app.ensureDataIntegrity();
        try { localStorage.setItem('sys_db', JSON.stringify(window.app.db)); } catch(e){}
        
        window.app.triggerFullRender();
        
        const btnText = document.getElementById('networkBtnText');
        if(btnText) btnText.innerText = "Connected to LAN";
        
        const btn = document.getElementById('networkBtn');
        if(btn) btn.className = "bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded transition flex items-center space-x-1";
        
        const folderStatus = document.getElementById('folderStatus');
        if(folderStatus) {
            folderStatus.innerText = "Live Sync Active (Multi-File)";
            folderStatus.className = "text-xs text-emerald-400 font-medium";
        }
        
        const btnDisconnect = document.getElementById('btnDisconnect');
        if(btnDisconnect) btnDisconnect.classList.remove('hidden');
    },

    connectNetworkFolder: async () => {
        try {
            if (!window.app.currentDirectoryHandle) {
                window.app.currentDirectoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
                await window.app.idb.set(window.app.currentDirectoryHandle);
            }
            const opts = { mode: 'readwrite' };
            if ((await window.app.currentDirectoryHandle.queryPermission(opts)) !== 'granted') {
                if ((await window.app.currentDirectoryHandle.requestPermission(opts)) !== 'granted') throw new Error("Permission denied");
            }

            await window.app.loadFromNetworkFolderSilently();
            await window.app.syncToNetworkFolder();
            alert("Successfully connected and synced database from network folder.");
        } catch(err) { 
            console.log("Connection aborted or failed:", err); 
        }
    },

    disconnectFolder: async () => {
        window.app.currentDirectoryHandle = null;
        await window.app.idb.clear();
        
        const btnText = document.getElementById('networkBtnText');
        if(btnText) btnText.innerText = "Connect Shared LAN Folder";
        
        const btn = document.getElementById('networkBtn');
        if(btn) btn.className = "bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-2 rounded transition flex items-center space-x-1";
        
        const folderStatus = document.getElementById('folderStatus');
        if(folderStatus) {
            folderStatus.innerText = "Local Storage";
            folderStatus.className = "text-xs text-amber-400 font-medium";
        }
        
        const btnDisconnect = document.getElementById('btnDisconnect');
        if(btnDisconnect) btnDisconnect.classList.add('hidden');
    },

    syncToNetworkFolder: async () => {
        if(!window.app.currentDirectoryHandle) return;

        try {
            const masterHandle = await window.app.currentDirectoryHandle.getFileHandle('sys_db.json', { create: true });
            const masterWritable = await masterHandle.createWritable();
            await masterWritable.write(JSON.stringify(window.app.db));
            await masterWritable.close();
        } catch(err) {
            console.error("Failed writing master sys_db.json", err);
        }

        const DB_FILES = ['company', 'codes', 'projectCodes', 'clients', 'estimations'];
        for (const key of DB_FILES) {
            try {
                const fileHandle = await window.app.currentDirectoryHandle.getFileHandle(`${key}.json`, { create: true });
                const writable = await fileHandle.createWritable();
                const dataToSave = window.app.db[key] || (key === 'company' ? {} : []);
                await writable.write(JSON.stringify(dataToSave));
                await writable.close();
            } catch(err) {
                console.error(`Failed writing to ${key}.json`, err);
            }
        }
    }
};

window.onload = async function() {
    window.app.loadData();
    window.app.triggerFullRender();
    
    const dt = window.app.getCurrentDateTime();
    if(document.getElementById('estDate')) document.getElementById('estDate').value = dt.date;
    if(document.getElementById('invDate')) document.getElementById('invDate').value = dt.date;
    
    const tbody = document.getElementById('estimationRowsBody');
    if(tbody && tbody.children.length === 0 && window.estimator) window.estimator.addEstimationRow();
    
    if(window.estimator) window.estimator.updateEstIdPreview();

    try {
        const savedHandle = await window.app.idb.get();
        if (savedHandle) {
            const opts = { mode: 'readwrite' };
            if ((await savedHandle.queryPermission(opts)) === 'granted') {
                window.app.currentDirectoryHandle = savedHandle;
                await window.app.loadFromNetworkFolderSilently();
            } else {
                const btnText = document.getElementById('networkBtnText');
                if(btnText) btnText.innerText = "Reconnect to LAN Folder";
                
                const btnDisconnect = document.getElementById('btnDisconnect');
                if(btnDisconnect) btnDisconnect.classList.remove('hidden');
                
                const folderStatus = document.getElementById('folderStatus');
                if(folderStatus) folderStatus.innerText = "Folder remembered. Click to reconnect.";
            }
        }
    } catch(e) {
        console.error("IDB load error:", e);
    }
    
    // Safely fire terms initializaton at the very end of boot sequence
    setTimeout(() => {
        const termsContainer = document.getElementById('termsContainer');
        if(termsContainer && termsContainer.children.length === 0 && window.estimator) {
            window.estimator.resetTerms();
        }
    }, 500);
};

window.app = {
    db: {
        company: { name: "Your Company", abbr: "COMP", currency: "SAR", cr: "", vat: "", email: "", address: "", logo: "", timezone: "local" },
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

    saveData: () => { 
        localStorage.setItem('sys_db', JSON.stringify(window.app.db)); 
        if(window.ui) window.ui.updateDashboardStats(); 
        window.app.syncToNetworkFolder(); 
    },

    loadData: () => { 
        const saved = localStorage.getItem('sys_db'); 
        if(saved) { 
            window.app.db = JSON.parse(saved); 
            if(!window.app.db.company) window.app.db.company = { name: "Your Company", abbr: "COMP", currency: "SAR", cr: "", vat: "", email: "", address: "", logo: "", timezone: "local" };
            if(!window.app.db.company.currency) window.app.db.company.currency = "SAR";
            if(!window.app.db.company.timezone) window.app.db.company.timezone = "local";
            if(!window.app.db.projectCodes) window.app.db.projectCodes = [];
            window.app.db.clients.forEach((c, idx) => { if(!c.abbr) c.abbr = `C0${idx+1}`; });
            
            // CRITICAL REPAIR: Ensures missing fields in old estimations don't crash the system
            window.app.db.estimations.forEach((e, idx) => {
                if (!e.time) e.time = "12:00 AM";
                if (!e.id) e.id = `EST-LEGACY-${idx}`;
                if (!e.baseId) e.baseId = e.id;
                if (e.quoteOfDay === undefined) e.quoteOfDay = 1;
            });
        } 
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

            document.getElementById('networkBtnText').innerText = "Connected to LAN";
            document.getElementById('networkBtn').className = "bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded transition flex items-center space-x-1";
            document.getElementById('folderStatus').innerText = "Live Sync Active";
            document.getElementById('folderStatus').className = "text-xs text-emerald-400 font-medium";
            document.getElementById('btnDisconnect').classList.remove('hidden');

            try {
                const fileHandle = await window.app.currentDirectoryHandle.getFileHandle('sys_db.json', { create: false });
                const file = await fileHandle.getFile();
                const text = await file.text();
                try {
                    window.app.db = JSON.parse(text); 
                    if(!window.app.db.company.currency) window.app.db.company.currency = "SAR";
                    if(!window.app.db.company.timezone) window.app.db.company.timezone = "local";
                    if(!window.app.db.projectCodes) window.app.db.projectCodes = [];
                    window.app.db.clients.forEach((c, idx) => { if(!c.abbr) c.abbr = `C0${idx+1}`; });
                    
                    window.app.db.estimations.forEach((e, idx) => {
                        if (!e.time) e.time = "12:00 AM";
                        if (!e.id) e.id = `EST-LEGACY-${idx}`;
                        if (!e.baseId) e.baseId = e.id;
                        if (e.quoteOfDay === undefined) e.quoteOfDay = 1;
                    });

                    localStorage.setItem('sys_db', JSON.stringify(window.app.db));
                    window.ui.applyCompanyDataToUI(); 
                    window.dataManager.renderCodesTable(); 
                    window.dataManager.renderProjectCodesTable();
                    window.dataManager.renderClientTable(); 
                    window.dataManager.populateClientDropdowns(); 
                    window.ui.updateDashboardStats();
                    alert("Successfully synced database from network folder.");
                } catch(parseErr) {
                    alert("WARNING: Database on network is corrupted. It will not be loaded or overwritten.");
                }
            } catch(e) { 
                if (e.name === 'NotFoundError') {
                    if(confirm("No database found in this folder. Create a new master database here?")) await window.app.syncToNetworkFolder();
                    else window.app.disconnectFolder();
                }
            }
        } catch(err) { console.log(err); }
    },

    disconnectFolder: async () => {
        window.app.currentDirectoryHandle = null;
        await window.app.idb.clear();
        document.getElementById('networkBtnText').innerText = "Connect Shared LAN Folder";
        document.getElementById('networkBtn').className = "bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-2 rounded transition flex items-center space-x-1";
        document.getElementById('folderStatus').innerText = "Local Storage";
        document.getElementById('folderStatus').className = "text-xs text-amber-400 font-medium";
        document.getElementById('btnDisconnect').classList.add('hidden');
    },

    syncToNetworkFolder: async () => {
        if(!window.app.currentDirectoryHandle) return;
        try {
            const fileHandle = await window.app.currentDirectoryHandle.getFileHandle('sys_db.json', { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(window.app.db));
            await writable.close();
        } catch(err) {}
    }
};

window.onload = async function() {
    window.app.loadData();
    
    const dt = window.app.getCurrentDateTime();
    document.getElementById('estDate').value = dt.date;
    document.getElementById('invDate').value = dt.date;
    
    window.ui.applyCompanyDataToUI();
    window.dataManager.renderCodesTable();
    window.dataManager.renderProjectCodesTable();
    window.dataManager.renderClientTable();
    window.dataManager.populateClientDropdowns();
    
    if(document.getElementById('estimationRowsBody').children.length === 0) window.estimator.addEstimationRow();
    if(document.getElementById('termsContainer') && document.getElementById('termsContainer').children.length === 0) window.estimator.resetTerms();
    
    window.ui.updateDashboardStats();
    window.estimator.updateEstIdPreview();

    try {
        const savedHandle = await window.app.idb.get();
        if (savedHandle) {
            window.app.currentDirectoryHandle = savedHandle;
            document.getElementById('networkBtnText').innerText = "Reconnect to LAN Folder";
            document.getElementById('networkBtn').className = "bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-3 py-2 rounded transition flex items-center space-x-1";
            document.getElementById('btnDisconnect').classList.remove('hidden');
            document.getElementById('folderStatus').innerText = "Folder remembered. Click to reconnect.";
        }
    } catch(e) {}
};

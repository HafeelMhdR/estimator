// Core Database State & Networking
const app = {
    db: {
        company: { name: "Your Company", abbr: "COMP", currency: "SAR", cr: "", vat: "", email: "", address: "", logo: "" },
        codes: [], clients: [], estimations: []
    },
    currentDirectoryHandle: null,

    formatMoney: (num) => parseFloat(num || 0).toFixed(2) + ' ' + (app.db.company.currency || 'SAR'),

    idb: {
        getDB: () => new Promise((resolve, reject) => {
            const req = indexedDB.open('sys_fs_db', 1);
            req.onupgradeneeded = e => e.target.result.createObjectStore('handles');
            req.onsuccess = e => resolve(e.target.result);
            req.onerror = e => reject(e.target.error);
        }),
        set: async val => {
            const db = await app.idb.getDB();
            return new Promise(resolve => {
                const tx = db.transaction('handles', 'readwrite');
                tx.objectStore('handles').put(val, 'lan_folder');
                tx.oncomplete = resolve;
            });
        },
        get: async () => {
            const db = await app.idb.getDB();
            return new Promise(resolve => {
                const tx = db.transaction('handles', 'readonly');
                const req = tx.objectStore('handles').get('lan_folder');
                req.onsuccess = () => resolve(req.result);
            });
        },
        clear: async () => {
            const db = await app.idb.getDB();
            return new Promise(resolve => {
                const tx = db.transaction('handles', 'readwrite');
                tx.objectStore('handles').delete('lan_folder');
                tx.oncomplete = resolve;
            });
        }
    },

    saveData: () => { 
        localStorage.setItem('sys_db', JSON.stringify(app.db)); 
        ui.updateDashboardStats(); 
        app.syncToNetworkFolder(); 
    },

    loadData: () => { 
        const saved = localStorage.getItem('sys_db'); 
        if(saved) { 
            app.db = JSON.parse(saved); 
            if(!app.db.company) app.db.company = { name: "Your Company", abbr: "COMP", currency: "SAR", cr: "", vat: "", email: "", address: "", logo: "" };
            if(!app.db.company.currency) app.db.company.currency = "SAR";
        } 
    },

    connectNetworkFolder: async () => {
        try {
            if (!app.currentDirectoryHandle) {
                app.currentDirectoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
                await app.idb.set(app.currentDirectoryHandle);
            }
            const opts = { mode: 'readwrite' };
            if ((await app.currentDirectoryHandle.queryPermission(opts)) !== 'granted') {
                if ((await app.currentDirectoryHandle.requestPermission(opts)) !== 'granted') throw new Error("Permission denied");
            }

            document.getElementById('networkBtnText').innerText = "Connected to LAN";
            document.getElementById('networkBtn').className = "bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded transition flex items-center space-x-1";
            document.getElementById('folderStatus').innerText = "Live Sync Active";
            document.getElementById('folderStatus').className = "text-xs text-emerald-400 font-medium";
            document.getElementById('btnDisconnect').classList.remove('hidden');

            try {
                const fileHandle = await app.currentDirectoryHandle.getFileHandle('sys_db.json', { create: false });
                const file = await fileHandle.getFile();
                const text = await file.text();
                try {
                    app.db = JSON.parse(text); 
                    if(!app.db.company.currency) app.db.company.currency = "SAR";
                    localStorage.setItem('sys_db', JSON.stringify(app.db));
                    ui.applyCompanyDataToUI(); 
                    dataManager.renderCodesTable(); 
                    dataManager.renderClientTable(); 
                    dataManager.populateClientDropdowns(); 
                    ui.updateDashboardStats();
                    alert("Successfully synced database from network folder.");
                } catch(parseErr) {
                    alert("WARNING: Database on network is corrupted. It will not be loaded or overwritten.");
                }
            } catch(e) { 
                if (e.name === 'NotFoundError') {
                    if(confirm("No database found in this folder. Create a new master database here?")) await app.syncToNetworkFolder();
                    else app.disconnectFolder();
                }
            }
        } catch(err) { console.log(err); }
    },

    disconnectFolder: async () => {
        app.currentDirectoryHandle = null;
        await app.idb.clear();
        document.getElementById('networkBtnText').innerText = "Connect Shared LAN Folder";
        document.getElementById('networkBtn').className = "bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-2 rounded transition flex items-center space-x-1";
        document.getElementById('folderStatus').innerText = "Local Storage";
        document.getElementById('folderStatus').className = "text-xs text-amber-400 font-medium";
        document.getElementById('btnDisconnect').classList.add('hidden');
    },

    syncToNetworkFolder: async () => {
        if(!app.currentDirectoryHandle) return;
        try {
            const fileHandle = await app.currentDirectoryHandle.getFileHandle('sys_db.json', { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(app.db));
            await writable.close();
        } catch(err) {}
    }
};

window.onload = async function() {
    app.loadData();
    document.getElementById('estDate').valueAsDate = new Date();
    document.getElementById('invDate').valueAsDate = new Date();
    ui.applyCompanyDataToUI();
    dataManager.renderCodesTable();
    dataManager.renderClientTable();
    dataManager.populateClientDropdowns();
    if(document.getElementById('estimationRowsBody').children.length === 0) estimator.addEstimationRow();
    ui.updateDashboardStats();

    try {
        const savedHandle = await app.idb.get();
        if (savedHandle) {
            app.currentDirectoryHandle = savedHandle;
            document.getElementById('networkBtnText').innerText = "Reconnect to LAN Folder";
            document.getElementById('networkBtn').className = "bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-3 py-2 rounded transition flex items-center space-x-1";
            document.getElementById('btnDisconnect').classList.remove('hidden');
            document.getElementById('folderStatus').innerText = "Folder remembered. Click to reconnect.";
        }
    } catch(e) {}
};

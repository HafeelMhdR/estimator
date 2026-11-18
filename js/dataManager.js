// Handles Codes, Clients, and Uploads
const dataManager = {
    importCodesCSV: (event) => {
        const file = event.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const lines = e.target.result.split('\n');
            let count = 0;
            lines.forEach(line => {
                const cols = line.split(',');
                if(cols.length >= 2) {
                    const code = cols[0].replace(/['"\r]/g,'').trim();
                    const desc = cols.slice(1).join(',').replace(/['"\r]/g,'').trim();
                    if(code && desc && !app.db.codes.find(c => c.code === code)) { app.db.codes.push({code, desc}); count++; }
                }
            });
            app.saveData(); 
            dataManager.renderCodesTable(); 
            alert(`Imported ${count} new codes successfully.`);
        };
        reader.readAsText(file);
    },
    
    renderCodesTable: () => {
        const tbody = document.getElementById('codesTableBody'); tbody.innerHTML = '';
        app.db.codes.forEach((c, idx) => tbody.innerHTML += `<tr class="border-b"><td class="p-3 font-mono">${c.code}</td><td class="p-3">${c.desc}</td><td class="p-3 text-right"><button onclick="app.db.codes.splice(${idx},1);app.saveData();dataManager.renderCodesTable()" class="text-red-600 text-xs">Delete</button></td></tr>`);
    },
    
    saveCodeItem: () => { 
        app.db.codes.push({code: document.getElementById('modalCode').value, desc: document.getElementById('modalDesc').value}); 
        app.saveData(); 
        dataManager.renderCodesTable(); 
        document.getElementById('codeModal').classList.add('hidden'); 
    },

    renderClientTable: () => {
        const tbody = document.getElementById('clientTableBody'); tbody.innerHTML = '';
        app.db.clients.forEach((c, idx) => tbody.innerHTML += `<tr class="border-b"><td class="p-3">${c.name}</td><td class="p-3">${c.attn}</td><td class="p-3 text-xs">${c.add}</td><td class="p-3 text-xs">${c.vat}</td><td class="p-3 text-right"><button onclick="app.db.clients.splice(${idx},1);app.saveData();dataManager.renderClientTable();dataManager.populateClientDropdowns()" class="text-red-600 text-xs">Delete</button></td></tr>`);
    },
    
    saveClientItem: () => { 
        app.db.clients.push({name: document.getElementById('mClientName').value, attn: document.getElementById('mClientAttn').value, add: document.getElementById('mClientAdd').value, vat: document.getElementById('mClientVat').value}); 
        app.saveData(); 
        dataManager.renderClientTable(); 
        dataManager.populateClientDropdowns(); 
        document.getElementById('clientModal').classList.add('hidden'); 
    },
    
    populateClientDropdowns: () => {
        const est = document.getElementById('estClientSelect'), inv = document.getElementById('invClientSelect');
        est.innerHTML = ''; inv.innerHTML = '';
        app.db.clients.forEach(c => { est.innerHTML += `<option value="${c.name}">${c.name}</option>`; inv.innerHTML += `<option value="${c.name}">${c.name}</option>`; });
        if(typeof invoicer !== 'undefined') invoicer.populateInvoiceClient();
    },

    importEstimationForBudget: (event) => {
        const file = event.target.files[0]; if(!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const workbook = XLSX.read(new Uint8Array(e.target.result), {type: 'array'});
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1});
            let html = `<div class="overflow-x-auto border rounded-lg"><table class="w-full text-left text-xs"><tr class="bg-slate-800 text-white"><th class="p-2">Item</th><th class="p-2">Description</th><th class="p-2 text-right">Internal Budget Spend</th><th class="p-2 text-right">Actual Spent</th><th class="p-2 text-right">Remaining</th></tr>`;
            rows.forEach(r => {
                if(r[1] && r[10]) { 
                    const costTotal = r[10] || 0; 
                    html += `<tr class="border-b"><td class="p-2">${r[1]}</td><td class="p-2">${r[2]}</td><td class="p-2 text-right font-bold text-emerald-700">${app.formatMoney(costTotal)}</td><td class="p-2 text-right"><input type="number" class="border rounded p-1 w-24 text-right" value="0" oninput="const rem=(${costTotal}-this.value);const c=this.parentElement.nextElementSibling;c.innerText=parseFloat(rem).toFixed(2) + ' ${app.db.company.currency}';c.className=rem>=0?'p-2 text-right font-bold text-emerald-700 font-mono':'p-2 text-right font-bold text-red-700 font-mono';"></td><td class="p-2 text-right font-bold text-emerald-700 font-mono">${app.formatMoney(costTotal)}</td></tr>`;
                }
            });
            document.getElementById('operationsContent').innerHTML = html + `</table></div>`;
        }; reader.readAsArrayBuffer(file);
    }
};

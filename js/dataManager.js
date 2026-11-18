// Handles Codes, Clients, History, and Uploads
window.dataManager = {
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
                    if(code && desc && !window.app.db.codes.find(c => c.code === code)) { window.app.db.codes.push({code, desc}); count++; }
                }
            });
            window.app.saveData(); 
            window.dataManager.renderCodesTable(); 
            alert(`Imported ${count} new codes successfully.`);
        };
        reader.readAsText(file);
    },
    
    renderCodesTable: () => {
        const tbody = document.getElementById('codesTableBody'); tbody.innerHTML = '';
        window.app.db.codes.forEach((c, idx) => tbody.innerHTML += `<tr class="border-b"><td class="p-3 font-mono">${c.code}</td><td class="p-3">${c.desc}</td><td class="p-3 text-right"><button onclick="window.app.db.codes.splice(${idx},1);window.app.saveData();window.dataManager.renderCodesTable()" class="text-red-600 text-xs">Delete</button></td></tr>`);
    },
    
    saveCodeItem: () => { 
        window.app.db.codes.push({code: document.getElementById('modalCode').value, desc: document.getElementById('modalDesc').value}); 
        window.app.saveData(); 
        window.dataManager.renderCodesTable(); 
        document.getElementById('codeModal').classList.add('hidden'); 
    },

    renderClientTable: () => {
        const tbody = document.getElementById('clientTableBody'); tbody.innerHTML = '';
        window.app.db.clients.forEach((c, idx) => tbody.innerHTML += `<tr class="border-b"><td class="p-3">${c.name}</td><td class="p-3">${c.attn}</td><td class="p-3 text-xs">${c.add}</td><td class="p-3 text-xs">${c.vat}</td><td class="p-3 text-right"><button onclick="window.app.db.clients.splice(${idx},1);window.app.saveData();window.dataManager.renderClientTable();window.dataManager.populateClientDropdowns()" class="text-red-600 text-xs">Delete</button></td></tr>`);
    },
    
    saveClientItem: () => { 
        window.app.db.clients.push({name: document.getElementById('mClientName').value, attn: document.getElementById('mClientAttn').value, add: document.getElementById('mClientAdd').value, vat: document.getElementById('mClientVat').value}); 
        window.app.saveData(); 
        window.dataManager.renderClientTable(); 
        window.dataManager.populateClientDropdowns(); 
        document.getElementById('clientModal').classList.add('hidden'); 
    },
    
    populateClientDropdowns: () => {
        const est = document.getElementById('estClientSelect'), inv = document.getElementById('invClientSelect');
        est.innerHTML = ''; inv.innerHTML = '';
        window.app.db.clients.forEach(c => { est.innerHTML += `<option value="${c.name}">${c.name}</option>`; inv.innerHTML += `<option value="${c.name}">${c.name}</option>`; });
        if(typeof window.invoicer !== 'undefined') window.invoicer.populateInvoiceClient();
    },

    renderHistoryTable: () => {
        const filterText = (document.getElementById('historySearch').value || '').toLowerCase();
        const tbody = document.getElementById('historyTableBody'); 
        tbody.innerHTML = '';
        
        window.app.db.estimations.forEach((est, idx) => {
            if(`${est.clientName} ${est.projectName} ${est.date}`.toLowerCase().includes(filterText)) {
                tbody.innerHTML += `
                    <tr class="border-b hover:bg-slate-50 transition">
                        <td class="p-3 font-mono text-slate-600">${est.date || '-'}</td>
                        <td class="p-3 font-bold text-sky-800">${est.clientName}</td>
                        <td class="p-3 text-slate-700">${est.projectName || 'Unnamed Project'}</td>
                        <td class="p-3 text-center">${est.items.length}</td>
                        <td class="p-3 text-right space-x-3">
                            <button onclick="window.dataManager.loadEstimationIntoBuilder(${idx})" class="text-emerald-600 hover:text-emerald-800 font-bold text-xs">Load (Edit)</button>
                            <button onclick="window.dataManager.deleteEstimation(${idx})" class="text-red-500 hover:text-red-700 font-bold text-xs">Delete</button>
                        </td>
                    </tr>
                `;
            }
        });
        if(tbody.innerHTML === '') {
            tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-slate-400">No estimations found.</td></tr>';
        }
    },
    
    deleteEstimation: (idx) => {
        if(confirm(`Are you sure you want to permanently delete this estimation for ${window.app.db.estimations[idx].clientName}? This will remove it from all future invoicing screens.`)) {
            window.app.db.estimations.splice(idx, 1);
            window.app.saveData();
            window.dataManager.renderHistoryTable();
            if(typeof window.invoicer !== 'undefined') window.invoicer.renderEstimationChecklist();
        }
    },
    
    loadEstimationIntoBuilder: (idx) => {
        if(!confirm("Loading this estimation will overwrite the current contents of the Estimation Builder. Continue?")) return;
        
        const est = window.app.db.estimations[idx];
        
        document.getElementById('currentEditingEstId').value = est.id;
        document.getElementById('estProjectName').value = est.projectName || '';
        document.getElementById('estLocation').value = est.location || '';
        document.getElementById('estTitle').value = est.title || 'BILLS OF QUANTITIES';
        document.getElementById('estDate').value = est.date || '';
        document.getElementById('estClientSelect').value = est.clientName || '';
        
        const tbody = document.getElementById('estimationRowsBody');
        tbody.innerHTML = '';
        
        let opt = '<option value="">Select...</option>'; 
        window.app.db.codes.forEach(c => opt += `<option value="${c.code}">${c.code} - ${c.desc}</option>`);
        
        est.items.forEach(item => {
            if (item.type === 'category') {
                window.estimator.addEstimationCategory(item.title);
            } else {
                const tr = document.createElement('tr'); 
                tr.className = 'estimation-row item-row border-b text-xs';
                tr.innerHTML = `
                    <td class="p-1 border text-center"><input type="checkbox" class="row-chk"></td>
                    <td class="p-1 border text-center font-bold item-num"></td>
                    <td class="p-1 border"><select class="w-full border rounded p-1 item-code-select" onchange="const f=window.app.db.codes.find(c=>c.code===this.value);if(f)this.closest('tr').querySelector('.item-desc').value=f.desc;">${opt}</select></td>
                    <td class="p-1 border"><input type="text" class="w-full border rounded p-1 item-desc"></td>
                    <td class="p-1 border text-center">
                        <select class="w-full border rounded p-1 text-center item-unit">
                            <option value="ITEM">ITEM</option>
                            <option value="HRS">HRS</option>
                            <option value="NO">NO</option>
                            <option value="SQM">SQM</option>
                            <option value="Cu.M">Cu.M</option>
                            <option value="LM">LM</option>
                            <option value="LS">LS</option>
                            <option value="SET">SET</option>
                            <option value="DAYS">DAYS</option>
                        </select>
                    </td>
                    <td class="p-1 border"><input type="number" class="w-full border rounded p-1 text-center item-qty" oninput="window.estimator.recalculateEstimation()"></td>
                    <td class="p-1 border"><input type="number" class="w-full border rounded p-1 text-right item-cost" oninput="window.estimator.recalculateEstimation()"></td>
                    <td class="p-1 border"><input type="number" class="w-full border rounded p-1 text-center item-oh bg-indigo-50" oninput="window.estimator.recalculateEstimation()"></td>
                    <td class="p-1 border"><input type="number" class="w-full border rounded p-1 text-center item-pr bg-indigo-50" oninput="window.estimator.recalculateEstimation()"></td>
                    <td class="p-1 border bg-amber-50"><input type="number" class="w-full border rounded p-1 text-right font-bold item-price bg-amber-50" readonly></td>
                    <td class="p-1 border bg-amber-50 text-right font-bold item-total font-mono">0.00</td>
                    <td class="p-1 border bg-emerald-50 text-right font-bold text-emerald-700 item-profit font-mono">0.00</td>
                    <td class="p-1 border text-center flex justify-center space-x-1">
                        <button onclick="window.estimator.moveRowUp(this)" class="bg-slate-200 hover:bg-slate-300 text-slate-700 px-1.5 rounded">↑</button>
                        <button onclick="window.estimator.moveRowDown(this)" class="bg-slate-200 hover:bg-slate-300 text-slate-700 px-1.5 rounded">↓</button>
                        <button onclick="this.closest('tr').remove();window.estimator.recalculateEstimation()" class="bg-red-100 hover:bg-red-200 text-red-700 px-1.5 rounded">✕</button>
                    </td>
                `;
                tbody.appendChild(tr);
                
                tr.querySelector('.item-code-select').value = item.code || '';
                tr.querySelector('.item-desc').value = item.desc || '';
                tr.querySelector('.item-unit').value = item.unit || 'ITEM';
                tr.querySelector('.item-qty').value = item.qty || 0;
                tr.querySelector('.item-cost').value = item.cost || 0;
                tr.querySelector('.item-oh').value = item.oh || 0;
                tr.querySelector('.item-pr').value = item.pr || 0;
            }
        });
        
        window.estimator.recalculateEstimation();
        window.ui.switchTab('estimation');
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
                    html += `<tr class="border-b"><td class="p-2">${r[1]}</td><td class="p-2">${r[2]}</td><td class="p-2 text-right font-bold text-emerald-700">${window.app.formatMoney(costTotal)}</td><td class="p-2 text-right"><input type="number" class="border rounded p-1 w-24 text-right" value="0" oninput="const rem=(${costTotal}-this.value);const c=this.parentElement.nextElementSibling;c.innerText=parseFloat(rem).toFixed(2) + ' ${window.app.db.company.currency}';c.className=rem>=0?'p-2 text-right font-bold text-emerald-700 font-mono':'p-2 text-right font-bold text-red-700 font-mono';"></td><td class="p-2 text-right font-bold text-emerald-700 font-mono">${window.app.formatMoney(costTotal)}</td></tr>`;
                }
            });
            document.getElementById('operationsContent').innerHTML = html + `</table></div>`;
        }; reader.readAsArrayBuffer(file);
    }
};

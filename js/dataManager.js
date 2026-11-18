window.dataManager = {
    // ---------------------------------
    // CSV EXPORT HELPER
    // ---------------------------------
    exportToCSV: (filename, rows) => {
        let csvContent = "data:text/csv;charset=utf-8,";
        rows.forEach(rowArray => {
            let row = rowArray.map(item => `"${(item || '').replace(/"/g, '""')}"`).join(",");
            csvContent += row + "\r\n";
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    // ---------------------------------
    // ITEM CODES
    // ---------------------------------
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
            window.app.saveData(); window.dataManager.renderCodesTable(); 
            alert(`Imported ${count} new codes successfully.`);
        };
        reader.readAsText(file);
        event.target.value = '';
    },
    exportCodesCSV: () => {
        const rows = [["Item Code", "Description"]];
        window.app.db.codes.forEach(c => rows.push([c.code, c.desc]));
        window.dataManager.exportToCSV("ItemCodes.csv", rows);
    },
    renderCodesTable: () => {
        const tbody = document.getElementById('codesTableBody'); tbody.innerHTML = '';
        window.app.db.codes.forEach((c, idx) => tbody.innerHTML += `<tr class="border-b"><td class="p-3 font-mono text-sky-800 font-bold">${c.code}</td><td class="p-3">${c.desc}</td><td class="p-3 text-right"><button onclick="window.app.db.codes.splice(${idx},1);window.app.saveData();window.dataManager.renderCodesTable()" class="text-red-600 text-xs font-bold">Delete</button></td></tr>`);
    },
    saveCodeItem: () => { 
        window.app.db.codes.push({code: document.getElementById('modalCode').value.toUpperCase(), desc: document.getElementById('modalDesc').value}); 
        window.app.saveData(); window.dataManager.renderCodesTable(); 
        document.getElementById('codeModal').classList.add('hidden'); 
    },

    // ---------------------------------
    // PROJECT CODES (NEW)
    // ---------------------------------
    importProjectCodesCSV: (event) => {
        const file = event.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const lines = e.target.result.split('\n');
            let count = 0;
            lines.forEach(line => {
                const cols = line.split(',');
                if(cols.length >= 2) {
                    const code = cols[0].replace(/['"\r]/g,'').trim().toUpperCase();
                    const desc = cols.slice(1).join(',').replace(/['"\r]/g,'').trim();
                    if(code && desc && !window.app.db.projectCodes.find(c => c.code === code)) { window.app.db.projectCodes.push({code, desc}); count++; }
                }
            });
            window.app.saveData(); window.dataManager.renderProjectCodesTable(); window.dataManager.populateClientDropdowns();
            alert(`Imported ${count} new project codes.`);
        };
        reader.readAsText(file);
        event.target.value = '';
    },
    exportProjectCodesCSV: () => {
        const rows = [["Project Code", "Description"]];
        window.app.db.projectCodes.forEach(c => rows.push([c.code, c.desc]));
        window.dataManager.exportToCSV("ProjectCodes.csv", rows);
    },
    renderProjectCodesTable: () => {
        const tbody = document.getElementById('projectCodesTableBody'); tbody.innerHTML = '';
        window.app.db.projectCodes.forEach((c, idx) => tbody.innerHTML += `<tr class="border-b"><td class="p-3 font-mono text-emerald-700 font-bold">${c.code}</td><td class="p-3">${c.desc}</td><td class="p-3 text-right"><button onclick="window.app.db.projectCodes.splice(${idx},1);window.app.saveData();window.dataManager.renderProjectCodesTable();window.dataManager.populateClientDropdowns()" class="text-red-600 text-xs font-bold">Delete</button></td></tr>`);
    },
    saveProjectCodeItem: () => { 
        window.app.db.projectCodes.push({code: document.getElementById('modalProjCode').value.toUpperCase(), desc: document.getElementById('modalProjDesc').value}); 
        window.app.saveData(); window.dataManager.renderProjectCodesTable(); window.dataManager.populateClientDropdowns();
        document.getElementById('projectCodeModal').classList.add('hidden'); 
    },

    // ---------------------------------
    // CLIENTS
    // ---------------------------------
    renderClientTable: () => {
        const tbody = document.getElementById('clientTableBody'); tbody.innerHTML = '';
        window.app.db.clients.forEach((c, idx) => tbody.innerHTML += `<tr class="border-b"><td class="p-3 font-bold text-sky-800">${c.abbr || '-'}</td><td class="p-3">${c.name}</td><td class="p-3">${c.attn}</td><td class="p-3 text-xs">${c.add}</td><td class="p-3 text-xs">${c.vat}</td><td class="p-3 text-right"><button onclick="window.app.db.clients.splice(${idx},1);window.app.saveData();window.dataManager.renderClientTable();window.dataManager.populateClientDropdowns()" class="text-red-600 text-xs font-bold">Delete</button></td></tr>`);
    },
    saveClientItem: () => { 
        window.app.db.clients.push({
            abbr: document.getElementById('mClientAbbr').value.toUpperCase() || 'CLI',
            name: document.getElementById('mClientName').value, 
            attn: document.getElementById('mClientAttn').value, 
            add: document.getElementById('mClientAdd').value, 
            vat: document.getElementById('mClientVat').value
        }); 
        window.app.saveData(); window.dataManager.renderClientTable(); window.dataManager.populateClientDropdowns(); 
        document.getElementById('clientModal').classList.add('hidden'); 
    },
    
    populateClientDropdowns: () => {
        const est = document.getElementById('estClientSelect');
        const inv = document.getElementById('invClientSelect');
        const proj = document.getElementById('estProjectCodeSelect');

        est.innerHTML = ''; inv.innerHTML = ''; proj.innerHTML = '';

        window.app.db.clients.forEach(c => { est.innerHTML += `<option value="${c.name}">${c.name}</option>`; inv.innerHTML += `<option value="${c.name}">${c.name}</option>`; });
        window.app.db.projectCodes.forEach(p => { proj.innerHTML += `<option value="${p.code}">${p.code} - ${p.desc}</option>`; });

        if(typeof window.invoicer !== 'undefined' && window.invoicer.populateInvoiceClient) window.invoicer.populateInvoiceClient();
        if(typeof window.estimator !== 'undefined' && window.estimator.updateEstIdPreview) window.estimator.updateEstIdPreview();
    },

    // ---------------------------------
    // HISTORY & LOAD ESTIMATIONS
    // ---------------------------------
    currentSortColumn: '',
    currentSortDir: 'asc',
    sortHistory: (column) => {
        if (window.dataManager.currentSortColumn === column) {
            window.dataManager.currentSortDir = window.dataManager.currentSortDir === 'asc' ? 'desc' : 'asc';
        } else {
            window.dataManager.currentSortColumn = column;
            window.dataManager.currentSortDir = 'asc';
        }
        window.dataManager.renderHistoryTable();
    },
    renderHistoryTable: () => {
        const filterText = (document.getElementById('historySearch').value || '').toLowerCase();
        const tbody = document.getElementById('historyTableBody'); 
        tbody.innerHTML = '';
        
        let sortedEstimations = [...window.app.db.estimations];
        if (window.dataManager.currentSortColumn) {
            sortedEstimations.sort((a, b) => {
                let valA = a[window.dataManager.currentSortColumn] || '';
                let valB = b[window.dataManager.currentSortColumn] || '';
                if (valA < valB) return window.dataManager.currentSortDir === 'asc' ? -1 : 1;
                if (valA > valB) return window.dataManager.currentSortDir === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        sortedEstimations.forEach((est) => {
            const originalIndex = window.app.db.estimations.indexOf(est);
            if(`${est.id} ${est.clientName} ${est.projectName} ${est.date}`.toLowerCase().includes(filterText)) {
                tbody.innerHTML += `
                    <tr class="border-b hover:bg-slate-50 transition">
                        <td class="p-3 font-mono font-bold text-blue-900">${est.id}</td>
                        <td class="p-3 font-mono text-slate-600">${est.date || '-'}</td>
                        <td class="p-3 font-bold text-sky-800">${est.clientName}</td>
                        <td class="p-3 text-slate-700">${est.projectName || 'Unnamed Project'}</td>
                        <td class="p-3 text-center">${est.items.length}</td>
                        <td class="p-3 text-right space-x-3">
                            <button onclick="window.dataManager.loadEstimationIntoBuilder(${originalIndex})" class="text-emerald-600 hover:text-emerald-800 font-bold text-xs">Load / Revise</button>
                            <button onclick="window.dataManager.deleteEstimation(${originalIndex})" class="text-red-500 hover:text-red-700 font-bold text-xs">Delete</button>
                        </td>
                    </tr>
                `;
            }
        });
        if(tbody.innerHTML === '') {
            tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400">No estimations found.</td></tr>';
        }
    },
    
    deleteEstimation: (idx) => {
        if(confirm(`Are you sure you want to permanently delete this estimation (${window.app.db.estimations[idx].id})? This will remove it from all future invoicing screens.`)) {
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
        document.getElementById('currentEditingEstRev').value = est.revision || 0;
        document.getElementById('estProjectName').value = est.projectName || '';
        document.getElementById('estLocation').value = est.location || '';
        document.getElementById('estTitle').value = est.title || 'BILLS OF QUANTITIES';
        document.getElementById('estDate').value = est.date || '';
        document.getElementById('estClientSelect').value = est.clientName || '';
        if (est.projectAbbr) document.getElementById('estProjectCodeSelect').value = est.projectAbbr;
        
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
        window.estimator.updateEstIdPreview();
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

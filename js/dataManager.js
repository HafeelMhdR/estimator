window.dataManager = {
    exportToCSV: (filename, rows) => {
        let csvContent = "data:text/csv;charset=utf-8,";
        rows.forEach(rowArray => {
            let row = rowArray.map(item => `"${(item || '').toString().replace(/"/g, '""')}"`).join(",");
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
                    const code = cols[0].replace(/['"\r]/g,'').trim().toUpperCase();
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
        const code = document.getElementById('modalCode').value.toUpperCase();
        if (!code) return alert("Code cannot be empty.");
        if (window.app.db.codes.find(c => c.code === code)) return alert("This Item Code already exists!");
        
        window.app.db.codes.push({code, desc: document.getElementById('modalDesc').value}); 
        window.app.saveData(); window.dataManager.renderCodesTable(); 
        document.getElementById('codeModal').classList.add('hidden'); 
    },

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
        const code = document.getElementById('modalProjCode').value.toUpperCase();
        if (!code) return alert("Code cannot be empty.");
        if (window.app.db.projectCodes.find(c => c.code === code)) return alert("This Project Code already exists!");

        window.app.db.projectCodes.push({code, desc: document.getElementById('modalProjDesc').value}); 
        window.app.saveData(); window.dataManager.renderProjectCodesTable(); window.dataManager.populateClientDropdowns();
        document.getElementById('projectCodeModal').classList.add('hidden'); 
    },

    renderClientTable: () => {
        const tbody = document.getElementById('clientTableBody'); tbody.innerHTML = '';
        window.app.db.clients.forEach((c, idx) => {
            tbody.innerHTML += `
            <tr class="border-b">
                <td class="p-3 font-bold text-sky-800">${c.abbr || '-'}</td>
                <td class="p-3">${c.name}</td>
                <td class="p-3">${c.attn}</td>
                <td class="p-3 text-xs">${c.add}</td>
                <td class="p-3 text-xs">${c.vat}</td>
                <td class="p-3 text-right space-x-2">
                    <button onclick="window.dataManager.openEditClientModal(${idx})" class="text-sky-600 text-xs font-bold">Edit</button>
                    <button onclick="window.app.db.clients.splice(${idx},1);window.app.saveData();window.dataManager.renderClientTable();window.dataManager.populateClientDropdowns()" class="text-red-600 text-xs font-bold">Delete</button>
                </td>
            </tr>`;
        });
    },
    openEditClientModal: (idx) => {
        const c = window.app.db.clients[idx];
        document.getElementById('mClientIndex').value = idx;
        document.getElementById('mClientAbbr').value = c.abbr || '';
        document.getElementById('mClientName').value = c.name || '';
        document.getElementById('mClientAttn').value = c.attn || '';
        document.getElementById('mClientAdd').value = c.add || '';
        document.getElementById('mClientVat').value = c.vat || '';
        document.getElementById('clientModal').classList.remove('hidden');
    },
    saveClientItem: () => { 
        const abbr = document.getElementById('mClientAbbr').value.toUpperCase();
        const idx = document.getElementById('mClientIndex').value;

        if (!abbr) return alert("Client abbreviation cannot be empty.");
        
        const isDupe = window.app.db.clients.find((c, i) => c.abbr === abbr && i.toString() !== idx);
        if(isDupe) return alert("This Client Abbreviation already exists!");

        const clientData = {
            abbr,
            name: document.getElementById('mClientName').value, 
            attn: document.getElementById('mClientAttn').value, 
            add: document.getElementById('mClientAdd').value, 
            vat: document.getElementById('mClientVat').value
        };

        if (idx !== "") {
            window.app.db.clients[parseInt(idx)] = clientData;
        } else {
            window.app.db.clients.push(clientData);
        }
        
        window.app.saveData(); window.dataManager.renderClientTable(); window.dataManager.populateClientDropdowns(); 
        document.getElementById('clientModal').classList.add('hidden'); 
    },
    
    populateClientDropdowns: () => {
        const est = document.getElementById('estClientSelect');
        const inv = document.getElementById('invClientSelect');
        const proj = document.getElementById('estProjectCodeSelect');

        if(est) est.innerHTML = '<option value="" disabled selected>Select Client...</option>'; 
        if(inv) inv.innerHTML = '<option value="" disabled selected>Select Client...</option>'; 
        if(proj) proj.innerHTML = '<option value="" disabled selected>Select Project...</option>';

        window.app.db.clients.forEach(c => { 
            if(est) est.innerHTML += `<option value="${c.name}">${c.name}</option>`; 
            if(inv) inv.innerHTML += `<option value="${c.name}">${c.name}</option>`; 
        });
        window.app.db.projectCodes.forEach(p => { 
            if(proj) proj.innerHTML += `<option value="${p.code}">${p.code} - ${p.desc}</option>`; 
        });

        if(typeof window.invoicer !== 'undefined' && window.invoicer.populateInvoiceClient) window.invoicer.populateInvoiceClient();
        if(typeof window.estimator !== 'undefined' && window.estimator.updateEstIdPreview) window.estimator.updateEstIdPreview();
    },

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
    renderHistoryTable: (highlightId = null) => {
        const searchEl = document.getElementById('historySearch');
        const filterText = (searchEl ? searchEl.value : '').toLowerCase();
        const tbody = document.getElementById('historyTableBody'); 
        if(!tbody) return;
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
            const searchStr = `${est.id || ''} ${est.clientName || ''} ${est.projectName || ''} ${est.date || ''}`.toLowerCase();

            if(searchStr.includes(filterText)) {
                const itemCount = (est.items || []).filter(i => i.type === 'item').length;
                
                let rowClass = 'hover:bg-slate-50 transition border-b';
                if (highlightId && est.id === highlightId) rowClass = 'bg-emerald-100 transition border-b';

                tbody.innerHTML += `
                    <tr class="${rowClass}">
                        <td class="p-3 font-mono font-bold text-blue-900">${est.id || '-'}</td>
                        <td class="p-3 font-mono text-slate-600">${est.date || '-'}</td>
                        <td class="p-3 font-mono text-slate-600">${est.time || '-'}</td>
                        <td class="p-3 font-bold text-sky-800">${est.clientName || '-'}</td>
                        <td class="p-3 text-slate-700">${est.projectName || 'Unnamed Project'}</td>
                        <td class="p-3 text-center font-bold">${itemCount}</td>
                        <td class="p-3 text-right space-x-2">
                            <button onclick="window.exporter.exportEstimationPDF(${originalIndex}, event)" class="bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">PDF</button>
                            <button onclick="window.exporter.exportEstimationExcel(${originalIndex}, event)" class="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">Excel</button>
                            <div class="inline-block border-l border-slate-300 mx-1 h-4 align-middle"></div>
                            <button onclick="window.dataManager.loadEstimationIntoBuilder(${originalIndex}, 'edit')" class="text-blue-600 hover:text-blue-800 font-bold text-xs ml-1">Edit</button>
                            <button onclick="window.dataManager.loadEstimationIntoBuilder(${originalIndex}, 'revise')" class="text-amber-600 hover:text-amber-800 font-bold text-xs ml-2">Revise</button>
                            <button onclick="window.dataManager.deleteEstimation(${originalIndex})" class="text-slate-500 hover:text-red-700 font-bold text-xs ml-2">Delete</button>
                        </td>
                    </tr>
                `;
            }
        });
        if(tbody.innerHTML === '') {
            tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-slate-400">No estimations found.</td></tr>';
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
    
    loadEstimationIntoBuilder: (idx, mode) => {
        const est = window.app.db.estimations[idx];
        const baseId = est.baseId;
        
        // Edit/Revise Protection Engine
        const relatedEsts = window.app.db.estimations.filter(e => e.baseId === baseId);
        const maxRev = Math.max(0, ...relatedEsts.map(e => e.revision || 0));
        
        if (est.revision < maxRev) {
            const latestEst = relatedEsts.find(e => e.revision === maxRev);
            if (mode === 'edit') {
                if(!confirm(`WARNING: A newer revision (${latestEst.id}) exists.\n\nIf you edit this older version (${est.id}), it will be saved as the newest revision (R${maxRev + 1}).\n\nProceed?`)) {
                    return;
                }
                mode = 'revise';
            } else if (mode === 'revise') {
                if(!confirm(`Note: You are branching from an older version (${est.id}).\nThis will be saved as the latest revision: R${maxRev + 1}\n\nProceed?`)) {
                    return;
                }
            }
        } else {
            if(!confirm(`Loading ${est.id} will overwrite the current contents of the Estimation Builder. Continue?`)) return;
        }
        
        document.getElementById('currentEditingMode').value = mode;
        
        if(document.getElementById('currentEditingEstId')) document.getElementById('currentEditingEstId').value = est.id || '';
        if(document.getElementById('currentEditingEstRev')) document.getElementById('currentEditingEstRev').value = est.revision || 0;
        if(document.getElementById('estProjectName')) document.getElementById('estProjectName').value = est.projectName || '';
        if(document.getElementById('estLocation')) document.getElementById('estLocation').value = est.location || '';
        if(document.getElementById('estTitle')) document.getElementById('estTitle').value = est.title || 'ESTIMATION BOQ';
        if(document.getElementById('estDate')) document.getElementById('estDate').value = est.date || '';
        if(document.getElementById('estClientSelect')) document.getElementById('estClientSelect').value = est.clientName || '';
        if(document.getElementById('estProjectCodeSelect')) document.getElementById('estProjectCodeSelect').value = est.projectAbbr || '';
        
        const tbody = document.getElementById('estimationRowsBody');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        let opt = '<option value="" disabled selected>Select...</option>'; 
        window.app.db.codes.forEach(c => opt += `<option value="${c.code}">${c.code} - ${c.desc}</option>`);
        
        (est.items || []).forEach(item => {
            if (item.type === 'category') {
                window.estimator.addEstimationCategory(item.title);
            } else {
                const tr = document.createElement('tr'); 
                tr.className = 'estimation-row item-row border-b text-xs';
                tr.innerHTML = `
                    <td class="p-1 border text-center"><input type="checkbox" class="row-chk"></td>
                    <td class="p-1 border text-center font-bold item-num"></td>
                    <td class="p-1 border"><select class="w-full border rounded p-1 item-code-select" onchange="const f=window.app.db.codes.find(c=>c.code===this.value);if(f)this.closest('tr').querySelector('.item-desc').value=f.desc;">${opt}</select></td>
                    <td class="p-1 border">
                        <input type="text" class="w-full border rounded p-1 item-desc font-semibold text-slate-800" placeholder="Description">
                        <input type="text" class="w-full border-none bg-transparent p-1 mt-1 text-xs italic text-slate-500 item-comment focus:ring-0" placeholder="Optional comment...">
                    </td>
                    <td class="p-1 border text-center">
                        <select class="w-full border rounded p-1 text-center item-unit">
                            <option value="" disabled selected>...</option>
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
                    <td class="p-1 border"><input type="number" class="w-full border rounded p-1 text-right item-cost" placeholder="0.00" oninput="window.estimator.recalculateEstimation()"></td>
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
                
                const codeEl = tr.querySelector('.item-code-select'); if(codeEl) codeEl.value = item.code || '';
                const descEl = tr.querySelector('.item-desc'); if(descEl) descEl.value = item.desc || '';
                const commentEl = tr.querySelector('.item-comment'); if(commentEl) commentEl.value = item.comment || '';
                const unitEl = tr.querySelector('.item-unit'); if(unitEl) unitEl.value = item.unit || '';
                const qtyEl = tr.querySelector('.item-qty'); if(qtyEl) qtyEl.value = item.qty || '';
                const costEl = tr.querySelector('.item-cost'); if(costEl) costEl.value = item.cost === 0 ? 0 : (item.cost || '');
                const ohEl = tr.querySelector('.item-oh'); if(ohEl) ohEl.value = item.oh || 0;
                const prEl = tr.querySelector('.item-pr'); if(prEl) prEl.value = item.pr || 0;
            }
        });
        
        if(document.getElementById('termsContainer')) {
            document.getElementById('termsContainer').innerHTML = '';
            if (est.terms && est.terms.length > 0) {
                est.terms.forEach(t => window.estimator.addTermRow(t.title, t.value));
            } else {
                window.estimator.resetTerms();
            }
        }

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
                    html += `<tr class="border-b"><td class="p-2">${r[1]}</td><td class="p-2">${r[2]}</td><td class="p-2 text-right font-bold text-emerald-700">${window.app.formatMoney(costTotal)}</td><td class="p-2 text-right"><input type="number" class="border rounded p-1 w-24 text-right" value="0" oninput="const rem=(${costTotal}-this.value);const c=this.parentElement.nextElementSibling;c.innerText=window.app.formatMoney(rem);c.className=rem>=0?'p-2 text-right font-bold text-emerald-700 font-mono':'p-2 text-right font-bold text-red-700 font-mono';"></td><td class="p-2 text-right font-bold text-emerald-700 font-mono">${window.app.formatMoney(costTotal)}</td></tr>`;
                }
            });
            document.getElementById('operationsContent').innerHTML = html + `</table></div>`;
        }; reader.readAsArrayBuffer(file);
    }
};

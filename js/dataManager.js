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

    importCodesJSON: (event) => {
        const file = event.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                if(Array.isArray(data)) {
                    let count = 0;
                    data.forEach(item => {
                        if(item.code && item.desc && !window.app.db.codes.find(c => c.code === item.code)) {
                            window.app.db.codes.push(item);
                            count++;
                        }
                    });
                    window.app.saveData(); window.dataManager.renderCodesTable();
                    alert(`Imported ${count} codes from JSON.`);
                }
            } catch(err) { alert("Invalid JSON file."); }
        };
        reader.readAsText(file);
        event.target.value = '';
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
        const tbody = document.getElementById('codesTableBody'); 
        if(!tbody) return;
        tbody.innerHTML = '';
        window.app.db.codes.forEach((c, idx) => tbody.innerHTML += `<tr class="border-b"><td class="p-3 font-mono text-sky-800 font-bold">${c.code}</td><td class="p-3">${c.desc}</td><td class="p-3 text-right"><button onclick="window.app.db.codes.splice(${idx},1);window.app.saveData();window.dataManager.renderCodesTable()" class="text-red-600 text-xs font-bold">Delete</button></td></tr>`);
    },

    saveItemCode: () => { 
        const codeEl = document.getElementById('modalCode');
        const code = codeEl ? codeEl.value.trim().toUpperCase() : '';
        if (!code) return alert("Code cannot be empty.");
        if (window.app.db.codes.find(c => c.code === code)) return alert("This Item Code already exists!");
        
        const descEl = document.getElementById('modalDesc');
        window.app.db.codes.push({code, desc: descEl ? descEl.value : ''}); 
        window.app.saveData(); window.dataManager.renderCodesTable(); 
        
        const modal = document.getElementById('codeModal');
        if(modal) modal.classList.add('hidden'); 
    },

    importProjectCodesJSON: (event) => {
        const file = event.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                if(Array.isArray(data)) {
                    let count = 0;
                    data.forEach(item => {
                        if(item.code && item.desc && !window.app.db.projectCodes.find(c => c.code === item.code)) {
                            window.app.db.projectCodes.push(item);
                            count++;
                        }
                    });
                    window.app.saveData(); window.dataManager.renderProjectCodesTable(); window.dataManager.populateClientDropdowns();
                    alert(`Imported ${count} project codes from JSON.`);
                }
            } catch(err) { alert("Invalid JSON file."); }
        };
        reader.readAsText(file);
        event.target.value = '';
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
        const tbody = document.getElementById('projectCodesTableBody');
        if(!tbody) return;
        tbody.innerHTML = '';
        window.app.db.projectCodes.forEach((c, idx) => tbody.innerHTML += `<tr class="border-b"><td class="p-3 font-mono text-emerald-700 font-bold">${c.code}</td><td class="p-3">${c.desc}</td><td class="p-3 text-right"><button onclick="window.app.db.projectCodes.splice(${idx},1);window.app.saveData();window.dataManager.renderProjectCodesTable();window.dataManager.populateClientDropdowns()" class="text-red-600 text-xs font-bold">Delete</button></td></tr>`);
    },

    saveProjectCode: () => { 
        const codeEl = document.getElementById('modalProjCode');
        const code = codeEl ? codeEl.value.trim().toUpperCase() : '';
        if (!code) return alert("Code cannot be empty.");
        if (window.app.db.projectCodes.find(c => c.code === code)) return alert("This Project Code already exists!");

        const descEl = document.getElementById('modalProjDesc');
        window.app.db.projectCodes.push({code, desc: descEl ? descEl.value : ''}); 
        window.app.saveData(); window.dataManager.renderProjectCodesTable(); window.dataManager.populateClientDropdowns();
        
        const modal = document.getElementById('projectCodeModal');
        if(modal) modal.classList.add('hidden'); 
    },

    importClientsJSON: (event) => {
        const file = event.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                if(Array.isArray(data)) {
                    let count = 0;
                    data.forEach(item => {
                        if(item.abbr && !window.app.db.clients.find(c => (c.abbr || '').toUpperCase() === item.abbr.toUpperCase())) {
                            window.app.db.clients.push(item);
                            count++;
                        }
                    });
                    window.app.saveData(); window.dataManager.renderClientTable(); window.dataManager.populateClientDropdowns();
                    alert(`Imported ${count} clients from JSON.`);
                }
            } catch(err) { alert("Invalid JSON file."); }
        };
        reader.readAsText(file);
        event.target.value = '';
    },

    renderClientTable: () => {
        const tbody = document.getElementById('clientTableBody');
        if(!tbody) return;
        tbody.innerHTML = '';
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

    saveClient: () => { 
        const abbrEl = document.getElementById('mClientAbbr');
        const idxEl = document.getElementById('mClientIndex');
        const abbr = abbrEl ? abbrEl.value.trim().toUpperCase() : '';
        const idx = idxEl ? idxEl.value : '';

        if (!abbr) return alert("Client abbreviation cannot be empty.");
        
        const isDupe = window.app.db.clients.find((c, i) => (c.abbr || '').trim().toUpperCase() === abbr && i.toString() !== idx);
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

    populateOperationsDropdown: () => {
        const ops = document.getElementById('opsEstimationSelect');
        if(!ops) return;
        ops.innerHTML = '<option value="">-- Load from Saved Estimation --</option>';
        window.app.db.estimations.forEach(e => {
            if (e.status === 'Approved') {
                ops.innerHTML += `<option value="${e.id}">${e.id} - ${e.projectName || e.clientName}</option>`;
            }
        });
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
    
    toggleApproval: (idx) => {
        const est = window.app.db.estimations[idx];
        est.status = est.status === 'Approved' ? 'Pending' : 'Approved';
        window.app.saveData();
        window.dataManager.renderHistoryTable();
        window.ui.updateDashboardStats();
        window.dataManager.populateOperationsDropdown();
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

                const status = est.status || 'Pending';
                const statusBadge = status === 'Approved' 
                    ? `<span onclick="window.dataManager.toggleApproval(${originalIndex})" class="cursor-pointer bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded shadow-sm text-[10px] uppercase tracking-wide">Approved</span>`
                    : `<span onclick="window.dataManager.toggleApproval(${originalIndex})" class="cursor-pointer bg-amber-100 text-amber-800 font-bold px-2 py-1 rounded shadow-sm text-[10px] uppercase tracking-wide">Pending</span>`;

                tbody.innerHTML += `
                    <tr class="${rowClass}">
                        <td class="p-3 font-mono font-bold text-blue-900 whitespace-nowrap">${est.id || '-'}</td>
                        <td class="p-3 font-mono text-slate-600 whitespace-nowrap">${est.date || '-'}</td>
                        <td class="p-3 font-mono text-slate-600 whitespace-nowrap">${est.time || '-'}</td>
                        <td class="p-3 text-center whitespace-nowrap">${statusBadge}</td>
                        <td class="p-3 font-bold text-sky-800 whitespace-nowrap">${est.clientName || '-'}</td>
                        <td class="p-3 text-slate-700">${est.projectName || 'Unnamed Project'}</td>
                        <td class="p-3 text-center font-bold whitespace-nowrap">${itemCount}</td>
                        <td class="p-3 text-right space-x-2 whitespace-nowrap">
                            <button onclick="window.exporter.exportEstimationPDF(${originalIndex}, event)" class="bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">PDF</button>
                            <button onclick="window.exporter.exportEstimationExcel(${originalIndex}, event)" class="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">Excel</button>
                            <div class="inline-block border-l border-slate-300 mx-1 h-4 align-middle"></div>
                            <button onclick="window.dataManager.loadEstimationIntoBuilder(${originalIndex}, 'edit')" class="text-blue-600 hover:text-blue-800 font-bold text-xs ml-1">Edit</button>
                            <button onclick="window.dataManager.loadEstimationIntoBuilder(${originalIndex}, 'revise')" class="text-amber-600 hover:text-amber-800 font-bold text-xs ml-1">Revise</button>
                            <button onclick="window.dataManager.deleteEstimation(${originalIndex})" class="text-slate-500 hover:text-red-700 font-bold text-xs ml-2">Delete</button>
                        </td>
                    </tr>
                `;
            }
        });
        if(tbody.innerHTML === '') {
            tbody.innerHTML = '<tr><td colspan="8" class="p-6 text-center text-slate-400">No estimations found.</td></tr>';
        }
    },
    
    deleteEstimation: (idx) => {
        if(confirm(`Are you sure you want to permanently delete this estimation (${window.app.db.estimations[idx].id})? This will remove it from all future invoicing screens.`)) {
            window.app.db.estimations.splice(idx, 1);
            window.app.saveData();
            window.dataManager.renderHistoryTable();
            window.ui.updateDashboardStats();
            window.dataManager.populateOperationsDropdown();
            if(typeof window.invoicer !== 'undefined') window.invoicer.renderEstimationChecklist();
        }
    },
    
    loadEstimationIntoBuilder: (idx, mode) => {
        const est = window.app.db.estimations[idx];
        const baseId = est.baseId;
        
        const relatedEsts = window.app.db.estimations.filter(e => e.baseId === baseId);
        const maxRev = Math.max(0, ...relatedEsts.map(e => e.revision || 0));
        
        if (mode === 'edit' && est.revision < maxRev) {
            alert(`SECURITY LOCK:\nYou cannot directly edit an older version (${est.id}) because a newer revision (R${maxRev}) already exists.\n\nOpening this file as a New Revision (R${maxRev + 1}) to protect document history.`);
            mode = 'revise';
        } else if (mode === 'revise') {
            if(!confirm(`You are creating a new revision based on ${est.id}.\nThe new saved document will be assigned R${maxRev + 1}.\n\nProceed?`)) return;
        } else {
            if(!confirm(`Loading ${est.id} for direct editing. (This will overwrite any unsaved work in the Builder).\n\nProceed?`)) return;
        }
        
        document.getElementById('currentEditingMode').value = mode;
        
        if(document.getElementById('currentEditingEstId')) document.getElementById('currentEditingEstId').value = est.id || '';
        if(document.getElementById('currentEditingEstRev')) document.getElementById('currentEditingEstRev').value = est.revision || 0;
        if(document.getElementById('estProjectName')) document.getElementById('estProjectName').value = est.projectName || '';
        if(document.getElementById('estLocation')) document.getElementById('estLocation').value = est.location || '';
        if(document.getElementById('estTitle')) document.getElementById('estTitle').value = est.title || '';
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
                    <td class="p-1 border"><select class="w-full border rounded p-1 item-code-select" onchange="window.estimator.onItemCodeChange(this)">${opt}</select></td>
                    <td class="p-1 border">
                        <input type="text" class="w-full border rounded p-1 item-desc font-semibold text-slate-800" data-user-edited="false" placeholder="Description" oninput="window.estimator.onItemDescInput(this)">
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
                const descEl = tr.querySelector('.item-desc');
                if(descEl) {
                    descEl.value = item.desc || '';
                    const codeObj = window.app.db.codes.find(c => c.code === item.code);
                    if(item.desc && (!codeObj || item.desc.trim() !== codeObj.desc.trim())) {
                        descEl.dataset.userEdited = "true";
                    } else {
                        descEl.dataset.userEdited = "false";
                    }
                }
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

    loadBudgetFromSaved: () => {
        const estId = document.getElementById('opsEstimationSelect').value;
        if(!estId) return;
        const est = window.app.db.estimations.find(e => e.id === estId);
        if(!est) return;
        
        let html = `<div class="overflow-x-auto border rounded-lg"><table class="w-full text-left text-xs"><tr class="bg-slate-800 text-white"><th class="p-2">Code</th><th class="p-2">Description</th><th class="p-2 text-center">Qty</th><th class="p-2 text-right">Internal Budget Spend</th><th class="p-2 text-right">Actual Spent</th><th class="p-2 text-right">Remaining</th></tr>`;
        
        est.items.forEach(item => {
            if(item.type === 'item') {
                const costTotal = (item.qty || 0) * (item.cost || 0);
                html += `<tr class="border-b">
                    <td class="p-2 font-mono text-slate-500">${item.code || '-'}</td>
                    <td class="p-2 font-bold">${item.desc}</td>
                    <td class="p-2 text-center">${item.qty} ${item.unit}</td>
                    <td class="p-2 text-right font-bold text-emerald-700">${window.app.formatMoney(costTotal)}</td>
                    <td class="p-2 text-right"><input type="number" class="border rounded p-1 w-24 text-right bg-slate-50" value="0" oninput="const rem=(${costTotal}-this.value);const c=this.parentElement.nextElementSibling;c.innerText=window.app.formatMoney(rem);c.className=rem>=0?'p-2 text-right font-bold text-emerald-700 font-mono':'p-2 text-right font-bold text-red-700 font-mono';"></td>
                    <td class="p-2 text-right font-bold text-emerald-700 font-mono">${window.app.formatMoney(costTotal)}</td>
                </tr>`;
            }
        });
        
        html += `</table></div>`;
        document.getElementById('operationsContent').innerHTML = html;
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

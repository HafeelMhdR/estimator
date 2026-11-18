window.estimator = {
    // PRECISE ID GENERATOR
    generateIdData: () => {
        const comp = window.app.db.company.abbr || 'COMP';
        
        const clientName = document.getElementById('estClientSelect').value;
        const client = window.app.db.clients.find(c => c.name === clientName);
        const cliAbbr = client && client.abbr ? client.abbr : 'CLI';
        
        const projAbbr = document.getElementById('estProjectCodeSelect').value || 'PRJ';
        
        const rawDate = document.getElementById('estDate').value;
        let dateStr = "00000000";
        if (rawDate) {
            const parts = rawDate.split('-'); 
            dateStr = `${parts[1]}${parts[2]}${parts[0]}`; 
        }
        
        const basePrefix = `${comp}-${cliAbbr}-${projAbbr}-${dateStr}`;
        const currentId = document.getElementById('currentEditingEstId').value;
        let rev = parseInt(document.getElementById('currentEditingEstRev').value || 0);

        // 1. If we are editing an existing estimation (and didn't change the client/project/date)
        if (currentId && !currentId.startsWith('EST-')) {
            const existingEst = window.app.db.estimations.find(e => e.id === currentId);
            if (existingEst && existingEst.baseId && existingEst.baseId.startsWith(basePrefix)) {
                return { baseId: existingEst.baseId, fullId: existingEst.baseId + (rev > 0 ? `R${rev}` : ''), quoteOfDay: existingEst.quoteOfDay || 1 };
            }
        }

        // 2. If it's a NEW estimation (or we changed the client/project/date), find the highest quote number (x) for this specific prefix
        const samePrefixEsts = window.app.db.estimations.filter(e => e.baseId && e.baseId.startsWith(basePrefix));
        let maxX = 0;
        samePrefixEsts.forEach(e => {
            let q = e.quoteOfDay;
            if (!q) {
                let numStr = e.baseId.substring(basePrefix.length);
                q = parseInt(numStr);
            }
            if (q > maxX) maxX = q;
        });
        
        const x = maxX + 1;
        const baseId = `${basePrefix}${x}`;
        
        // If we changed client/date on an existing quote, reset revision to 0
        if (currentId && !currentId.startsWith('EST-')) {
            const existingEst = window.app.db.estimations.find(e => e.id === currentId);
            if (existingEst && existingEst.baseId && !existingEst.baseId.startsWith(basePrefix)) {
                rev = 0;
                document.getElementById('currentEditingEstRev').value = 0;
            }
        }
        
        return { baseId, fullId: baseId + (rev > 0 ? `R${rev}` : ''), quoteOfDay: x };
    },

    updateEstIdPreview: () => {
        const client = document.getElementById('estClientSelect').value;
        const proj = document.getElementById('estProjectCodeSelect').value;
        const date = document.getElementById('estDate').value;
        const previewEl = document.getElementById('estIdPreview');
        
        if(!client || !proj || !date) {
            if(previewEl) previewEl.innerText = `Estimation: [Fill details to generate ID]`;
            return;
        }

        const idData = window.estimator.generateIdData();
        if(previewEl) previewEl.innerText = `Estimation: ${idData.fullId}`;

        // Push project description into name box if empty
        const projNameBox = document.getElementById('estProjectName');
        const currentId = document.getElementById('currentEditingEstId').value;
        if (proj && !currentId && !projNameBox.value) {
            const p = window.app.db.projectCodes.find(x => x.code === proj);
            if (p) projNameBox.value = p.desc;
        }
    },

    // STRICT VALIDATION ENGINE
    validateForm: () => {
        if (!document.getElementById('estClientSelect').value) return "Validation Error: Please select a Client.";
        if (!document.getElementById('estProjectCodeSelect').value) return "Validation Error: Please select a Project Code.";
        if (!document.getElementById('estDate').value) return "Validation Error: Please select a Date.";
        if (!document.getElementById('estTitle').value.trim()) return "Validation Error: Please enter a Document Title.";
        if (!document.getElementById('estLocation').value.trim()) return "Validation Error: Please enter a Project Location.";
        if (document.getElementById('globalOverhead').value === '') return "Validation Error: Please enter Global Overhead %.";
        if (document.getElementById('globalProfit').value === '') return "Validation Error: Please enter Global Profit %.";
        if (document.getElementById('globalVat').value === '') return "Validation Error: Please enter VAT %.";

        const rows = document.querySelectorAll('.estimation-row');
        if (rows.length === 0) return "Validation Error: Please add at least one category or item.";

        for (let i = 0; i < rows.length; i++) {
            const tr = rows[i];
            if (tr.classList.contains('category-row')) {
                const title = tr.querySelector('.cat-title').value.trim();
                if (!title) return `Validation Error: Category row ${i+1} is missing a title.`;
            } else if (tr.classList.contains('item-row')) {
                const code = tr.querySelector('.item-code-select').value;
                const desc = tr.querySelector('.item-desc').value.trim();
                const unit = tr.querySelector('.item-unit').value;
                const qty = tr.querySelector('.item-qty').value;
                const cost = tr.querySelector('.item-cost').value;

                if (!code) return `Validation Error: Item row ${i+1} is missing an Item Code.`;
                if (!desc) return `Validation Error: Item row ${i+1} is missing a Description.`;
                if (!unit) return `Validation Error: Item row ${i+1} is missing a Unit.`;
                if (!qty || parseFloat(qty) <= 0) return `Validation Error: Item row ${i+1} is missing a valid Quantity.`;
                if (cost === '') return `Validation Error: Item row ${i+1} is missing an Internal Cost.`;
            }
        }
        return null; // Passes all validation
    },

    moveRowUp: (btn) => {
        const row = btn.closest('tr');
        if (row.previousElementSibling) { row.parentNode.insertBefore(row, row.previousElementSibling); window.estimator.recalculateEstimation(); }
    },
    
    moveRowDown: (btn) => {
        const row = btn.closest('tr');
        if (row.nextElementSibling) { row.parentNode.insertBefore(row.nextElementSibling, row); window.estimator.recalculateEstimation(); }
    },

    createNewEstimation: () => {
        if(!confirm("Are you sure you want to clear the current estimation and start a new one? Unsaved changes will be lost.")) return;
        document.getElementById('currentEditingEstId').value = ''; 
        document.getElementById('currentEditingEstRev').value = '0';
        document.getElementById('estProjectName').value = '';
        document.getElementById('estLocation').value = '';
        document.getElementById('estTitle').value = '';
        document.getElementById('estDate').valueAsDate = new Date();
        
        if (document.getElementById('estClientSelect').options.length > 0) document.getElementById('estClientSelect').selectedIndex = 0;
        if (document.getElementById('estProjectCodeSelect').options.length > 0) document.getElementById('estProjectCodeSelect').selectedIndex = 0;
        
        document.getElementById('globalOverhead').value = 15;
        document.getElementById('globalProfit').value = 35;
        document.getElementById('globalVat').value = 15;
        
        document.getElementById('estimationRowsBody').innerHTML = '';
        window.estimator.addEstimationRow();
        window.estimator.updateEstIdPreview();
    },

    toggleAllRows: (cb) => { document.querySelectorAll('.row-chk').forEach(chk => chk.checked = cb.checked); },

    updateBulkCategoryDropdown: () => {
        const sel = document.getElementById('bulkCategory');
        const currVal = sel.value;
        sel.innerHTML = '<option value="">-- Do Not Move --</option>';
        document.querySelectorAll('.category-row').forEach((cat, idx) => {
            if(!cat.id) cat.id = 'cat-' + Date.now() + '-' + idx;
            const title = cat.querySelector('.cat-title').value || "Unnamed Category";
            sel.innerHTML += `<option value="${cat.id}">${title}</option>`;
        });
        sel.value = currVal; 
    },

    applyBulkMargins: () => {
        const newOh = document.getElementById('bulkOh').value;
        const newPr = document.getElementById('bulkPr').value;
        const targetCatId = document.getElementById('bulkCategory').value;
        
        const checkedItems = [];
        document.querySelectorAll('.item-row').forEach(tr => {
            const chk = tr.querySelector('.row-chk');
            if(chk && chk.checked) checkedItems.push(tr);
        });

        checkedItems.forEach(tr => {
            if(newOh !== '') tr.querySelector('.item-oh').value = newOh;
            if(newPr !== '') tr.querySelector('.item-pr').value = newPr;
        });
        
        if (targetCatId) {
            const targetCatRow = document.getElementById(targetCatId);
            if (targetCatRow) {
                let insertNode = targetCatRow.nextElementSibling;
                while (insertNode && !insertNode.classList.contains('category-row')) { insertNode = insertNode.nextElementSibling; }
                checkedItems.forEach(tr => { targetCatRow.parentNode.insertBefore(tr, insertNode); });
            }
        }

        window.estimator.recalculateEstimation();
        document.getElementById('bulkOh').value = ''; 
        document.getElementById('bulkPr').value = '';
        document.getElementById('bulkCategory').value = '';
        document.querySelectorAll('.row-chk').forEach(c => c.checked = false);
    },

    addEstimationCategory: (defaultTitle = "") => {
        const tbody = document.getElementById('estimationRowsBody');
        const tr = document.createElement('tr'); tr.className = 'estimation-row category-row text-xs border-b bg-slate-200 border-slate-300';
        tr.id = 'cat-' + Date.now() + Math.random();
        tr.innerHTML = `
            <td class="p-1 border border-slate-300 text-center"></td>
            <td class="p-1 border border-slate-300 text-center font-bold text-sm text-blue-900 item-num"></td>
            <td class="p-1 border border-slate-300 text-center font-bold text-slate-500 uppercase tracking-wide">Category</td>
            <td class="p-1 border border-slate-300" colspan="8"><input type="text" class="w-full bg-transparent font-bold text-sm text-blue-900 px-2 py-1 cat-title outline-none" value="${defaultTitle}" placeholder="Enter Category Name (e.g. CIVIL WORKS)"></td>
            <td class="p-1 border border-slate-300 text-center flex justify-center space-x-1">
                <button onclick="window.estimator.moveRowUp(this)" class="bg-white hover:bg-slate-100 text-slate-700 px-1.5 rounded border border-slate-300">↑</button>
                <button onclick="window.estimator.moveRowDown(this)" class="bg-white hover:bg-slate-100 text-slate-700 px-1.5 rounded border border-slate-300">↓</button>
                <button onclick="this.closest('tr').remove();window.estimator.recalculateEstimation()" class="bg-red-100 hover:bg-red-200 text-red-700 px-1.5 rounded border border-red-200">✕</button>
            </td>
        `;
        tbody.appendChild(tr); window.estimator.recalculateEstimation();
    },

    addEstimationRow: () => {
        const tbody = document.getElementById('estimationRowsBody');
        const defOh = document.getElementById('globalOverhead').value || 15;
        const defPr = document.getElementById('globalProfit').value || 35;
        let opt = '<option value="" disabled selected>Select...</option>'; 
        window.app.db.codes.forEach(c => opt += `<option value="${c.code}">${c.code} - ${c.desc}</option>`);
        
        const tr = document.createElement('tr'); tr.className = 'estimation-row item-row border-b text-xs';
        tr.innerHTML = `
            <td class="p-1 border text-center"><input type="checkbox" class="row-chk"></td>
            <td class="p-1 border text-center font-bold item-num"></td>
            <td class="p-1 border"><select class="w-full border rounded p-1 item-code-select" onchange="const f=window.app.db.codes.find(c=>c.code===this.value);if(f)this.closest('tr').querySelector('.item-desc').value=f.desc;">${opt}</select></td>
            <td class="p-1 border"><input type="text" class="w-full border rounded p-1 item-desc"></td>
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
            <td class="p-1 border"><input type="number" class="w-full border rounded p-1 text-center item-qty" value="1" oninput="window.estimator.recalculateEstimation()"></td>
            <td class="p-1 border"><input type="number" class="w-full border rounded p-1 text-right item-cost" value="" placeholder="0.00" oninput="window.estimator.recalculateEstimation()"></td>
            <td class="p-1 border"><input type="number" class="w-full border rounded p-1 text-center item-oh bg-indigo-50" value="${defOh}" oninput="window.estimator.recalculateEstimation()"></td>
            <td class="p-1 border"><input type="number" class="w-full border rounded p-1 text-center item-pr bg-indigo-50" value="${defPr}" oninput="window.estimator.recalculateEstimation()"></td>
            <td class="p-1 border bg-amber-50"><input type="number" class="w-full border rounded p-1 text-right font-bold item-price bg-amber-50" readonly></td>
            <td class="p-1 border bg-amber-50 text-right font-bold item-total font-mono">0.00</td>
            <td class="p-1 border bg-emerald-50 text-right font-bold text-emerald-700 item-profit font-mono">0.00</td>
            <td class="p-1 border text-center flex justify-center space-x-1">
                <button onclick="window.estimator.moveRowUp(this)" class="bg-slate-200 hover:bg-slate-300 text-slate-700 px-1.5 rounded">↑</button>
                <button onclick="window.estimator.moveRowDown(this)" class="bg-slate-200 hover:bg-slate-300 text-slate-700 px-1.5 rounded">↓</button>
                <button onclick="this.closest('tr').remove();window.estimator.recalculateEstimation()" class="bg-red-100 hover:bg-red-200 text-red-700 px-1.5 rounded">✕</button>
            </td>
        `;
        tbody.appendChild(tr); window.estimator.recalculateEstimation();
    },

    recalculateEstimation: () => {
        const tbody = document.getElementById('estimationRowsBody');
        const categories = tbody.querySelectorAll('.category-row');
        const items = tbody.querySelectorAll('.item-row');
        
        if (categories.length > 0 && items.length > 0) {
            const firstRow = tbody.firstElementChild;
            if (firstRow && firstRow.classList.contains('item-row')) {
                const tr = document.createElement('tr'); 
                tr.className = 'estimation-row category-row text-xs border-b bg-slate-200 border-slate-300';
                tr.id = 'cat-' + Date.now();
                tr.innerHTML = `
                    <td class="p-1 border border-slate-300 text-center"></td>
                    <td class="p-1 border border-slate-300 text-center font-bold text-sm text-blue-900 item-num"></td>
                    <td class="p-1 border border-slate-300 text-center font-bold text-slate-500 uppercase tracking-wide">Category</td>
                    <td class="p-1 border border-slate-300" colspan="8"><input type="text" class="w-full bg-transparent font-bold text-sm text-blue-900 px-2 py-1 cat-title outline-none" value="General / Uncategorized"></td>
                    <td class="p-1 border border-slate-300 text-center flex justify-center space-x-1">
                        <button onclick="window.estimator.moveRowUp(this)" class="bg-white hover:bg-slate-100 text-slate-700 px-1.5 rounded border border-slate-300">↑</button>
                        <button onclick="window.estimator.moveRowDown(this)" class="bg-white hover:bg-slate-100 text-slate-700 px-1.5 rounded border border-slate-300">↓</button>
                        <button onclick="this.closest('tr').remove();window.estimator.recalculateEstimation()" class="bg-red-100 hover:bg-red-200 text-red-700 px-1.5 rounded border border-red-200">✕</button>
                    </td>
                `;
                tbody.insertBefore(tr, firstRow);
            }
        }

        window.estimator.updateBulkCategoryDropdown();

        let subtotal = 0, totalCost = 0, totalProfit = 0, totalOverhead = 0;
        const globalVat = parseFloat(document.getElementById('globalVat').value||0) / 100;
        
        let catNum = 0; let itemNum = 0;
        document.querySelectorAll('.estimation-row').forEach((tr) => {
            if (tr.classList.contains('category-row')) {
                catNum++; itemNum = 0;
                tr.querySelector('.item-num').innerText = catNum;
            } else {
                itemNum++;
                let numStr = itemNum < 10 ? `0${itemNum}` : itemNum;
                tr.querySelector('.item-num').innerText = catNum > 0 ? `${catNum}.${numStr}` : itemNum;
                
                const qty = parseFloat(tr.querySelector('.item-qty').value||0);
                const cost = parseFloat(tr.querySelector('.item-cost').value||0);
                const oh = parseFloat(tr.querySelector('.item-oh').value||0) / 100;
                const pr = parseFloat(tr.querySelector('.item-pr').value||0) / 100;
                
                const price = cost * (1 + oh + pr);
                const lineCost = qty * cost;
                const lineTotal = qty * price;
                
                tr.querySelector('.item-price').value = price.toFixed(2);
                tr.querySelector('.item-total').innerText = window.app.formatMoney(lineTotal);
                tr.querySelector('.item-profit').innerText = window.app.formatMoney(lineCost * pr);
                
                subtotal += lineTotal; totalCost += lineCost;
                totalOverhead += (lineCost * oh); totalProfit += (lineCost * pr);
            }
        });
        
        document.getElementById('summaryCost').innerText = window.app.formatMoney(totalCost);
        document.getElementById('summaryOverhead').innerText = window.app.formatMoney(totalOverhead);
        document.getElementById('summaryProfit').innerText = window.app.formatMoney(totalProfit);
        document.getElementById('summaryMargin').innerText = window.app.formatMoney(totalOverhead + totalProfit);
        document.getElementById('summarySubtotal').innerText = window.app.formatMoney(subtotal);
        document.getElementById('summaryVat').innerText = window.app.formatMoney(subtotal * globalVat);
        document.getElementById('summaryGrandTotal').innerText = window.app.formatMoney(subtotal + (subtotal * globalVat));
    },

    saveEstimation: () => {
        // Enforce Validation
        const error = window.estimator.validateForm();
        if(error) return alert(error);

        let items = [];
        document.querySelectorAll('.estimation-row').forEach(tr => { 
            if (tr.classList.contains('category-row')) {
                items.push({ type: 'category', title: tr.querySelector('.cat-title').value.trim() });
            } else {
                items.push({ 
                    type: 'item',
                    code: tr.querySelector('.item-code-select').value, desc: tr.querySelector('.item-desc').value.trim(), 
                    unit: tr.querySelector('.item-unit').value, qty: parseFloat(tr.querySelector('.item-qty').value), 
                    cost: parseFloat(tr.querySelector('.item-cost').value), 
                    oh: parseFloat(tr.querySelector('.item-oh').value || 0), pr: parseFloat(tr.querySelector('.item-pr').value || 0),
                    price: parseFloat(tr.querySelector('.item-price').value) 
                });
            }
        });
        
        const idData = window.estimator.generateIdData();
        const currentId = document.getElementById('currentEditingEstId').value;
        let rev = parseInt(document.getElementById('currentEditingEstRev').value || 0);
        let finalId = idData.fullId;

        const estimationData = { 
            projectName: document.getElementById('estProjectName').value.trim(), 
            location: document.getElementById('estLocation').value.trim(), 
            title: document.getElementById('estTitle').value.trim(), 
            date: document.getElementById('estDate').value, 
            clientName: document.getElementById('estClientSelect').value,
            projectAbbr: document.getElementById('estProjectCodeSelect').value,
            items 
        };

        if (currentId) {
            // Editing existing
            if (confirm(`Save as a NEW REVISION (R${rev + 1})?\n\n[OK] = Create New Revision (Safe)\n[Cancel] = Overwrite Current Version`)) {
                rev++;
                finalId = idData.baseId + `R${rev}`;
                document.getElementById('currentEditingEstId').value = finalId;
                document.getElementById('currentEditingEstRev').value = rev;
                window.app.db.estimations.push({ ...estimationData, id: finalId, baseId: idData.baseId, quoteOfDay: idData.quoteOfDay, revision: rev, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
            } else {
                // Overwrite current
                const idx = window.app.db.estimations.findIndex(e => e.id === currentId);
                if(idx > -1) {
                    const originalTime = window.app.db.estimations[idx].time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    window.app.db.estimations[idx] = { ...estimationData, id: finalId, baseId: idData.baseId, quoteOfDay: idData.quoteOfDay, revision: rev, time: originalTime };
                    document.getElementById('currentEditingEstId').value = finalId;
                }
            }
        } else {
            // Saving brand new
            document.getElementById('currentEditingEstId').value = finalId;
            document.getElementById('currentEditingEstRev').value = rev;
            window.app.db.estimations.push({ ...estimationData, id: finalId, baseId: idData.baseId, quoteOfDay: idData.quoteOfDay, revision: rev, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
        }
        
        window.app.saveData(); 
        window.estimator.updateEstIdPreview(); 
        alert(`Estimation [${finalId}] saved and synced successfully!`); 
        
        if(window.dataManager && window.dataManager.renderHistoryTable) window.dataManager.renderHistoryTable(); 
        if(typeof window.invoicer !== 'undefined') window.invoicer.renderEstimationChecklist(); 
    }
};

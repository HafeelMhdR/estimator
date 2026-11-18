window.estimator = {
    // NEW: Auto-generate the Estimation ID Preview
    generateBaseId: () => {
        const comp = window.app.db.company.abbr || 'COMP';
        
        const clientName = document.getElementById('estClientSelect').value;
        const client = window.app.db.clients.find(c => c.name === clientName);
        const cliAbbr = client && client.abbr ? client.abbr : 'CLI';
        
        const projAbbr = document.getElementById('estProjectCodeSelect').value || 'PRJ';
        
        const rawDate = document.getElementById('estDate').value;
        let dateStr = "00000000";
        if (rawDate) {
            const parts = rawDate.split('-'); // YYYY-MM-DD
            dateStr = `${parts[1]}${parts[2]}${parts[0]}`; // MMDDYYYY
        }
        
        return `${comp}-${cliAbbr}-${projAbbr}-${dateStr}`;
    },

    updateEstIdPreview: () => {
        const currentId = document.getElementById('currentEditingEstId').value;
        let displayId = currentId;
        
        if (!currentId) {
            // New estimation being built
            displayId = window.estimator.generateBaseId();
        } 
        // If there's a current ID, it's loaded from history. The user should see that ID until they revise.

        const previewEl = document.getElementById('estIdPreview');
        if(previewEl) previewEl.innerText = `Estimation: ${displayId}`;

        // Also push the project description into the name box if empty
        const projAbbr = document.getElementById('estProjectCodeSelect').value;
        const projNameBox = document.getElementById('estProjectName');
        if (projAbbr && !currentId) {
            const p = window.app.db.projectCodes.find(x => x.code === projAbbr);
            if (p) projNameBox.value = p.desc;
        }
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
        document.getElementById('estTitle').value = 'BILLS OF QUANTITIES';
        document.getElementById('estDate').valueAsDate = new Date();
        if (document.getElementById('estClientSelect').options.length > 0) document.getElementById('estClientSelect').selectedIndex = 0;
        
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
        let opt = '<option value="">Select...</option>'; window.app.db.codes.forEach(c => opt += `<option value="${c.code}">${c.code} - ${c.desc}</option>`);
        
        const tr = document.createElement('tr'); tr.className = 'estimation-row item-row border-b text-xs';
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
            <td class="p-1 border"><input type="number" class="w-full border rounded p-1 text-center item-qty" value="1" oninput="window.estimator.recalculateEstimation()"></td>
            <td class="p-1 border"><input type="number" class="w-full border rounded p-1 text-right item-cost" value="100" oninput="window.estimator.recalculateEstimation()"></td>
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
        let items = [];
        document.querySelectorAll('.estimation-row').forEach(tr => { 
            if (tr.classList.contains('category-row')) {
                items.push({ type: 'category', title: tr.querySelector('.cat-title').value });
            } else {
                items.push({ 
                    type: 'item',
                    code: tr.querySelector('.item-code-select').value, desc: tr.querySelector('.item-desc').value, 
                    unit: tr.querySelector('.item-unit').value, qty: tr.querySelector('.item-qty').value, 
                    cost: tr.querySelector('.item-cost').value, 
                    oh: tr.querySelector('.item-oh').value, pr: tr.querySelector('.item-pr').value,
                    price: tr.querySelector('.item-price').value 
                });
            }
        });
        
        // Advanced ID & Revision Logic
        const baseId = window.estimator.generateBaseId();
        const currentId = document.getElementById('currentEditingEstId').value;
        let rev = parseInt(document.getElementById('currentEditingEstRev').value || 0);

        let finalId = baseId + (rev > 0 ? `R${rev}` : '');

        const estimationData = { 
            projectName: document.getElementById('estProjectName').value, 
            location: document.getElementById('estLocation').value, 
            title: document.getElementById('estTitle').value, 
            date: document.getElementById('estDate').value, 
            clientName: document.getElementById('estClientSelect').value,
            projectAbbr: document.getElementById('estProjectCodeSelect').value,
            items 
        };

        if (currentId) {
            // We are editing an existing estimation
            if (confirm(`Save as a NEW REVISION (R${rev + 1})?\n\n[OK] = Create New Revision (Safe)\n[Cancel] = Overwrite Current Version`)) {
                // User wants a new revision
                rev++;
                finalId = baseId + `R${rev}`;
                document.getElementById('currentEditingEstId').value = finalId;
                document.getElementById('currentEditingEstRev').value = rev;
                window.app.db.estimations.push({ ...estimationData, id: finalId, baseId, revision: rev });
            } else {
                // Overwrite current
                const idx = window.app.db.estimations.findIndex(e => e.id === currentId);
                if(idx > -1) {
                    finalId = baseId + (rev > 0 ? `R${rev}` : '');
                    window.app.db.estimations[idx] = { ...estimationData, id: finalId, baseId, revision: rev };
                    document.getElementById('currentEditingEstId').value = finalId;
                }
            }
        } else {
            // Brand new estimation, check if base exists to auto-bump
            const existing = window.app.db.estimations.filter(e => e.baseId === baseId);
            if (existing.length > 0) {
                rev = Math.max(...existing.map(e => e.revision || 0)) + 1;
                finalId = baseId + `R${rev}`;
                alert(`An estimation for this client/project/date already exists.\nSaving as Revision ${rev}:\n${finalId}`);
            }
            document.getElementById('currentEditingEstId').value = finalId;
            document.getElementById('currentEditingEstRev').value = rev;
            window.app.db.estimations.push({ ...estimationData, id: finalId, baseId, revision: rev });
        }
        
        window.app.saveData(); 
        window.estimator.updateEstIdPreview(); // Lock in the UI text
        alert(`Estimation [${finalId}] saved and synced successfully!`); 
        
        if(window.dataManager && window.dataManager.renderHistoryTable) window.dataManager.renderHistoryTable(); 
        if(typeof window.invoicer !== 'undefined') window.invoicer.renderEstimationChecklist(); 
    }
};

window.estimator = {
    validateEstimation: () => {
        const client = document.getElementById('estClientSelect').value;
        const proj = document.getElementById('estProjectCodeSelect').value;
        const loc = document.getElementById('estLocation').value;
        const title = document.getElementById('estTitle').value;
        const date = document.getElementById('estDate').value;
        
        if (!client || !proj || !loc || !title || !date) {
            alert("Please fill all header details (Client, Project Code, Date, Project Name, Location, Title) before saving or exporting.");
            return false;
        }

        const items = document.querySelectorAll('.item-row');
        if (items.length === 0) {
            alert("Please add at least one item to the estimation.");
            return false;
        }

        let isValid = true;
        items.forEach((tr) => {
            const code = tr.querySelector('.item-code-select').value;
            const desc = tr.querySelector('.item-desc').value;
            const unit = tr.querySelector('.item-unit').value;
            const qty = tr.querySelector('.item-qty').value;
            const cost = tr.querySelector('.item-cost').value;

            if (!code || !desc || !unit || qty === "" || cost === "") {
                isValid = false;
            }
        });

        if (!isValid) {
            alert("Please ensure NO blanks exist in any item row (Code, Description, Unit, Qty, Cost must all be filled).");
            return false;
        }
        return true;
    },

    generateBaseId: () => {
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
        
        return `${comp}-${cliAbbr}-${projAbbr}-${dateStr}`;
    },

    updateEstIdPreview: () => {
        const baseId = window.estimator.generateBaseId();
        const currentId = document.getElementById('currentEditingEstId').value;
        const rawDate = document.getElementById('estDate').value;
        let displayId = currentId;
        
        // If new, or if they changed core fields (baseId changed)
        if (!currentId || !currentId.startsWith(baseId)) {
            // Find how many estimations exist purely on this calendar date to get "x"
            const sameDate = window.app.db.estimations.filter(e => e.date === rawDate && (!currentId || e.id !== currentId));
            const x = sameDate.length + 1;
            displayId = `${baseId}${x}`;
        }

        const previewEl = document.getElementById('estIdPreview');
        if(previewEl) previewEl.innerText = `Estimation: ${displayId}`;

        const projAbbr = document.getElementById('estProjectCodeSelect').value;
        const projNameBox = document.getElementById('estProjectName');
        if (projAbbr && !currentId && !projNameBox.value) {
            const p = window.app.db.projectCodes.find(x => x.code === projAbbr);
            if (p) projNameBox.value = p.desc;
        }

        return displayId; // So save function can use it
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
        document.getElementById('estDate').value = '';
        
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
        let opt = '<option value="" disabled selected>Select...</option>'; window.app.db.codes.forEach(c => opt += `<option value="${c.code}">${c.code} - ${c.desc}</option>`);
        
        const tr = document.createElement('tr'); tr.className = 'estimation-row item-row border-b text-xs';
        tr.innerHTML = `
            <td class="p-1 border text-center"><input type="checkbox" class="row-chk"></td>
            <td class="p-1 border text-center font-bold item-num"></td>
            <td class="p-1 border"><select class="w-full border rounded p-1 item-code-select" onchange="const f=window.app.db.codes.find(c=>c.code===this.value);if(f)this.closest('tr').querySelector('.item-desc').value=f.desc;">${opt}</select></td>
            <td class="p-1 border"><input type="text" class="w-full border rounded p-1 item-desc" placeholder="Item Desc"></td>
            <td class="p-1 border text-center">
                <select class="w-full border rounded p-1 text-center item-unit">
                    <option value="" disabled selected>Unit...</option>
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
            <td class="p-1 border"><input type="number" class="w-full border rounded p-1 text-center item-qty" value="1" placeholder="Qty" oninput="window.estimator.recalculateEstimation()"></td>
            <td class="p-1 border"><input type="number" class="w-full border rounded p-1 text-right item-cost" value="" placeholder="Cost" oninput="window.estimator.recalculateEstimation()"></td>
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
        if (!window.estimator.validateEstimation()) return;

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
        
        const generatedId = window.estimator.updateEstIdPreview();
        const currentId = document.getElementById('currentEditingEstId').value;
        let rev = parseInt(document.getElementById('currentEditingEstRev').value || 0);
        let finalId = generatedId;

        const baseIdFromGenerated = generatedId.replace(/R\d+$/, '');

        const estimationData = { 
            projectName: document.getElementById('estProjectName').value, 
            location: document.getElementById('estLocation').value, 
            title: document.getElementById('estTitle').value, 
            date: document.getElementById('estDate').value, 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            clientName: document.getElementById('estClientSelect').value,
            projectAbbr: document.getElementById('estProjectCodeSelect').value,
            items 
        };

        if (currentId && currentId.startsWith(baseIdFromGenerated)) {
            // Modifying the same quote
            if (confirm(`Save as a NEW REVISION (R${rev + 1})?\n\n[OK] = Create R${rev + 1} (Preserves old version)\n[Cancel] = Overwrite Current Version`)) {
                rev++;
                finalId = baseIdFromGenerated + `R${rev}`;
                document.getElementById('currentEditingEstId').value = finalId;
                document.getElementById('currentEditingEstRev').value = rev;
                window.app.db.estimations.push({ ...estimationData, id: finalId, revision: rev });
            } else {
                const idx = window.app.db.estimations.findIndex(e => e.id === currentId);
                if(idx > -1) {
                    finalId = currentId; // keep exact same ID if overwriting
                    window.app.db.estimations[idx] = { ...estimationData, id: finalId, revision: rev };
                }
            }
        } else if (currentId) {
            // They were editing, but changed the client/project/date so the ID physically changed
            // Overwrite the old record, but apply the new ID
            const idx = window.app.db.estimations.findIndex(e => e.id === currentId);
            if(idx > -1) {
                window.app.db.estimations[idx] = { ...estimationData, id: finalId, revision: 0 };
                document.getElementById('currentEditingEstId').value = finalId;
                document.getElementById('currentEditingEstRev').value = 0;
            }
        } else {
            // Brand new estimation
            document.getElementById('currentEditingEstId').value = finalId;
            document.getElementById('currentEditingEstRev').value = 0;
            window.app.db.estimations.push({ ...estimationData, id: finalId, revision: 0 });
        }
        
        window.app.saveData(); 
        window.estimator.updateEstIdPreview(); 
        alert(`Estimation [${finalId}] saved successfully!`); 
        
        if(window.dataManager && window.dataManager.renderHistoryTable) window.dataManager.renderHistoryTable(); 
        if(typeof window.invoicer !== 'undefined') window.invoicer.renderEstimationChecklist(); 
    }
};

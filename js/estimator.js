window.estimator = {
    resetTerms: () => {
        const container = document.getElementById('termsContainer');
        if (container) container.innerHTML = '';
        window.estimator.addTermRow('Offer Validity', '1 month');
        window.estimator.addTermRow('Payment Terms', '100% advance payment');
        window.estimator.addTermRow('Delivery or Execution Period', '');
    },

    generateIdData: () => {
        const comp = window.app.db.company.abbr || 'COMP';
        const clientSelect = document.getElementById('estClientSelect');
        const clientName = clientSelect ? clientSelect.value : '';
        const client = window.app.db.clients.find(c => c.name === clientName);
        const cliAbbr = client && client.abbr ? client.abbr : 'CLI';
        
        const projSelect = document.getElementById('estProjectCodeSelect');
        const projAbbr = projSelect && projSelect.value ? projSelect.value : 'PRJ';
        
        const dateInput = document.getElementById('estDate');
        const rawDate = dateInput ? dateInput.value : '';
        let dateStr = "00000000";
        if (rawDate) {
            const parts = rawDate.split('-'); 
            dateStr = `${parts[1]}${parts[2]}${parts[0]}`; 
        }
        
        const basePrefix = `${comp}-${cliAbbr}-${projAbbr}-${dateStr}`;
        
        const editingIdEl = document.getElementById('currentEditingEstId');
        const currentId = editingIdEl ? editingIdEl.value : '';
        
        const revEl = document.getElementById('currentEditingEstRev');
        let rev = revEl ? parseInt(revEl.value || 0) : 0;

        if (currentId && !currentId.startsWith('EST-')) {
            const existingEst = window.app.db.estimations.find(e => e.id === currentId);
            if (existingEst && existingEst.baseId && String(existingEst.baseId).startsWith(basePrefix)) {
                return { baseId: existingEst.baseId, fullId: existingEst.baseId + (rev > 0 ? `R${rev}` : ''), quoteOfDay: existingEst.quoteOfDay || 1 };
            }
        }

        const samePrefixEsts = window.app.db.estimations.filter(e => e.baseId && String(e.baseId).startsWith(basePrefix));
        let maxX = 0;
        samePrefixEsts.forEach(e => {
            let q = e.quoteOfDay;
            if (!q && e.baseId) {
                const numStr = String(e.baseId).substring(basePrefix.length);
                q = parseInt(numStr) || 0;
            }
            if (q > maxX) maxX = q;
        });
        
        const x = maxX + 1;
        const baseId = `${basePrefix}${x}`;
        
        if (currentId && !currentId.startsWith('EST-')) {
            const existingEst = window.app.db.estimations.find(e => e.id === currentId);
            if (existingEst && existingEst.baseId && !String(existingEst.baseId).startsWith(basePrefix)) {
                rev = 0;
                if (revEl) revEl.value = 0;
            }
        }
        
        return { baseId, fullId: baseId + (rev > 0 ? `R${rev}` : ''), quoteOfDay: x };
    },

    updateEstIdPreview: () => {
        const clientSelect = document.getElementById('estClientSelect');
        const projSelect = document.getElementById('estProjectCodeSelect');
        const dateInput = document.getElementById('estDate');
        const previewEl = document.getElementById('estIdPreview');
        
        if(!clientSelect?.value || !projSelect?.value || !dateInput?.value) {
            if(previewEl) previewEl.innerText = `Estimation: [Fill details to generate ID]`;
            return;
        }

        const idData = window.estimator.generateIdData();
        if(previewEl) previewEl.innerText = `Estimation: ${idData.fullId}`;

        const projNameBox = document.getElementById('estProjectName');
        const currentIdEl = document.getElementById('currentEditingEstId');
        
        if (projSelect.value && (!currentIdEl || !currentIdEl.value) && projNameBox && !projNameBox.value) {
            const p = window.app.db.projectCodes.find(x => x.code === projSelect.value);
            if (p) projNameBox.value = p.desc;
        }
    },

    validateForm: () => {
        if (!document.getElementById('estClientSelect')?.value) return "Please select a Client.";
        if (!document.getElementById('estProjectCodeSelect')?.value) return "Please select a Project Code.";
        if (!document.getElementById('estDate')?.value) return "Please select a Date.";
        if (!document.getElementById('estTitle')?.value.trim()) return "Please enter a Document Title.";
        if (!document.getElementById('estLocation')?.value.trim()) return "Please enter a Project Location.";
        if (document.getElementById('globalOverhead')?.value === '') return "Please enter Global Overhead %.";
        if (document.getElementById('globalProfit')?.value === '') return "Please enter Global Profit %.";
        if (document.getElementById('globalVat')?.value === '') return "Please enter VAT %.";

        const rows = document.querySelectorAll('.estimation-row');
        if (rows.length === 0) return "Please add at least one category or item.";

        for (let i = 0; i < rows.length; i++) {
            const tr = rows[i];
            if (tr.classList.contains('category-row')) {
                const titleEl = tr.querySelector('.cat-title');
                if (!titleEl || !titleEl.value.trim()) return `Category row ${i+1} is missing a title.`;
            } else if (tr.classList.contains('item-row')) {
                const code = tr.querySelector('.item-code-select')?.value;
                const desc = tr.querySelector('.item-desc')?.value.trim();
                const unit = tr.querySelector('.item-unit')?.value;
                const qty = tr.querySelector('.item-qty')?.value;
                const cost = tr.querySelector('.item-cost')?.value;

                if (!code) return `Item row ${i+1} is missing an Item Code.`;
                if (!desc) return `Item row ${i+1} is missing a Description.`;
                if (!unit) return `Item row ${i+1} is missing a Unit.`;
                if (!qty || parseFloat(qty) <= 0) return `Item row ${i+1} is missing a valid Quantity.`;
                if (!cost || cost === '') return `Item row ${i+1} is missing an Internal Cost.`;
            }
        }
        
        let hasEmptyTermTitle = false;
        document.querySelectorAll('.term-row').forEach(row => {
            const tValEl = row.querySelector('.term-value');
            const tTitleEl = row.querySelector('.term-title');
            if (tValEl && tTitleEl && tValEl.value.trim() && !tTitleEl.value.trim()) {
                hasEmptyTermTitle = true;
            }
        });
        if (hasEmptyTermTitle) return "A Term & Condition row has a value but is missing a heading.";

        return null; 
    },

    moveTermUp: (btn) => {
        const row = btn.closest('.term-row');
        if (row.previousElementSibling) row.parentNode.insertBefore(row, row.previousElementSibling);
    },
    
    moveTermDown: (btn) => {
        const row = btn.closest('.term-row');
        if (row.nextElementSibling) row.parentNode.insertBefore(row.nextElementSibling, row);
    },

    addTermRow: (title = "", value = "") => {
        const container = document.getElementById('termsContainer');
        if(!container) return;
        const div = document.createElement('div');
        div.className = 'term-row flex items-start space-x-2';
        div.innerHTML = `
            <input type="text" class="term-title border rounded px-2 py-1.5 text-xs font-bold w-1/4" placeholder="Term Heading" value="${title}">
            <input type="text" class="term-value border rounded px-2 py-1.5 text-xs w-3/4" placeholder="Term Value or Description" value="${value}">
            <div class="flex space-x-1">
                <button onclick="window.estimator.moveTermUp(this)" class="bg-slate-200 hover:bg-slate-300 px-2 py-1 text-xs rounded shadow-sm">↑</button>
                <button onclick="window.estimator.moveTermDown(this)" class="bg-slate-200 hover:bg-slate-300 px-2 py-1 text-xs rounded shadow-sm">↓</button>
                <button onclick="this.closest('.term-row').remove()" class="bg-red-100 hover:bg-red-200 text-red-600 px-2 py-1 text-xs rounded shadow-sm">✕</button>
            </div>
        `;
        container.appendChild(div);
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
        if(document.getElementById('currentEditingEstId')) document.getElementById('currentEditingEstId').value = ''; 
        if(document.getElementById('currentEditingEstRev')) document.getElementById('currentEditingEstRev').value = '0';
        if(document.getElementById('estProjectName')) document.getElementById('estProjectName').value = '';
        if(document.getElementById('estLocation')) document.getElementById('estLocation').value = '';
        if(document.getElementById('estTitle')) document.getElementById('estTitle').value = '';
        
        const dt = window.app.getCurrentDateTime();
        if(document.getElementById('estDate')) document.getElementById('estDate').value = dt.date;
        
        if (document.getElementById('estClientSelect') && document.getElementById('estClientSelect').options.length > 0) document.getElementById('estClientSelect').selectedIndex = 0;
        if (document.getElementById('estProjectCodeSelect') && document.getElementById('estProjectCodeSelect').options.length > 0) document.getElementById('estProjectCodeSelect').selectedIndex = 0;
        
        if(document.getElementById('globalOverhead')) document.getElementById('globalOverhead').value = 15;
        if(document.getElementById('globalProfit')) document.getElementById('globalProfit').value = 35;
        if(document.getElementById('globalVat')) document.getElementById('globalVat').value = 15;
        
        const tbody = document.getElementById('estimationRowsBody');
        if(tbody) tbody.innerHTML = '';
        window.estimator.addEstimationRow();
        window.estimator.updateEstIdPreview();
        window.estimator.resetTerms();
    },

    toggleAllRows: (cb) => { document.querySelectorAll('.row-chk').forEach(chk => chk.checked = cb.checked); },

    updateBulkCategoryDropdown: () => {
        const sel = document.getElementById('bulkCategory');
        if(!sel) return;
        const currVal = sel.value;
        sel.innerHTML = '<option value="">-- Do Not Move --</option>';
        document.querySelectorAll('.category-row').forEach((cat, idx) => {
            if(!cat.id) cat.id = 'cat-' + Date.now() + '-' + idx;
            const titleEl = cat.querySelector('.cat-title');
            const title = titleEl ? titleEl.value : "Unnamed Category";
            sel.innerHTML += `<option value="${cat.id}">${title}</option>`;
        });
        sel.value = currVal; 
    },

    applyBulkMargins: () => {
        const newOh = document.getElementById('bulkOh')?.value;
        const newPr = document.getElementById('bulkPr')?.value;
        const targetCatId = document.getElementById('bulkCategory')?.value;
        
        const checkedItems = [];
        document.querySelectorAll('.item-row').forEach(tr => {
            const chk = tr.querySelector('.row-chk');
            if(chk && chk.checked) checkedItems.push(tr);
        });

        checkedItems.forEach(tr => {
            if(newOh !== '' && tr.querySelector('.item-oh')) tr.querySelector('.item-oh').value = newOh;
            if(newPr !== '' && tr.querySelector('.item-pr')) tr.querySelector('.item-pr').value = newPr;
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
        if(document.getElementById('bulkOh')) document.getElementById('bulkOh').value = ''; 
        if(document.getElementById('bulkPr')) document.getElementById('bulkPr').value = '';
        if(document.getElementById('bulkCategory')) document.getElementById('bulkCategory').value = '';
        document.querySelectorAll('.row-chk').forEach(c => c.checked = false);
    },

    addEstimationCategory: (defaultTitle = "") => {
        const tbody = document.getElementById('estimationRowsBody');
        if(!tbody) return;
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
        if(!tbody) return;
        const defOh = document.getElementById('globalOverhead')?.value || 15;
        const defPr = document.getElementById('globalProfit')?.value || 35;
        let opt = '<option value="" disabled selected>Select...</option>'; 
        window.app.db.codes.forEach(c => opt += `<option value="${c.code}">${c.code} - ${c.desc}</option>`);
        
        const tr = document.createElement('tr'); tr.className = 'estimation-row item-row border-b text-xs';
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
        if(!tbody) return;
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
        const globalVatEl = document.getElementById('globalVat');
        const globalVat = globalVatEl ? parseFloat(globalVatEl.value||0) / 100 : 0.15;
        
        let catNum = 0; let itemNum = 0;
        document.querySelectorAll('.estimation-row').forEach((tr) => {
            if (tr.classList.contains('category-row')) {
                catNum++; itemNum = 0;
                if(tr.querySelector('.item-num')) tr.querySelector('.item-num').innerText = catNum;
            } else if (tr.classList.contains('item-row')) {
                itemNum++;
                let numStr = itemNum < 10 ? `0${itemNum}` : itemNum;
                if(tr.querySelector('.item-num')) tr.querySelector('.item-num').innerText = catNum > 0 ? `${catNum}.${numStr}` : itemNum;
                
                const qty = parseFloat(tr.querySelector('.item-qty')?.value||0);
                const cost = parseFloat(tr.querySelector('.item-cost')?.value||0);
                const oh = parseFloat(tr.querySelector('.item-oh')?.value||0) / 100;
                const pr = parseFloat(tr.querySelector('.item-pr')?.value||0) / 100;
                
                const price = cost * (1 + oh + pr);
                const lineCost = qty * cost;
                const lineTotal = qty * price;
                
                if(tr.querySelector('.item-price')) tr.querySelector('.item-price').value = price.toFixed(2);
                if(tr.querySelector('.item-total')) tr.querySelector('.item-total').innerText = window.app.formatMoney(lineTotal);
                if(tr.querySelector('.item-profit')) tr.querySelector('.item-profit').innerText = window.app.formatMoney(lineCost * pr);
                
                subtotal += lineTotal; totalCost += lineCost;
                totalOverhead += (lineCost * oh); totalProfit += (lineCost * pr);
            }
        });
        
        if(document.getElementById('summaryCost')) document.getElementById('summaryCost').innerText = window.app.formatMoney(totalCost);
        if(document.getElementById('summaryOverhead')) document.getElementById('summaryOverhead').innerText = window.app.formatMoney(totalOverhead);
        if(document.getElementById('summaryProfit')) document.getElementById('summaryProfit').innerText = window.app.formatMoney(totalProfit);
        if(document.getElementById('summaryMargin')) document.getElementById('summaryMargin').innerText = window.app.formatMoney(totalOverhead + totalProfit);
        if(document.getElementById('summarySubtotal')) document.getElementById('summarySubtotal').innerText = window.app.formatMoney(subtotal);
        if(document.getElementById('summaryVat')) document.getElementById('summaryVat').innerText = window.app.formatMoney(subtotal * globalVat);
        if(document.getElementById('summaryGrandTotal')) document.getElementById('summaryGrandTotal').innerText = window.app.formatMoney(subtotal + (subtotal * globalVat));
    },

    saveEstimation: () => {
        const error = window.estimator.validateForm();
        if(error) return alert(error);

        let items = [];
        document.querySelectorAll('.estimation-row').forEach(tr => { 
            if (tr.classList.contains('category-row')) {
                const titleEl = tr.querySelector('.cat-title');
                items.push({ type: 'category', title: titleEl ? titleEl.value.trim() : 'Category' });
            } else if (tr.classList.contains('item-row')) {
                const commentEl = tr.querySelector('.item-comment');
                items.push({ 
                    type: 'item',
                    code: tr.querySelector('.item-code-select')?.value || '', 
                    desc: tr.querySelector('.item-desc')?.value.trim() || '', 
                    comment: commentEl ? commentEl.value.trim() : '', 
                    unit: tr.querySelector('.item-unit')?.value || 'ITEM', 
                    qty: parseFloat(tr.querySelector('.item-qty')?.value || 0), 
                    cost: parseFloat(tr.querySelector('.item-cost')?.value || 0), 
                    oh: parseFloat(tr.querySelector('.item-oh')?.value || 0), 
                    pr: parseFloat(tr.querySelector('.item-pr')?.value || 0),
                    price: parseFloat(tr.querySelector('.item-price')?.value || 0) 
                });
            }
        });
        
        let terms = [];
        document.querySelectorAll('.term-row').forEach(row => {
            terms.push({
                title: row.querySelector('.term-title')?.value.trim() || '',
                value: row.querySelector('.term-value')?.value.trim() || ''
            });
        });
        
        const idData = window.estimator.generateIdData();
        const currentIdEl = document.getElementById('currentEditingEstId');
        const revEl = document.getElementById('currentEditingEstRev');
        
        const currentId = currentIdEl ? currentIdEl.value : '';
        let rev = revEl ? parseInt(revEl.value || 0) : 0;
        let finalId = idData.fullId;

        const estimationData = { 
            projectName: document.getElementById('estProjectName')?.value.trim() || '', 
            location: document.getElementById('estLocation')?.value.trim() || '', 
            title: document.getElementById('estTitle')?.value.trim() || 'ESTIMATION BOQ', 
            date: document.getElementById('estDate')?.value || '', 
            clientName: document.getElementById('estClientSelect')?.value || '',
            projectAbbr: document.getElementById('estProjectCodeSelect')?.value || '',
            items,
            terms
        };

        if (currentId) {
            if (confirm(`Save as a NEW REVISION (R${rev + 1})?\n\n[OK] = Create New Revision (Safe)\n[Cancel] = Overwrite Current Version`)) {
                rev++;
                finalId = idData.baseId + `R${rev}`;
                if(currentIdEl) currentIdEl.value = finalId;
                if(revEl) revEl.value = rev;
                window.app.db.estimations.push({ ...estimationData, id: finalId, baseId: idData.baseId, quoteOfDay: idData.quoteOfDay, revision: rev, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
            } else {
                const idx = window.app.db.estimations.findIndex(e => e.id === currentId);
                if(idx > -1) {
                    const originalTime = window.app.db.estimations[idx].time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    window.app.db.estimations[idx] = { ...estimationData, id: finalId, baseId: idData.baseId, quoteOfDay: idData.quoteOfDay, revision: rev, time: originalTime };
                    if(currentIdEl) currentIdEl.value = finalId;
                }
            }
        } else {
            if(currentIdEl) currentIdEl.value = finalId;
            if(revEl) revEl.value = rev;
            window.app.db.estimations.push({ ...estimationData, id: finalId, baseId: idData.baseId, quoteOfDay: idData.quoteOfDay, revision: rev, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
        }
        
        window.app.saveData(); 
        window.estimator.updateEstIdPreview(); 
        
        // Redirect to History and Highlight
        window.ui.switchTab('history');
        if(window.dataManager && window.dataManager.renderHistoryTable) window.dataManager.renderHistoryTable(finalId); 
        if(typeof window.invoicer !== 'undefined') window.invoicer.renderEstimationChecklist(); 
    }
};

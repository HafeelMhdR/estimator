// Invoicing Engine
window.invoicer = {
    renderEstimationChecklist: () => {
        const filterEl = document.getElementById('estFilter');
        const filterText = filterEl ? filterEl.value.toLowerCase() : '';
        const container = document.getElementById('estimationChecklistContainer'); 
        
        // Null safety: prevent crash if container is hidden/missing
        if (!container) return; 
        
        container.innerHTML = ''; 
        let found = 0;
        
        window.app.db.estimations.forEach((est, idx) => {
            if(`${est.clientName} ${est.projectName} ${est.date}`.toLowerCase().includes(filterText)) {
                container.innerHTML += `<label class="flex items-center space-x-2 border px-3 py-1.5 rounded cursor-pointer shadow-sm bg-white"><input type="checkbox" value="${idx}" onchange="window.invoicer.renderInvoiceTable()" class="est-checkbox" checked><span class="font-bold text-sky-700">${est.clientName}</span><span class="text-slate-600">| ${est.projectName} (${est.date})</span></label>`;
                found++;
            }
        });
        if(found === 0) container.innerHTML = '<span class="text-slate-400">No estimations match your filter.</span>';
        
        window.invoicer.renderInvoiceTable();
    },

    populateInvoiceClient: () => {
        const clientSelect = document.getElementById('invClientSelect');
        if(!clientSelect) return;
        
        const client = window.app.db.clients.find(c => c.name === clientSelect.value);
        
        const toEl = document.getElementById('previewTo');
        const attnEl = document.getElementById('previewAttn');
        const vatEl = document.getElementById('previewClientVat');
        const invNoEl = document.getElementById('previewInvNo');
        const dateEl = document.getElementById('previewDate');
        const poRefEl = document.getElementById('previewPoRef');
        
        if(client) {
            if(toEl) toEl.innerText = client.name || '-';
            if(attnEl) attnEl.innerText = client.attn || '-';
            if(vatEl) vatEl.innerText = client.vat || '-';
        }
        
        const numInput = document.getElementById('invNumber');
        const dateInput = document.getElementById('invDate');
        const poInput = document.getElementById('invPoRef');
        
        if(invNoEl && numInput) invNoEl.innerText = numInput.value || '-';
        if(dateEl && dateInput) dateEl.innerText = dateInput.value || '-';
        if(poRefEl && poInput) poRefEl.innerText = poInput.value || '-';
    },

    renderInvoiceTable: () => {
        window.invoicer.populateInvoiceClient();
        
        const modeEl = document.querySelector('input[name="billMode"]:checked');
        const mode = modeEl ? modeEl.value : 'itemized';
        
        const msInputs = document.getElementById('milestoneInputs');
        // Null safety: check if inputs exist before removing classes
        if (msInputs) {
            if(mode === 'milestone') msInputs.classList.remove('hidden');
            else msInputs.classList.add('hidden');
        }

        const tbody = document.getElementById('invoiceItemsBody'); 
        // Null safety: stop execution if invoice table is hidden/missing
        if(!tbody) return; 
        
        tbody.innerHTML = '';
        let globalSubtotal = 0, scopes = [];

        document.querySelectorAll('.est-checkbox:checked').forEach(chk => {
            const est = window.app.db.estimations[chk.value]; 
            if(!est) return;
            
            scopes.push(est.title || '');
            let estTotal = 0;
            
            (est.items || []).forEach(i => { if(i.type === 'item') estTotal += ((i.qty||0) * (i.price||0)); });

            if (mode === 'milestone') {
                globalSubtotal += estTotal; 
            } else if (mode === 'summary') {
                let catTotal = 0; let currentCat = ""; let cNum = 0;
                (est.items || []).forEach((item, index) => {
                    if (item.type === 'category') {
                        if(currentCat !== "") { tbody.innerHTML += `<tr class="border-b bg-slate-50"><td class="p-2 border border-slate-300 text-center font-bold">${cNum}</td><td class="p-2 border border-slate-300" colspan="4"><b>${currentCat}</b></td><td class="p-2 border border-slate-300 text-right font-bold">${window.app.formatMoney(catTotal)}</td></tr>`; globalSubtotal += catTotal; }
                        currentCat = item.title; catTotal = 0; cNum++;
                    } else {
                        catTotal += ((item.qty||0) * (item.price||0));
                    }
                    if (index === est.items.length - 1 && currentCat !== "") {
                        tbody.innerHTML += `<tr class="border-b bg-slate-50"><td class="p-2 border border-slate-300 text-center font-bold">${cNum}</td><td class="p-2 border border-slate-300" colspan="4"><b>${currentCat}</b></td><td class="p-2 border border-slate-300 text-right font-bold">${window.app.formatMoney(catTotal)}</td></tr>`; globalSubtotal += catTotal;
                    }
                });
            } else {
                let cNum = 0, iNum = 0;
                (est.items || []).forEach(item => {
                    if (item.type === 'category') {
                        cNum++; iNum = 0;
                        tbody.innerHTML += `<tr class="border-b bg-slate-100 font-bold"><td class="p-2 border border-slate-300 text-center">${cNum}</td><td class="p-2 border border-slate-300" colspan="5">${item.title}</td></tr>`;
                    } else {
                        iNum++; let nStr = iNum < 10 ? `0${iNum}` : iNum; let dNum = cNum > 0 ? `${cNum}.${nStr}` : iNum;
                        const total = (item.qty||0) * (item.price||0); globalSubtotal += total;
                        const descHtml = item.comment ? `${item.desc}<br><span class="text-[10px] italic text-slate-500">(${item.comment})</span>` : item.desc;
                        
                        tbody.innerHTML += `<tr class="border-b"><td class="p-2 border border-slate-300 text-center">${dNum}</td><td class="p-2 border border-slate-300">${item.code||''}</td><td class="p-2 border border-slate-300 leading-tight">${descHtml}</td><td class="p-2 border border-slate-300 text-center">${item.unit||''}</td><td class="p-2 border border-slate-300 text-center">${item.qty||0}</td><td class="p-2 border border-slate-300 text-right font-mono">${parseFloat(item.price||0).toFixed(2)}</td><td class="p-2 border border-slate-300 text-right font-bold font-mono">${window.app.formatMoney(total)}</td></tr>`;
                    }
                });
            }
        });

        if (mode === 'milestone') {
            const msTypeEl = document.getElementById('milestoneType');
            const msPctEl = document.getElementById('milestonePct');
            
            const msVal = msTypeEl ? msTypeEl.value.split('|') : ["10030", "Advance Payment"];
            const pct = parseFloat(msPctEl ? msPctEl.value : 100) / 100;
            const msTotal = globalSubtotal * pct;
            tbody.innerHTML = `<tr class="border-b"><td class="p-2 border border-slate-300 text-center">1</td><td class="p-2 border border-slate-300 font-bold">${msVal[0]||''}</td><td class="p-2 border border-slate-300 font-bold">${msVal[1]||''} - ${pct*100}%</td><td class="p-2 border border-slate-300 text-center">LS</td><td class="p-2 border border-slate-300 text-center">1</td><td class="p-2 border border-slate-300 text-right font-mono">${parseFloat(msTotal).toFixed(2)}</td><td class="p-2 border border-slate-300 text-right font-bold font-mono">${window.app.formatMoney(msTotal)}</td></tr>`;
            globalSubtotal = msTotal; 
        }

        const previewScope = document.getElementById('previewScope');
        if(previewScope) previewScope.innerText = scopes.join(', ') || '-';
        
        const invSub = document.getElementById('invSubtotal');
        if(invSub) invSub.innerText = window.app.formatMoney(globalSubtotal);
        
        const invVat = document.getElementById('invVat');
        if(invVat) invVat.innerText = window.app.formatMoney(globalSubtotal * 0.15);
        
        const invGrand = document.getElementById('invGrandTotal');
        if(invGrand) invGrand.innerText = window.app.formatMoney(globalSubtotal * 1.15);
    }
};

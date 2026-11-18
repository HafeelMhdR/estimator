// Invoicing Engine
const invoicer = {
    renderEstimationChecklist: () => {
        const filterText = document.getElementById('estFilter').value.toLowerCase();
        const container = document.getElementById('estimationChecklistContainer'); container.innerHTML = ''; let found = 0;
        app.db.estimations.forEach((est, idx) => {
            if(`${est.clientName} ${est.projectName} ${est.date}`.toLowerCase().includes(filterText)) {
                container.innerHTML += `<label class="flex items-center space-x-2 border px-3 py-1.5 rounded cursor-pointer shadow-sm bg-white"><input type="checkbox" value="${idx}" onchange="invoicer.renderInvoiceTable()" class="est-checkbox" checked><span class="font-bold text-sky-700">${est.clientName}</span><span class="text-slate-600">| ${est.projectName} (${est.date})</span></label>`;
                found++;
            }
        });
        if(found === 0) container.innerHTML = '<span class="text-slate-400">No estimations match your filter.</span>';
        invoicer.renderInvoiceTable();
    },

    populateInvoiceClient: () => {
        const client = app.db.clients.find(c => c.name === document.getElementById('invClientSelect').value);
        if(client) {
            document.getElementById('previewTo').innerText = client.name; document.getElementById('previewAttn').innerText = client.attn;
            document.getElementById('previewClientVat').innerText = client.vat;
        }
        document.getElementById('previewInvNo').innerText = document.getElementById('invNumber').value;
        document.getElementById('previewDate').innerText = document.getElementById('invDate').value;
        document.getElementById('previewPoRef').innerText = document.getElementById('invPoRef').value;
    },

    renderInvoiceTable: () => {
        invoicer.populateInvoiceClient();
        const mode = document.querySelector('input[name="billMode"]:checked').value;
        const msInputs = document.getElementById('milestoneInputs');
        
        if(mode === 'milestone') msInputs.classList.remove('hidden');
        else msInputs.classList.add('hidden');

        const tbody = document.getElementById('invoiceItemsBody'); tbody.innerHTML = '';
        let globalSubtotal = 0, scopes = [];

        document.querySelectorAll('.est-checkbox:checked').forEach(chk => {
            const est = app.db.estimations[chk.value]; scopes.push(est.title);
            let estTotal = 0;
            
            est.items.forEach(i => { if(i.type === 'item') estTotal += (i.qty * i.price); });

            if (mode === 'milestone') {
                globalSubtotal += estTotal; 
            } else if (mode === 'summary') {
                let catTotal = 0; let currentCat = ""; let cNum = 0;
                est.items.forEach((item, index) => {
                    if (item.type === 'category') {
                        if(currentCat !== "") { tbody.innerHTML += `<tr class="border-b bg-slate-50"><td class="p-2 border border-slate-300 text-center font-bold">${cNum}</td><td class="p-2 border border-slate-300" colspan="4"><b>${currentCat}</b></td><td class="p-2 border border-slate-300 text-right font-bold">${app.formatMoney(catTotal)}</td></tr>`; globalSubtotal += catTotal; }
                        currentCat = item.title; catTotal = 0; cNum++;
                    } else {
                        catTotal += (item.qty * item.price);
                    }
                    if (index === est.items.length - 1 && currentCat !== "") {
                        tbody.innerHTML += `<tr class="border-b bg-slate-50"><td class="p-2 border border-slate-300 text-center font-bold">${cNum}</td><td class="p-2 border border-slate-300" colspan="4"><b>${currentCat}</b></td><td class="p-2 border border-slate-300 text-right font-bold">${app.formatMoney(catTotal)}</td></tr>`; globalSubtotal += catTotal;
                    }
                });
            } else {
                let cNum = 0, iNum = 0;
                est.items.forEach(item => {
                    if (item.type === 'category') {
                        cNum++; iNum = 0;
                        tbody.innerHTML += `<tr class="border-b bg-slate-100 font-bold"><td class="p-2 border border-slate-300 text-center">${cNum}</td><td class="p-2 border border-slate-300" colspan="5">${item.title}</td></tr>`;
                    } else {
                        iNum++; let nStr = iNum < 10 ? `0${iNum}` : iNum; let dNum = cNum > 0 ? `${cNum}.${nStr}` : iNum;
                        const total = item.qty * item.price; globalSubtotal += total;
                        tbody.innerHTML += `<tr class="border-b"><td class="p-2 border border-slate-300 text-center">${dNum}</td><td class="p-2 border border-slate-300">${item.code}</td><td class="p-2 border border-slate-300">${item.desc}</td><td class="p-2 border border-slate-300 text-center">${item.unit}</td><td class="p-2 border border-slate-300 text-center">${item.qty}</td><td class="p-2 border border-slate-300 text-right font-mono">${parseFloat(item.price).toFixed(2)}</td><td class="p-2 border border-slate-300 text-right font-bold font-mono">${app.formatMoney(total)}</td></tr>`;
                    }
                });
            }
        });

        if (mode === 'milestone') {
            const msVal = document.getElementById('milestoneType').value.split('|');
            const pct = parseFloat(document.getElementById('milestonePct').value || 0) / 100;
            const msTotal = globalSubtotal * pct;
            tbody.innerHTML = `<tr class="border-b"><td class="p-2 border border-slate-300 text-center">1</td><td class="p-2 border border-slate-300 font-bold">${msVal[0]}</td><td class="p-2 border border-slate-300 font-bold">${msVal[1]} - ${pct*100}%</td><td class="p-2 border border-slate-300 text-center">LS</td><td class="p-2 border border-slate-300 text-center">1</td><td class="p-2 border border-slate-300 text-right font-mono">${parseFloat(msTotal).toFixed(2)}</td><td class="p-2 border border-slate-300 text-right font-bold font-mono">${app.formatMoney(msTotal)}</td></tr>`;
            globalSubtotal = msTotal; 
        }

        document.getElementById('previewScope').innerText = scopes.join(', ');
        document.getElementById('invSubtotal').innerText = app.formatMoney(globalSubtotal);
        document.getElementById('invVat').innerText = app.formatMoney(globalSubtotal * 0.15);
        document.getElementById('invGrandTotal').innerText = app.formatMoney(globalSubtotal * 1.15);
    }
};

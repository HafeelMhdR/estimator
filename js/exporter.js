// PDF and Excel Exporters
window.exporter = {
    exportEstimationExcel: () => {
        const wb = XLSX.utils.book_new();
        const curr = app.db.company.currency;
        let wsData = [
            [`${app.db.company.name.toUpperCase()} - ESTIMATION BOQ`],
            [`PROJECT: ${document.getElementById('estProjectName').value} | LOCATION: ${document.getElementById('estLocation').value}`],
            [],
            ["#", "CODE", "DESCRIPTION", "UNIT", "QTY", `INT. COST (${curr})`, "OH %", "PR %", `CLIENT PRICE (${curr})`, `CLIENT TOTAL (${curr})`, `INTERNAL TOTAL (${curr})`]
        ];
        let cNum = 0, iNum = 0, headerRow = 4;
        
        document.querySelectorAll('.estimation-row').forEach((tr) => {
            const r = headerRow + 1 + wsData.length - 4; 
            if(tr.classList.contains('category-row')) {
                cNum++; iNum = 0;
                wsData.push([cNum, "", tr.querySelector('.cat-title').value, "", "", "", "", "", "", "", ""]);
            } else {
                iNum++; let numStr = iNum < 10 ? `0${iNum}` : iNum;
                let displayNum = cNum > 0 ? `${cNum}.${numStr}` : iNum;
                wsData.push([
                    displayNum, tr.querySelector('.item-code-select').value, tr.querySelector('.item-desc').value, 
                    tr.querySelector('.item-unit').value, parseFloat(tr.querySelector('.item-qty').value), 
                    parseFloat(tr.querySelector('.item-cost').value),
                    parseFloat(tr.querySelector('.item-oh').value) / 100, parseFloat(tr.querySelector('.item-pr').value) / 100,
                    {t:'n', f:`F${r}*(1+G${r}+H${r})`}, {t:'n', f:`E${r}*I${r}`}, {t:'n', f:`E${r}*F${r}`}
                ]);
            }
        });
        const endRow = headerRow + wsData.length - 4;
        wsData.push([]); 
        wsData.push(["", "", "", "", "", "", "", "", "Subtotal", {t:'n', f:`SUM(J5:J${endRow})`}]); 
        wsData.push(["", "", "", "", "", "", "", "", "VAT 15%", {t:'n', f:`J${endRow+2}*0.15`}]); 
        wsData.push(["", "", "", "", "", "", "", "", "Grand Total", {t:'n', f:`J${endRow+2}+J${endRow+3}`}]);
        
        const ws = XLSX.utils.aoa_to_sheet(wsData); ws['!autofilter'] = { ref: `A4:K${endRow}` };
        for(let i=5; i<=endRow; i++) { if(ws[`G${i}`]) ws[`G${i}`].z = '0%'; if(ws[`H${i}`]) ws[`H${i}`].z = '0%'; }
        XLSX.utils.book_append_sheet(wb, ws, "Estimation"); XLSX.writeFile(wb, `${app.db.company.abbr}_Estimation.xlsx`);
    },

    exportEstimationPDF: () => {
        const orientation = document.getElementById('estPdfOrientation').value;
        const printWidth = orientation === 'portrait' ? '794px' : '1122px';
        
        let h = '';
        let cNum = 0, iNum = 0, catTotal = 0;
        let currentCatName = "";
        const rows = Array.from(document.querySelectorAll('.estimation-row'));
        
        rows.forEach((tr, index) => {
            if(tr.classList.contains('category-row')) {
                if (cNum > 0) { 
                    h += `<tr style="background-color: #f8fafc; font-weight: bold;"><td colspan="5" style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">${currentCatName} Subtotal</td><td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; white-space: nowrap;">${app.formatMoney(catTotal)}</td></tr>`;
                }
                cNum++; iNum = 0; catTotal = 0;
                currentCatName = tr.querySelector('.cat-title').value || "Category";
                h += `<tr style="background-color: #e2e8f0; font-weight: bold;"><td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${cNum}</td><td colspan="5" style="padding: 6px; border: 1px solid #cbd5e1;">${currentCatName}</td></tr>`;
            } else {
                iNum++; let nStr = iNum < 10 ? `0${iNum}` : iNum; let dNum = cNum > 0 ? `${cNum}.${nStr}` : iNum;
                const q = parseFloat(tr.querySelector('.item-qty').value);
                const p = parseFloat(tr.querySelector('.item-price').value);
                const t = q * p;
                catTotal += t;
                
                h += `<tr>
                    <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; width: 6%;">${dNum}</td>
                    <td style="padding: 6px; border: 1px solid #cbd5e1; width: 14%;">${tr.querySelector('.item-code-select').value}</td>
                    <td style="padding: 6px; border: 1px solid #cbd5e1; width: 42%;">${tr.querySelector('.item-desc').value}</td>
                    <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; width: 10%;">${tr.querySelector('.item-unit').value}</td>
                    <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; width: 8%;">${q}</td>
                    <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; white-space: nowrap; width: 20%;">${app.formatMoney(t)}</td>
                </tr>`;
            }
            if (index === rows.length - 1 && cNum > 0) {
                h += `<tr style="background-color: #f8fafc; font-weight: bold;"><td colspan="5" style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">${currentCatName} Subtotal</td><td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; white-space: nowrap;">${app.formatMoney(catTotal)}</td></tr>`;
            }
        });

        const logoStr = app.db.company.logo ? `<img src="${app.db.company.logo}" style="max-height: 80px; max-width: 200px; object-fit: contain;">` : `<div style="font-size: 24px; font-weight: 900; color: #047857;">${app.db.company.name}</div>`;
        
        const printHtml = `
            <div id="pdf-export-container" style="padding: 30px 40px; background: white; color: black; font-family: sans-serif; width: ${printWidth}; box-sizing: border-box; margin: 0 auto;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px;">
                    <div style="width: 50%;">
                        <h1 style="font-size: 22px; font-weight: bold; color: #1e3a8a; margin: 0 0 10px 0;">ESTIMATION BOQ</h1>
                        <p style="font-size: 12px; margin: 3px 0;"><b>Project:</b> ${document.getElementById('estProjectName').value}</p>
                        <p style="font-size: 12px; margin: 3px 0;"><b>Location:</b> ${document.getElementById('estLocation').value}</p>
                        <p style="font-size: 12px; margin: 3px 0;"><b>Date:</b> ${document.getElementById('estDate').value}</p>
                    </div>
                    <div style="width: 50%; text-align: right; display: flex; justify-content: flex-end;">
                        ${logoStr}
                    </div>
                </div>
                <table style="width: 100%; font-size: 11px; border-collapse: collapse; text-align: left; table-layout: fixed;">
                    <thead>
                        <tr style="background-color: #1e3a8a; color: white;">
                            <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; width: 6%;">#</th>
                            <th style="padding: 8px; border: 1px solid #cbd5e1; width: 14%;">Code</th>
                            <th style="padding: 8px; border: 1px solid #cbd5e1; width: 42%;">Description</th>
                            <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; width: 10%;">Unit</th>
                            <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; width: 8%;">Qty</th>
                            <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; width: 20%;">Total Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${h}
                    </tbody>
                </table>
                <div style="margin-top: 30px; display: flex; justify-content: flex-end; page-break-inside: avoid;">
                    <div style="width: 300px; font-size: 13px;">
                        <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e2e8f0;">
                            <span>Subtotal:</span> <strong>${document.getElementById('summarySubtotal').innerText}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e2e8f0; color: #b91c1c;">
                            <span>VAT (15%):</span> <strong>${document.getElementById('summaryVat').innerText}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 16px; font-weight: bold; color: #1e3a8a;">
                            <span>Grand Total:</span> <span>${document.getElementById('summaryGrandTotal').innerText}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const printWrapper = document.createElement('div');
        // Render behind the interface so the browser draws it, but the user doesn't see a flash
        printWrapper.style.position = 'absolute';
        printWrapper.style.top = '0';
        printWrapper.style.left = '0';
        printWrapper.style.zIndex = '-1';
        printWrapper.style.opacity = '0.01';
        printWrapper.style.pointerEvents = 'none';
        
        printWrapper.innerHTML = printHtml;
        document.body.appendChild(printWrapper);
        
        const worker = html2pdf().set({
            margin:       [10, 0, 10, 0],
            filename:     `${app.db.company.abbr}_Estimation.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, windowWidth: parseInt(printWidth) },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: orientation }
        }).from(printWrapper.firstElementChild);

        // Clean up the DOM after rendering is complete
        worker.save().then(() => {
            if(document.body.contains(printWrapper)) {
                document.body.removeChild(printWrapper);
            }
        });
    },

    generateProformaExcel: () => {
        const wb = XLSX.utils.book_new();
        const curr = app.db.company.currency;
        let wsData = [[`${app.db.company.name.toUpperCase()} - PROFORMA INVOICE`],["INVOICE #:", document.getElementById('invNumber').value, "", "DATE:", document.getElementById('invDate').value],["TO:", document.getElementById('previewTo').innerText],["ATTN:", document.getElementById('previewAttn').innerText],["CLIENT VAT:", document.getElementById('previewClientVat').innerText],[],["SL", "CODE", "DESCRIPTION", "UNIT", "QTY", `PRICE (${curr})`, `TOTAL (${curr})`]];
        
        const mode = document.querySelector('input[name="billMode"]:checked').value;
        let globalSubtotal = 0;

        document.querySelectorAll('.est-checkbox:checked').forEach(chk => {
            const est = app.db.estimations[chk.value]; let estTotal = 0;
            est.items.forEach(i => { if(i.type === 'item') estTotal += (i.qty * i.price); });

            if (mode === 'milestone') {
                globalSubtotal += estTotal;
            } else if (mode === 'summary') {
                let catTotal = 0; let currentCat = ""; let cNum = 0;
                est.items.forEach((item, index) => {
                    if (item.type === 'category') {
                        if(currentCat !== "") { wsData.push([cNum, "", currentCat, "", "", catTotal]); globalSubtotal += catTotal; }
                        currentCat = item.title; catTotal = 0; cNum++;
                    } else { catTotal += (item.qty * item.price); }
                    if (index === est.items.length - 1 && currentCat !== "") { wsData.push([cNum, "", currentCat, "", "", catTotal]); globalSubtotal += catTotal; }
                });
            } else {
                let cNum = 0, iNum = 0;
                est.items.forEach(item => {
                    if (item.type === 'category') { cNum++; iNum = 0; wsData.push([cNum, "", item.title, "", "", ""]); } 
                    else {
                        iNum++; let nStr = iNum < 10 ? `0${iNum}` : iNum; let dNum = cNum > 0 ? `${cNum}.${nStr}` : iNum;
                        const total = item.qty * item.price; globalSubtotal += total;
                        wsData.push([dNum, item.code, item.desc, item.unit, item.qty, parseFloat(item.price), total]);
                    }
                });
            }
        });

        if (mode === 'milestone') {
            const msVal = document.getElementById('milestoneType').value.split('|');
            const pct = parseFloat(document.getElementById('milestonePct').value || 0) / 100;
            const msTotal = globalSubtotal * pct;
            wsData = wsData.slice(0, 7); 
            wsData.push([1, msVal[0], `${msVal[1]} - ${pct*100}%`, "LS", 1, msTotal]);
            globalSubtotal = msTotal;
        }

        wsData.push([]); wsData.push(["", "", "", "", "Subtotal", globalSubtotal]); wsData.push(["", "", "", "", "VAT 15%", globalSubtotal * 0.15]); wsData.push(["", "", "", "", "Grand Total", globalSubtotal * 1.15]);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsData), "Invoice"); XLSX.writeFile(wb, `${app.db.company.abbr}_Invoice.xlsx`);
    },

    exportInvoicePDF: () => {
        const orientation = document.getElementById('invPdfOrientation').value;
        const printWidth = orientation === 'portrait' ? '794px' : '1122px';
        
        const previewOriginal = document.getElementById('invoicePreviewArea');
        const clone = previewOriginal.cloneNode(true);
        
        clone.style.width = printWidth;
        clone.style.margin = '0 auto';
        clone.style.position = 'absolute';
        
        // Hide behind main UI to force render without flashing
        clone.style.top = '0';
        clone.style.left = '0';
        clone.style.zIndex = '-1';
        clone.style.opacity = '0.01';
        clone.style.pointerEvents = 'none';
        
        document.body.appendChild(clone);

        const worker = html2pdf().set({
            margin:       [10, 0, 10, 0],
            filename:     `${document.getElementById('invNumber').value}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, windowWidth: parseInt(printWidth) },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: orientation }
        }).from(clone);
        
        worker.save().then(() => {
            if(document.body.contains(clone)) {
                document.body.removeChild(clone);
            }
        });
    }
};

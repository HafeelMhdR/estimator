window.exporter = {
    setLoadingState: (button, isLoading) => {
        if (!button) return;
        if (isLoading) {
            button.dataset.originalText = button.innerText;
            button.innerText = "Generating...";
            button.disabled = true;
            button.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            button.innerText = button.dataset.originalText || "Export";
            button.disabled = false;
            button.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    },

    exportEstimationExcel: async (event) => {
        const error = window.estimator.validateForm();
        if(error) return alert(error);

        const btn = event ? event.currentTarget : null;
        window.exporter.setLoadingState(btn, true);

        setTimeout(() => {
            try {
                const wb = XLSX.utils.book_new();
                const curr = window.app.db.company.currency;
                const estId = document.getElementById('currentEditingEstId').value || window.estimator.generateIdData().fullId;
                const docTitle = (document.getElementById('estTitle').value || "ESTIMATION BOQ").toUpperCase();

                let wsData = [
                    [`${window.app.db.company.name.toUpperCase()} - ${docTitle}`],
                    [`ESTIMATION ID: ${estId}`],
                    [`PROJECT: ${document.getElementById('estProjectName').value} | LOCATION: ${document.getElementById('estLocation').value}`],
                    [],
                    ["#", "CODE", "DESCRIPTION", "UNIT", "QTY", `INT. COST (${curr})`, "OH %", "PR %", `CLIENT PRICE (${curr})`, `CLIENT TOTAL (${curr})`, `INTERNAL TOTAL (${curr})`]
                ];
                let cNum = 0, iNum = 0, headerRow = 5;
                
                document.querySelectorAll('.estimation-row').forEach((tr) => {
                    const r = headerRow + 1 + wsData.length - 5; 
                    if(tr.classList.contains('category-row')) {
                        cNum++; iNum = 0;
                        wsData.push([cNum, "", tr.querySelector('.cat-title').value, "", "", "", "", "", "", "", ""]);
                    } else {
                        iNum++; let numStr = iNum < 10 ? `0${iNum}` : iNum;
                        let displayNum = cNum > 0 ? `${cNum}.${numStr}` : iNum;
                        
                        const desc = tr.querySelector('.item-desc').value.trim();
                        const comment = tr.querySelector('.item-comment').value.trim();
                        const descText = comment ? `${desc}\n(${comment})` : desc;

                        wsData.push([
                            displayNum, tr.querySelector('.item-code-select').value, descText, 
                            tr.querySelector('.item-unit').value, parseFloat(tr.querySelector('.item-qty').value), 
                            parseFloat(tr.querySelector('.item-cost').value),
                            parseFloat(tr.querySelector('.item-oh').value) / 100, parseFloat(tr.querySelector('.item-pr').value) / 100,
                            {t:'n', f:`F${r}*(1+G${r}+H${r})`}, {t:'n', f:`E${r}*I${r}`}, {t:'n', f:`E${r}*F${r}`}
                        ]);
                    }
                });
                const endRow = headerRow + wsData.length - 5;
                wsData.push([]); 
                wsData.push(["", "", "", "", "", "", "", "", "Subtotal", {t:'n', f:`SUM(J6:J${endRow})`}]); 
                wsData.push(["", "", "", "", "", "", "", "", "VAT 15%", {t:'n', f:`J${endRow+2}*0.15`}]); 
                wsData.push(["", "", "", "", "", "", "", "", "Grand Total", {t:'n', f:`J${endRow+2}+J${endRow+3}`}]);
                
                // Attach Terms & Conditions to Excel
                wsData.push([]);
                wsData.push([]);
                wsData.push(["TERMS & CONDITIONS"]);
                document.querySelectorAll('.term-row').forEach(row => {
                    const tTitle = row.querySelector('.term-title').value.trim();
                    const tVal = row.querySelector('.term-value').value.trim();
                    if(tTitle || tVal) wsData.push(["", `• ${tTitle}:`, tVal]);
                });

                const ws = XLSX.utils.aoa_to_sheet(wsData); ws['!autofilter'] = { ref: `A5:K${endRow}` };
                for(let i=6; i<=endRow; i++) { if(ws[`G${i}`]) ws[`G${i}`].z = '0%'; if(ws[`H${i}`]) ws[`H${i}`].z = '0%'; }
                XLSX.utils.book_append_sheet(wb, ws, "Estimation"); XLSX.writeFile(wb, `${estId}.xlsx`);
            } catch (err) {
                console.error(err);
                alert("Excel generation failed.");
            } finally {
                window.exporter.setLoadingState(btn, false);
            }
        }, 100);
    },

    exportEstimationPDF: async (event) => {
        const error = window.estimator.validateForm();
        if(error) return alert(error);

        const btn = event ? event.currentTarget : null;
        window.exporter.setLoadingState(btn, true);

        setTimeout(() => {
            try {
                const { jsPDF } = window.jspdf;
                const orientEl = document.getElementById('estPdfOrientation');
                const orientation = orientEl ? orientEl.value : 'portrait';
                const doc = new jsPDF(orientation, 'pt', 'a4');
                const pageWidth = doc.internal.pageSize.getWidth();
                const curr = (window.app.db.company.currency || 'SAR').replace('﷼', 'SAR');
                const estId = document.getElementById('currentEditingEstId').value || window.estimator.generateIdData().fullId;
                const docTitle = (document.getElementById('estTitle').value || "ESTIMATION BOQ").toUpperCase();

                const formatPdfMoney = (num) => parseFloat(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + curr;

                doc.setFontSize(18); doc.setTextColor(30, 58, 138); doc.setFont(undefined, 'bold');
                doc.text(docTitle, 40, 50);
                
                doc.setFontSize(10); doc.setTextColor(0, 0, 0); doc.setFont(undefined, 'normal');
                doc.text(`Estimation ID: ${estId}`, 40, 70);
                doc.text(`Project: ${document.getElementById('estProjectName').value}`, 40, 85);
                doc.text(`Location: ${document.getElementById('estLocation').value}`, 40, 100);
                doc.text(`Date: ${document.getElementById('estDate').value}`, 40, 115);
                
                if (window.app.db.company.logo) {
                    const img = new Image();
                    img.src = window.app.db.company.logo;
                    const ratio = (img.height || 1) / (img.width || 1);
                    const targetWidth = 120;
                    doc.addImage(window.app.db.company.logo, 'JPEG', pageWidth - targetWidth - 40, 40, targetWidth, targetWidth * ratio, '', 'FAST');
                } else {
                    doc.setFontSize(16); doc.setTextColor(4, 120, 87); doc.setFont(undefined, 'bold');
                    doc.text(window.app.db.company.name, pageWidth - 40, 70, { align: 'right' });
                }

                let bodyData = [];
                let cNum = 0, iNum = 0, catTotal = 0;
                let currentCatName = "";
                const rows = Array.from(document.querySelectorAll('.estimation-row'));
                
                rows.forEach((tr, index) => {
                    if(tr.classList.contains('category-row')) {
                        if (cNum > 0) {
                            bodyData.push([{ content: `${currentCatName} Subtotal`, colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: [248, 250, 252] } }, { content: formatPdfMoney(catTotal), styles: { halign: 'right', fontStyle: 'bold', fillColor: [248, 250, 252] } }]);
                        }
                        cNum++; iNum = 0; catTotal = 0;
                        currentCatName = tr.querySelector('.cat-title').value || "Category";
                        bodyData.push([{ content: cNum.toString(), styles: { halign: 'center', fontStyle: 'bold', fillColor: [226, 232, 240] } }, { content: currentCatName, colSpan: 5, styles: { fontStyle: 'bold', fillColor: [226, 232, 240] } }]);
                    } else {
                        iNum++; let nStr = iNum < 10 ? `0${iNum}` : iNum; let dNum = cNum > 0 ? `${cNum}.${nStr}` : iNum;
                        
                        const desc = tr.querySelector('.item-desc').value.trim();
                        const comment = tr.querySelector('.item-comment').value.trim();
                        const descText = comment ? `${desc}\n   (${comment})` : desc;

                        const code = tr.querySelector('.item-code-select').value;
                        const unit = tr.querySelector('.item-unit').value;
                        const q = parseFloat(tr.querySelector('.item-qty').value) || 0;
                        const p = parseFloat(tr.querySelector('.item-price').value) || 0;
                        const t = q * p;
                        catTotal += t;
                        
                        bodyData.push([
                            { content: dNum.toString(), styles: { halign: 'center' } }, code, descText,
                            { content: unit, styles: { halign: 'center' } },
                            { content: q.toString(), styles: { halign: 'center' } },
                            { content: formatPdfMoney(t), styles: { halign: 'right' } }
                        ]);
                    }
                    if (index === rows.length - 1 && cNum > 0) {
                        bodyData.push([{ content: `${currentCatName} Subtotal`, colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: [248, 250, 252] } }, { content: formatPdfMoney(catTotal), styles: { halign: 'right', fontStyle: 'bold', fillColor: [248, 250, 252] } }]);
                    }
                });

                doc.autoTable({
                    startY: 135,
                    head: [['#', 'Code', 'Description', 'Unit', 'Qty', 'Total Price']],
                    body: bodyData,
                    theme: 'grid',
                    headStyles: { fillColor: [30, 58, 138], textColor: 255, halign: 'center' },
                    styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' },
                    columnStyles: {
                        0: { cellWidth: 30, halign: 'center' },
                        1: { cellWidth: 60 },
                        2: { cellWidth: 'auto' },
                        3: { cellWidth: 40, halign: 'center' },
                        4: { cellWidth: 40, halign: 'center' },
                        5: { cellWidth: 80, halign: 'right' }
                    }
                });

                let finalY = doc.lastAutoTable.finalY + 20;
                if (finalY > doc.internal.pageSize.getHeight() - 100) { doc.addPage(); finalY = 40; }

                const summaryX = pageWidth - 200;
                doc.setFontSize(10); doc.setFont(undefined, 'normal');
                doc.text("Subtotal:", summaryX, finalY);
                doc.text(formatPdfMoney(document.getElementById('summarySubtotal').innerText.replace(/[^\d.-]/g, '')), pageWidth - 40, finalY, { align: 'right' });
                
                doc.setTextColor(185, 28, 28);
                doc.text("VAT (15%):", summaryX, finalY + 15);
                doc.text(formatPdfMoney(document.getElementById('summaryVat').innerText.replace(/[^\d.-]/g, '')), pageWidth - 40, finalY + 15, { align: 'right' });
                
                doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.setTextColor(30, 58, 138);
                doc.text("Grand Total:", summaryX, finalY + 35);
                doc.text(formatPdfMoney(document.getElementById('summaryGrandTotal').innerText.replace(/[^\d.-]/g, '')), pageWidth - 40, finalY + 35, { align: 'right' });

                // Render Terms & Conditions at the end of PDF
                let termsBody = [];
                document.querySelectorAll('.term-row').forEach(row => {
                    const tTitle = row.querySelector('.term-title').value.trim();
                    const tVal = row.querySelector('.term-value').value.trim();
                    if(tTitle || tVal) {
                        termsBody.push([
                            { content: `• ${tTitle}:`, styles: { fontStyle: 'bold', halign: 'left', textColor: [30, 58, 138] } },
                            { content: tVal, styles: { halign: 'left' } }
                        ]);
                    }
                });
                
                if (termsBody.length > 0) {
                    doc.autoTable({
                        startY: finalY + 60,
                        head: [[{ content: 'TERMS & CONDITIONS', colSpan: 2, styles: { fontStyle: 'bold', fontSize: 10, textColor: [30, 58, 138] } }]],
                        body: termsBody,
                        theme: 'plain',
                        styles: { fontSize: 9, cellPadding: 2, font: 'helvetica' },
                        columnStyles: { 0: { cellWidth: 120, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } }
                    });
                }

                doc.save(`${estId}.pdf`);
            } catch (err) {
                console.error("PDF Generation Error:", err);
                alert("There was an error generating the PDF.");
            } finally {
                window.exporter.setLoadingState(btn, false);
            }
        }, 100);
    },

    generateProformaExcel: (event) => {
        const btn = event ? event.currentTarget : null;
        window.exporter.setLoadingState(btn, true);
        
        setTimeout(() => {
            const wb = XLSX.utils.book_new();
            const curr = window.app.db.company.currency;
            let wsData = [[`${window.app.db.company.name.toUpperCase()} - PROFORMA INVOICE`],["INVOICE #:", document.getElementById('invNumber').value, "", "DATE:", document.getElementById('invDate').value],["TO:", document.getElementById('previewTo').innerText],["ATTN:", document.getElementById('previewAttn').innerText],["CLIENT VAT:", document.getElementById('previewClientVat').innerText],[],["SL", "CODE", "DESCRIPTION", "UNIT", "QTY", `PRICE (${curr})`, `TOTAL (${curr})`]];
            
            const mode = document.querySelector('input[name="billMode"]:checked').value;
            let globalSubtotal = 0;
    
            document.querySelectorAll('.est-checkbox:checked').forEach(chk => {
                const est = window.app.db.estimations[chk.value]; let estTotal = 0;
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
                            const descText = item.comment ? `${item.desc} (${item.comment})` : item.desc;
                            wsData.push([dNum, item.code, descText, item.unit, item.qty, parseFloat(item.price), total]);
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
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsData), "Invoice"); XLSX.writeFile(wb, `${window.app.db.company.abbr}_Invoice.xlsx`);
            window.exporter.setLoadingState(btn, false);
        }, 100);
    },

    exportInvoicePDF: async (event) => {
        const btn = event ? event.currentTarget : null;
        window.exporter.setLoadingState(btn, true);

        setTimeout(() => {
            try {
                const { jsPDF } = window.jspdf;
                const orientEl = document.getElementById('invPdfOrientation');
                const orientation = orientEl ? orientEl.value : 'portrait';
                const doc = new jsPDF(orientation, 'pt', 'a4');
                const pageWidth = doc.internal.pageSize.getWidth();
                const curr = (window.app.db.company.currency || 'SAR').replace('﷼', 'SAR');
                const formatPdfMoney = (num) => parseFloat(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + curr;

                if (window.app.db.company.logo) {
                    const img = new Image();
                    img.src = window.app.db.company.logo;
                    const ratio = (img.height || 1) / (img.width || 1);
                    const targetWidth = 120;
                    doc.addImage(window.app.db.company.logo, 'JPEG', pageWidth - targetWidth - 40, 40, targetWidth, targetWidth * ratio, '', 'FAST');
                } else {
                    doc.setFontSize(16); doc.setTextColor(4, 120, 87); doc.setFont(undefined, 'bold');
                    doc.text(window.app.db.company.name, pageWidth - 40, 70, { align: 'right' });
                }

                doc.setFontSize(16); doc.setTextColor(30, 58, 138); doc.setFont(undefined, 'bold');
                doc.text("PROFORMA INVOICE", 40, 50);
                
                doc.setFontSize(9); doc.setTextColor(0, 0, 0); doc.setFont(undefined, 'bold');
                doc.text(`CR:`, 40, 70); doc.setFont(undefined, 'normal'); doc.text(window.app.db.company.cr || '-', 70, 70);
                doc.setFont(undefined, 'bold'); doc.text(`VAT:`, 40, 85); doc.setFont(undefined, 'normal'); doc.text(window.app.db.company.vat || '-', 70, 85);
                doc.setFont(undefined, 'bold'); doc.text(`Address:`, 40, 100); doc.setFont(undefined, 'normal'); doc.text(window.app.db.company.address || '-', 90, 100);

                doc.autoTable({
                    startY: 120,
                    theme: 'grid',
                    body: [
                        [{ content: 'TO', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, document.getElementById('previewTo').innerText, { content: 'INVOICE #', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, { content: document.getElementById('previewInvNo').innerText, styles: { fontStyle: 'bold', textColor: [30, 58, 138] } }],
                        [{ content: 'ATTN', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, document.getElementById('previewAttn').innerText, { content: 'DATE', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, document.getElementById('previewDate').innerText],
                        [{ content: 'Client VAT', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, document.getElementById('previewClientVat').innerText, { content: 'P.O. Ref', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, document.getElementById('previewPoRef').innerText],
                        [{ content: 'SCOPE', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, { content: document.getElementById('previewScope').innerText, colSpan: 3 }]
                    ],
                    styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' },
                    columnStyles: { 0: { cellWidth: 70 }, 2: { cellWidth: 70 } }
                });

                let bodyData = [];
                const rows = Array.from(document.getElementById('invoiceItemsBody').querySelectorAll('tr'));
                rows.forEach(tr => {
                    const cells = tr.querySelectorAll('td');
                    if (cells.length === 2) {
                        bodyData.push([{ content: cells[0].innerText, styles: { halign: 'center', fontStyle: 'bold', fillColor: [241, 245, 249] } }, { content: cells[1].innerText, colSpan: 6, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }]);
                    } else if (cells.length === 3) {
                        bodyData.push([{ content: cells[0].innerText, styles: { halign: 'center', fontStyle: 'bold', fillColor: [241, 245, 249] } }, { content: cells[1].innerText, colSpan: 4, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }, { content: formatPdfMoney(cells[2].innerText.replace(/[^\d.-]/g, '')), colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] } }]);
                    } else if (cells.length === 7) {
                        bodyData.push([
                            { content: cells[0].innerText, styles: { halign: 'center' } },
                            cells[1].innerText, cells[2].innerText,
                            { content: cells[3].innerText, styles: { halign: 'center' } },
                            { content: cells[4].innerText, styles: { halign: 'center' } },
                            { content: formatPdfMoney(cells[5].innerText.replace(/[^\d.-]/g, '')), styles: { halign: 'right' } },
                            { content: formatPdfMoney(cells[6].innerText.replace(/[^\d.-]/g, '')), styles: { halign: 'right' } }
                        ]);
                    }
                });

                doc.autoTable({
                    startY: doc.lastAutoTable.finalY + 10,
                    head: [['SL', 'Code', 'Description', 'Unit', 'Qty', 'Price', 'Total']],
                    body: bodyData,
                    theme: 'grid',
                    headStyles: { fillColor: [30, 58, 138], textColor: 255, halign: 'center' },
                    styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' },
                    columnStyles: {
                        0: { cellWidth: 30, halign: 'center' }, 1: { cellWidth: 60 }, 2: { cellWidth: 'auto' }, 
                        3: { cellWidth: 40, halign: 'center' }, 4: { cellWidth: 30, halign: 'center' }, 
                        5: { cellWidth: 60, halign: 'right' }, 6: { cellWidth: 80, halign: 'right' }
                    }
                });

                let finalY = doc.lastAutoTable.finalY + 20;
                if (finalY > doc.internal.pageSize.getHeight() - 100) { doc.addPage(); finalY = 40; }

                const summaryX = pageWidth - 200;
                doc.setFontSize(10); doc.setFont(undefined, 'normal');
                doc.text("Subtotal:", summaryX, finalY);
                doc.text(formatPdfMoney(document.getElementById('invSubtotal').innerText.replace(/[^\d.-]/g, '')), pageWidth - 40, finalY, { align: 'right' });
                
                doc.setTextColor(185, 28, 28);
                doc.text("VAT (15%):", summaryX, finalY + 15);
                doc.text(formatPdfMoney(document.getElementById('invVat').innerText.replace(/[^\d.-]/g, '')), pageWidth - 40, finalY + 15, { align: 'right' });
                
                doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.setTextColor(30, 58, 138);
                doc.text("Grand Total:", summaryX, finalY + 35);
                doc.text(formatPdfMoney(document.getElementById('invGrandTotal').innerText.replace(/[^\d.-]/g, '')), pageWidth - 40, finalY + 35, { align: 'right' });

                doc.save(`${document.getElementById('invNumber').value}.pdf`);
            } catch (err) {
                console.error("PDF Generation Error:", err);
                alert("There was an error generating the PDF.");
            } finally {
                window.exporter.setLoadingState(btn, false);
            }
        }, 100);
    }
};

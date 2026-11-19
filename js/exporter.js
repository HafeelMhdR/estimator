window.exporter = {
    setLoadingState: (button, isLoading) => {
        if (!button) return;
        if (isLoading) {
            button.dataset.originalText = button.innerText;
            button.innerText = "Processing...";
            button.disabled = true;
            button.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            button.innerText = button.dataset.originalText || "Export";
            button.disabled = false;
            button.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    },

    exportEstimationExcel: (idx, event) => {
        const btn = event ? event.currentTarget : null;
        window.exporter.setLoadingState(btn, true);

        setTimeout(() => {
            try {
                const est = window.app.db.estimations[idx];
                if(!est) throw new Error("Estimation not found in database.");

                const wb = XLSX.utils.book_new();
                const curr = window.app.db.company.currency;
                const docTitle = (est.title || "ESTIMATION BOQ").toUpperCase();

                let wsData = [
                    [`${window.app.db.company.name.toUpperCase()} - ${docTitle}`],
                    [`ESTIMATION ID: ${est.id}`],
                    [`PROJECT: ${est.projectName || ''} | LOCATION: ${est.location || ''}`],
                    [],
                    ["#", "CODE", "DESCRIPTION", "UNIT", "QTY", `INT. COST (${curr})`, "OH %", "PR %", `CLIENT PRICE (${curr})`, `CLIENT TOTAL (${curr})`, `INTERNAL TOTAL (${curr})`]
                ];
                
                let cNum = 0, iNum = 0, headerRow = 5;
                let subtotal = 0;
                
                (est.items || []).forEach((item) => {
                    const r = headerRow + 1 + wsData.length - 5; 
                    if(item.type === 'category') {
                        cNum++; iNum = 0;
                        wsData.push([cNum, "", item.title || "Category", "", "", "", "", "", "", "", ""]);
                    } else {
                        iNum++; let numStr = iNum < 10 ? `0${iNum}` : iNum;
                        let displayNum = cNum > 0 ? `${cNum}.${numStr}` : iNum;
                        
                        const descText = item.comment ? `${item.desc}\n(${item.comment})` : item.desc;
                        const t = (item.qty || 0) * (item.price || 0);
                        subtotal += t;

                        wsData.push([
                            displayNum, 
                            item.code || "", 
                            descText, 
                            item.unit || "", 
                            item.qty || 0, 
                            item.cost || 0,
                            (item.oh || 0) / 100, 
                            (item.pr || 0) / 100,
                            {t:'n', f:`F${r}*(1+G${r}+H${r})`}, {t:'n', f:`E${r}*I${r}`}, {t:'n', f:`E${r}*F${r}`}
                        ]);
                    }
                });
                
                const endRow = headerRow + wsData.length - 5;
                wsData.push([]); 
                wsData.push(["", "", "", "", "", "", "", "", "Subtotal", {t:'n', f:`SUM(J6:J${endRow})`}]); 
                wsData.push(["", "", "", "", "", "", "", "", "VAT 15%", {t:'n', f:`J${endRow+2}*0.15`}]); 
                wsData.push(["", "", "", "", "", "", "", "", "Grand Total", {t:'n', f:`J${endRow+2}+J${endRow+3}`}]);
                
                wsData.push([]);
                wsData.push([]);
                wsData.push(["TERMS & CONDITIONS"]);
                (est.terms || []).forEach(t => {
                    if(t.title || t.value) wsData.push(["", `• ${t.title}:`, t.value]);
                });

                const ws = XLSX.utils.aoa_to_sheet(wsData); ws['!autofilter'] = { ref: `A5:K${endRow}` };
                for(let i=6; i<=endRow; i++) { if(ws[`G${i}`]) ws[`G${i}`].z = '0%'; if(ws[`H${i}`]) ws[`H${i}`].z = '0%'; }
                XLSX.utils.book_append_sheet(wb, ws, "Estimation"); XLSX.writeFile(wb, `${est.id}.xlsx`);
            } catch (err) {
                console.error("Excel Generation Error:", err);
                alert("Excel generation failed.");
            } finally {
                window.exporter.setLoadingState(btn, false);
            }
        }, 100);
    },

    exportEstimationPDF: async (idx, event) => {
        const btn = event ? event.currentTarget : null;
        window.exporter.setLoadingState(btn, true);

        setTimeout(() => {
            try {
                const est = window.app.db.estimations[idx];
                if(!est) throw new Error("Estimation not found in database.");

                const { jsPDF } = window.jspdf;
                const doc = new jsPDF('portrait', 'pt', 'a4'); 
                const pageWidth = doc.internal.pageSize.getWidth();
                const curr = (window.app.db.company.currency || 'SAR').replace('﷼', 'SAR');
                const docTitle = (est.title || "ESTIMATION BOQ").toUpperCase();

                const formatPdfMoney = (num) => parseFloat(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + curr;

                doc.setFontSize(18); doc.setTextColor(30, 58, 138); doc.setFont(undefined, 'bold');
                doc.text(docTitle, 40, 50);
                
                doc.setFontSize(10); doc.setTextColor(0, 0, 0); doc.setFont(undefined, 'normal');
                doc.text(`Estimation ID: ${est.id}`, 40, 70);
                doc.text(`Project: ${est.projectName || ''}`, 40, 85, { maxWidth: pageWidth - 200 });
                doc.text(`Location: ${est.location || ''}`, 40, 100, { maxWidth: pageWidth - 200 });
                doc.text(`Date: ${est.date || ''}`, 40, 115);
                
                const logoY = 36; 
                
                let logoRendered = false;
                if (window.app.db.company.logo && window.app.db.company.logo.startsWith('data:image')) {
                    try {
                        const props = doc.getImageProperties(window.app.db.company.logo);
                        if (props && props.height && props.width) {
                            const ratio = props.height / props.width;
                            const targetWidth = 120;
                            let imgFormat = 'PNG';
                            if (window.app.db.company.logo.includes('image/jpeg')) imgFormat = 'JPEG';
                            doc.addImage(window.app.db.company.logo, imgFormat, pageWidth - targetWidth - 40, logoY, targetWidth, targetWidth * ratio);
                            logoRendered = true;
                        }
                    } catch (imgErr) {
                        console.warn("Logo dimension extraction failed. Falling back to text render.", imgErr);
                    }
                }
                
                if (!logoRendered) {
                    doc.setFontSize(16); doc.setTextColor(4, 120, 87); doc.setFont(undefined, 'bold');
                    doc.text(window.app.db.company.name, pageWidth - 40, 50, { align: 'right' });
                }

                let bodyData = [];
                let cNum = 0, iNum = 0, catTotal = 0, subtotal = 0;
                let currentCatName = "";
                
                (est.items || []).forEach((item, index) => {
                    if(item.type === 'category') {
                        if (cNum > 0) {
                            bodyData.push([{ content: `${currentCatName} Subtotal`, colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: [248, 250, 252] } }, { content: formatPdfMoney(catTotal), styles: { halign: 'right', fontStyle: 'bold', fillColor: [248, 250, 252] } }]);
                        }
                        cNum++; iNum = 0; catTotal = 0;
                        currentCatName = item.title || "Category";
                        bodyData.push([{ content: cNum.toString(), styles: { halign: 'center', fontStyle: 'bold', fillColor: [226, 232, 240] } }, { content: currentCatName, colSpan: 5, styles: { fontStyle: 'bold', fillColor: [226, 232, 240] } }]);
                    } else {
                        iNum++; let nStr = iNum < 10 ? `0${iNum}` : iNum; let dNum = cNum > 0 ? `${cNum}.${nStr}` : iNum;
                        
                        const descText = item.comment ? `${item.desc}\n   (${item.comment})` : item.desc;
                        const t = (item.qty || 0) * (item.price || 0);
                        catTotal += t;
                        subtotal += t;
                        
                        bodyData.push([
                            { content: dNum.toString(), styles: { halign: 'center' } }, item.code || "", descText,
                            { content: item.unit || "", styles: { halign: 'center' } },
                            { content: (item.qty || 0).toString(), styles: { halign: 'center' } },
                            { content: formatPdfMoney(t), styles: { halign: 'right' } }
                        ]);
                    }
                    if (index === est.items.length - 1 && cNum > 0) {
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
                if (finalY > doc.internal.pageSize.getHeight() - 120) { doc.addPage(); finalY = 40; }

                const summaryX = pageWidth - 200;
                doc.setFontSize(10); doc.setFont(undefined, 'normal');
                doc.text("Subtotal:", summaryX, finalY);
                doc.text(formatPdfMoney(subtotal), pageWidth - 40, finalY, { align: 'right' });
                
                doc.setTextColor(185, 28, 28);
                doc.text("VAT (15%):", summaryX, finalY + 15);
                doc.text(formatPdfMoney(subtotal * 0.15), pageWidth - 40, finalY + 15, { align: 'right' });
                
                doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.setTextColor(30, 58, 138);
                doc.text("Grand Total:", summaryX, finalY + 35);
                doc.text(formatPdfMoney(subtotal * 1.15), pageWidth - 40, finalY + 35, { align: 'right' });

                doc.setDrawColor(200, 200, 200);
                doc.line(40, finalY + 55, pageWidth - 40, finalY + 55); 

                let termsBody = [];
                (est.terms || []).forEach(t => {
                    if(t.title || t.value) {
                        termsBody.push([
                            { content: `• ${t.title}:`, styles: { fontStyle: 'bold', halign: 'left', textColor: [30, 58, 138] } },
                            { content: t.value, styles: { halign: 'left' } }
                        ]);
                    }
                });
                
                if (termsBody.length > 0) {
                    doc.autoTable({
                        startY: finalY + 65,
                        head: [[{ content: 'TERMS & CONDITIONS', colSpan: 2, styles: { fontStyle: 'bold', fontSize: 10, textColor: [30, 58, 138] } }]],
                        body: termsBody,
                        theme: 'plain',
                        styles: { fontSize: 9, cellPadding: 2, font: 'helvetica' },
                        columnStyles: { 0: { cellWidth: 160, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } }
                    });
                }

                doc.save(`${est.id}.pdf`);
            } catch (err) {
                console.error("Proforma PDF Error:", err);
                alert(`There was an internal error generating the PDF:\n${err.message}`);
            } finally {
                window.exporter.setLoadingState(btn, false);
            }
        }, 100);
    },

    generateProformaExcel: (event) => {
        const btn = event ? event.currentTarget : null;
        window.exporter.setLoadingState(btn, true);
        
        setTimeout(() => {
            try {
                const wb = XLSX.utils.book_new();
                const curr = window.app.db.company.currency;
                
                const invNoEl = document.getElementById('invNumber');
                const invDateEl = document.getElementById('invDate');
                const toEl = document.getElementById('previewTo');
                const attnEl = document.getElementById('previewAttn');
                const vatEl = document.getElementById('previewClientVat');
                
                let wsData = [
                    [`${window.app.db.company.name.toUpperCase()} - PROFORMA INVOICE`],
                    ["INVOICE #:", invNoEl ? invNoEl.value : "", "", "DATE:", invDateEl ? invDateEl.value : ""],
                    ["TO:", toEl ? toEl.innerText : ""],
                    ["ATTN:", attnEl ? attnEl.innerText : ""],
                    ["CLIENT VAT:", vatEl ? vatEl.innerText : ""],
                    [],
                    ["SL", "CODE", "DESCRIPTION", "UNIT", "QTY", `PRICE (${curr})`, `TOTAL (${curr})`]
                ];
                
                const modeEl = document.querySelector('input[name="billMode"]:checked');
                const mode = modeEl ? modeEl.value : "itemized";
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
                    const msTypeEl = document.getElementById('milestoneType');
                    const msPctEl = document.getElementById('milestonePct');
                    
                    const msVal = msTypeEl ? msTypeEl.value.split('|') : ["10030", "Advance Payment"];
                    const pct = parseFloat(msPctEl ? (msPctEl.value || 0) : 0) / 100;
                    const msTotal = globalSubtotal * pct;
                    wsData = wsData.slice(0, 7); 
                    wsData.push([1, msVal[0], `${msVal[1]} - ${pct*100}%`, "LS", 1, msTotal]);
                    globalSubtotal = msTotal;
                }
        
                wsData.push([]); wsData.push(["", "", "", "", "Subtotal", globalSubtotal]); wsData.push(["", "", "", "", "VAT 15%", globalSubtotal * 0.15]); wsData.push(["", "", "", "", "Grand Total", globalSubtotal * 1.15]);
                XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsData), "Invoice"); 
                XLSX.writeFile(wb, `${window.app.db.company.abbr}_Invoice.xlsx`);
            } catch (err) {
                console.error("Proforma Excel Error:", err);
                alert("Excel generation failed.");
            } finally {
                window.exporter.setLoadingState(btn, false);
            }
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

                const logoY = 36;

                if (window.app.db.company.logo && window.app.db.company.logo.startsWith('data:image')) {
                    try {
                        const props = doc.getImageProperties(window.app.db.company.logo);
                        if (props && props.height && props.width) {
                            const ratio = props.height / props.width;
                            const targetWidth = 120;
                            let imgFormat = 'PNG';
                            if (window.app.db.company.logo.includes('image/jpeg')) imgFormat = 'JPEG';
                            doc.addImage(window.app.db.company.logo, imgFormat, pageWidth - targetWidth - 40, logoY, targetWidth, targetWidth * ratio);
                        }
                    } catch (imgErr) {
                        console.warn("Logo dimension extraction failed. Falling back to text render.", imgErr);
                        doc.setFontSize(16); doc.setTextColor(4, 120, 87); doc.setFont(undefined, 'bold');
                        doc.text(window.app.db.company.name, pageWidth - 40, 50, { align: 'right' });
                    }
                } else {
                    doc.setFontSize(16); doc.setTextColor(4, 120, 87); doc.setFont(undefined, 'bold');
                    doc.text(window.app.db.company.name, pageWidth - 40, 50, { align: 'right' });
                }

                doc.setFontSize(16); doc.setTextColor(30, 58, 138); doc.setFont(undefined, 'bold');
                doc.text("PROFORMA INVOICE", 40, 50);
                
                doc.setFontSize(9); doc.setTextColor(0, 0, 0); doc.setFont(undefined, 'bold');
                doc.text(`CR:`, 40, 70); doc.setFont(undefined, 'normal'); doc.text(window.app.db.company.cr || '-', 70, 70);
                doc.setFont(undefined, 'bold'); doc.text(`VAT:`, 40, 85); doc.setFont(undefined, 'normal'); doc.text(window.app.db.company.vat || '-', 70, 85);
                doc.setFont(undefined, 'bold'); doc.text(`Address:`, 40, 100); doc.setFont(undefined, 'normal'); doc.text(window.app.db.company.address || '-', 90, 100, { maxWidth: pageWidth - 200 });

                const toEl = document.getElementById('previewTo');
                const invNoEl = document.getElementById('previewInvNo');
                const attnEl = document.getElementById('previewAttn');
                const dateEl = document.getElementById('previewDate');
                const vatEl = document.getElementById('previewClientVat');
                const poRefEl = document.getElementById('previewPoRef');
                const scopeEl = document.getElementById('previewScope');

                doc.autoTable({
                    startY: 120,
                    theme: 'grid',
                    body: [
                        [{ content: 'TO', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, toEl ? toEl.innerText : "", { content: 'INVOICE #', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, { content: invNoEl ? invNoEl.innerText : "", styles: { fontStyle: 'bold', textColor: [30, 58, 138] } }],
                        [{ content: 'ATTN', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, attnEl ? attnEl.innerText : "", { content: 'DATE', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, dateEl ? dateEl.innerText : ""],
                        [{ content: 'Client VAT', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, vatEl ? vatEl.innerText : "", { content: 'P.O. Ref', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, poRefEl ? poRefEl.innerText : ""],
                        [{ content: 'SCOPE', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, { content: scopeEl ? scopeEl.innerText : "", colSpan: 3 }]
                    ],
                    styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' },
                    columnStyles: { 0: { cellWidth: 70 }, 2: { cellWidth: 70 } }
                });

                let bodyData = [];
                const invoiceTableBody = document.getElementById('invoiceItemsBody');
                if (invoiceTableBody) {
                    const rows = Array.from(invoiceTableBody.querySelectorAll('tr'));
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
                }

                if (bodyData.length > 0) {
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
                }

                let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 200;
                if (finalY > doc.internal.pageSize.getHeight() - 100) { doc.addPage(); finalY = 40; }

                const summaryX = pageWidth - 200;
                doc.setFontSize(10); doc.setFont(undefined, 'normal');
                doc.text("Subtotal:", summaryX, finalY);
                
                const invSubtotalEl = document.getElementById('invSubtotal');
                doc.text(formatPdfMoney(invSubtotalEl ? invSubtotalEl.innerText.replace(/[^\d.-]/g, '') : "0"), pageWidth - 40, finalY, { align: 'right' });
                
                doc.setTextColor(185, 28, 28);
                doc.text("VAT (15%):", summaryX, finalY + 15);
                
                const invVatEl = document.getElementById('invVat');
                doc.text(formatPdfMoney(invVatEl ? invVatEl.innerText.replace(/[^\d.-]/g, '') : "0"), pageWidth - 40, finalY + 15, { align: 'right' });
                
                doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.setTextColor(30, 58, 138);
                doc.text("Grand Total:", summaryX, finalY + 35);
                
                const invGrandTotalEl = document.getElementById('invGrandTotal');
                doc.text(formatPdfMoney(invGrandTotalEl ? invGrandTotalEl.innerText.replace(/[^\d.-]/g, '') : "0"), pageWidth - 40, finalY + 35, { align: 'right' });

                const invNumberEl = document.getElementById('invNumber');
                doc.save(`${invNumberEl ? invNumberEl.value : 'Invoice'}.pdf`);
            } catch (err) {
                console.error("Proforma PDF Error:", err);
                alert(`There was an internal error generating the PDF:\n${err.message}`);
            } finally {
                window.exporter.setLoadingState(btn, false);
            }
        }, 100);
    }
};

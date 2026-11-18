window.exporter = {
    setLoadingState: (button, isLoading) => {
        if (!button) return;
        if (isLoading) {
            button.dataset.originalText = button.innerText;
            button.innerText = "Generating PDF...";
            button.disabled = true;
            button.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            button.innerText = button.dataset.originalText || "Export PDF";
            button.disabled = false;
            button.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    },

    exportEstimationExcel: () => {
        if (!window.estimator.validateEstimation()) return;
        
        const wb = XLSX.utils.book_new();
        const curr = window.app.db.company.currency;
        const estId = document.getElementById('currentEditingEstId').value || window.estimator.updateEstIdPreview();

        let wsData = [
            [`${window.app.db.company.name.toUpperCase()} - ESTIMATION BOQ`],
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
                wsData.push([
                    displayNum, tr.querySelector('.item-code-select').value, tr.querySelector('.item-desc').value, 
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
        
        const ws = XLSX.utils.aoa_to_sheet(wsData); ws['!autofilter'] = { ref: `A5:K${endRow}` };
        for(let i=6; i<=endRow; i++) { if(ws[`G${i}`]) ws[`G${i}`].z = '0%'; if(ws[`H${i}`]) ws[`H${i}`].z = '0%'; }
        XLSX.utils.book_append_sheet(wb, ws, "Estimation"); XLSX.writeFile(wb, `${estId}.xlsx`);
    },

    exportEstimationPDF: async (event) => {
        if (!window.estimator.validateEstimation()) return;
        
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
                const estId = document.getElementById('currentEditingEstId').value || window.estimator.updateEstIdPreview();

                const formatPdfMoney = (num) => parseFloat(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + curr;

                doc.setFontSize(18); doc.setTextColor(30, 58, 138); doc.setFont(undefined, 'bold');
                doc.text("ESTIMATION BOQ", 40, 50);
                
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
                        const code = tr.querySelector('.item-code-select').value;
                        const desc = tr.querySelector('.item-desc').value;
                        const unit = tr.querySelector('.item-unit').value;
                        const q = parseFloat(tr.querySelector('.item-qty').value) || 0;
                        const p = parseFloat(tr.querySelector('.item-price').value) || 0;
                        const t = q * p;
                        catTotal += t;
                        
                        bodyData.push([
                            { content: dNum.toString(), styles: { halign: 'center' } }, code, desc,
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

                doc.save(`${estId}.pdf`);
            } catch (err) {
                console.error("PDF Generation Error:", err);
                alert("There was an error generating the PDF.");
            } finally {
                window.exporter.setLoadingState(btn, false);
            }
        }, 100);
    },

    generateProformaExcel: () => {
        const wb = XLSX.utils.book_new();
        const curr = window.app.db.company.currency;
        let wsData = [[`${window.app.db.company.name.toUpperCase()} - PROFORMA INVOICE`],["INVOICE #:", document.getElementById('inv

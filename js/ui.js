window.ui = {
    switchTab: (tabId) => {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        document.getElementById('tab-' + tabId).classList.remove('hidden');
        document.querySelectorAll('.tab-btn').forEach(el => {
            el.classList.remove('text-emerald-400', 'border-b-2', 'border-emerald-400', 'active-tab');
            el.classList.add('text-slate-300');
        });
        event.currentTarget.classList.add('text-emerald-400', 'border-b-2', 'border-emerald-400', 'active-tab');
        event.currentTarget.classList.remove('text-slate-300');
        
        if(tabId === 'invoicing' && window.invoicer) { window.invoicer.renderEstimationChecklist(); window.invoicer.renderInvoiceTable(); }
        if(tabId === 'history' && window.dataManager) { window.dataManager.renderHistoryTable(); } 
    },

    updateDashboardStats: () => {
        if(document.getElementById('statCodesCount')) {
            document.getElementById('statCodesCount').innerText = window.app.db.codes.length;
            document.getElementById('statClientsCount').innerText = window.app.db.clients.length;
            document.getElementById('statEstimationsCount').innerText = window.app.db.estimations.length;
        }
    },

    openCompanyModal: () => {
        document.getElementById('setCompName').value = window.app.db.company.name || '';
        document.getElementById('setCompAbbr').value = window.app.db.company.abbr || '';
        document.getElementById('setCompCurrency').value = window.app.db.company.currency || "SAR";
        document.getElementById('setCompCR').value = window.app.db.company.cr || '';
        document.getElementById('setCompVAT').value = window.app.db.company.vat || '';
        document.getElementById('setCompTimezone').value = window.app.db.company.timezone || 'local';
        document.getElementById('setCompEmail').value = window.app.db.company.email || '';
        document.getElementById('setCompAdd').value = window.app.db.company.address || '';
        
        const preview = document.getElementById('logoPreviewModal');
        if(window.app.db.company.logo) { 
            preview.src = window.app.db.company.logo; 
            preview.classList.remove('hidden'); 
        } else {
            preview.classList.add('hidden');
        }
        document.getElementById('companyModal').classList.remove('hidden');
    },

    convertLogoToBase64: (event) => {
        const file = event.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 400; // Optimal for sharp PDFs without bloating size
                let width = img.width, height = img.height;
                if (width > MAX_WIDTH) { height = Math.round((height * MAX_WIDTH) / width); width = MAX_WIDTH; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                window.app.db.company.logo = dataUrl;
                document.getElementById('logoPreviewModal').src = dataUrl;
                document.getElementById('logoPreviewModal').classList.remove('hidden');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    exportCompanyProfile: () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(window.app.db.company));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", `${window.app.db.company.abbr || 'Company'}_Profile.json`);
        document.body.appendChild(dlAnchorElem);
        dlAnchorElem.click();
        document.body.removeChild(dlAnchorElem);
    },

    importCompanyProfile: (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                if (importedData && importedData.name) {
                    window.app.db.company = importedData;
                    window.ui.openCompanyModal(); 
                    alert("Company profile loaded successfully! Click 'Save Profile' to lock it in.");
                } else {
                    alert("Invalid profile file format.");
                }
            } catch (err) {
                alert("Error reading profile file.");
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    },

    saveCompanySettings: () => {
        try {
            window.app.db.company.name = document.getElementById('setCompName').value || "Company";
            window.app.db.company.abbr = document.getElementById('setCompAbbr').value || "COMP";
            window.app.db.company.currency = document.getElementById('setCompCurrency').value || "SAR";
            window.app.db.company.cr = document.getElementById('setCompCR').value;
            window.app.db.company.vat = document.getElementById('setCompVAT').value;
            window.app.db.company.timezone = document.getElementById('setCompTimezone').value || "local";
            window.app.db.company.email = document.getElementById('setCompEmail').value;
            window.app.db.company.address = document.getElementById('setCompAdd').value;
            
            window.app.saveData(); 
            window.ui.applyCompanyDataToUI(); 
            
            if(window.estimator && window.estimator.recalculateEstimation) {
                window.estimator.recalculateEstimation();
                window.estimator.updateEstIdPreview();
            }
            
            const invTab = document.getElementById('tab-invoicing');
            if(invTab && !invTab.classList.contains('hidden') && window.invoicer) {
                window.invoicer.renderInvoiceTable();
            }
        } catch(error) {
            console.warn("Minor background error during save, but company data was recorded.", error);
        } finally {
            document.getElementById('companyModal').classList.add('hidden');
        }
    },

    applyCompanyDataToUI: () => {
        document.getElementById('headerCompanyName').innerText = window.app.db.company.name;
        document.getElementById('dashCompanyName').innerText = window.app.db.company.name;
        document.getElementById('headerLogoText').innerText = window.app.db.company.abbr;
        document.getElementById('dashCompanyDetails').innerText = `CR: ${window.app.db.company.cr || '-'} | VAT: ${window.app.db.company.vat || '-'}`;
        
        document.querySelectorAll('.dyn-company-name').forEach(el => el.innerText = window.app.db.company.name);
        document.querySelectorAll('.dyn-cr').forEach(el => el.innerText = window.app.db.company.cr);
        document.querySelectorAll('.dyn-vat').forEach(el => el.innerText = window.app.db.company.vat);
        document.querySelectorAll('.dyn-address').forEach(el => el.innerText = window.app.db.company.address);
        document.querySelectorAll('.dyn-email').forEach(el => el.innerText = window.app.db.company.email);
        
        const mainLogo = document.getElementById('headerLogo');
        const printLogo = document.getElementById('printLogo');
        if(window.app.db.company.logo) {
            mainLogo.src = window.app.db.company.logo; mainLogo.classList.remove('hidden');
            document.getElementById('headerLogoText').classList.add('hidden');
            if(printLogo) { printLogo.src = window.app.db.company.logo; printLogo.classList.remove('hidden'); }
        } else {
            mainLogo.classList.add('hidden'); document.getElementById('headerLogoText').classList.remove('hidden');
            if(printLogo) printLogo.classList.add('hidden');
        }
    },

    openAddCodeModal: () => {
        document.getElementById('modalCode').value = ''; 
        document.getElementById('modalDesc').value = ''; 
        document.getElementById('codeModal').classList.remove('hidden');
    },

    openAddProjectCodeModal: () => {
        document.getElementById('modalProjCode').value = ''; 
        document.getElementById('modalProjDesc').value = ''; 
        document.getElementById('projectCodeModal').classList.remove('hidden');
    },

    openClientModal: () => {
        document.getElementById('mClientIndex').value = '';
        document.getElementById('mClientAbbr').value = '';
        document.getElementById('mClientName').value = ''; 
        document.getElementById('mClientAttn').value = ''; 
        document.getElementById('mClientAdd').value = ''; 
        document.getElementById('mClientVat').value = ''; 
        document.getElementById('clientModal').classList.remove('hidden');
    }
};

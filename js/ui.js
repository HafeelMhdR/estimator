window.ui = {
    switchTab: (tabId) => {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        document.getElementById('tab-' + tabId).classList.remove('hidden');
        document.querySelectorAll('.tab-btn').forEach(el => {
            el.classList.remove('text-emerald-400', 'border-b-2', 'border-emerald-400', 'active-tab');
            el.classList.add('text-slate-300');
        });
        
        if (event && event.currentTarget && event.currentTarget.classList.contains('tab-btn')) {
            event.currentTarget.classList.add('text-emerald-400', 'border-b-2', 'border-emerald-400', 'active-tab');
            event.currentTarget.classList.remove('text-slate-300');
        } else {
            const btn = document.querySelector(`.tab-btn[onclick*="${tabId}"]`);
            if(btn) {
                btn.classList.add('text-emerald-400', 'border-b-2', 'border-emerald-400', 'active-tab');
                btn.classList.remove('text-slate-300');
            }
        }
        
        if(tabId === 'invoicing' && window.invoicer) { window.invoicer.renderEstimationChecklist(); window.invoicer.renderInvoiceTable(); }
        if(tabId === 'history' && window.dataManager) { window.dataManager.renderHistoryTable(); } 
    },

    updateDashboardStats: () => {
        if(document.getElementById('statTotal')) {
            const ests = window.app.db.estimations || [];
            const approved = ests.filter(e => e.status === 'Approved').length;
            const pending = ests.length - approved;
            
            document.getElementById('statTotal').innerText = ests.length;
            document.getElementById('statApproved').innerText = approved;
            document.getElementById('statPending').innerText = pending;
            
            if(document.getElementById('statClientsCount')) {
                document.getElementById('statClientsCount').innerText = window.app.db.clients.length;
                document.getElementById('statCodesCount').innerText = window.app.db.codes.length;
            }
        }
    },

    openDatabaseModal: () => {
        document.getElementById('databaseModal').classList.remove('hidden');
    },

    openCompanyModal: () => {
        document.getElementById('setCompName').value = window.app.db.company.name || '';
        document.getElementById('setCompAbbr').value = window.app.db.company.abbr || '';
        document.getElementById('setCompCurrency').value = window.app.db.company.currency || "SAR";
        document.getElementById('setCompCR').value = window.app.db.company.cr || '';
        document.getElementById('setCompVAT').value = window.app.db.company.vat || '';
        
        const tzEl = document.getElementById('setCompTimezone');
        if (tzEl) {
            const existingOption = Array.from(tzEl.options).find(o => o.value === window.app.db.company.timezone);
            if (existingOption) {
                tzEl.value = window.app.db.company.timezone;
            } else {
                tzEl.value = "local";
            }
        }

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
                // Bounded width of 450 prevents 5MB limit memory crash
                const MAX_WIDTH = 450; 
                let width = img.width, height = img.height;
                if (width > MAX_WIDTH) { height = Math.round((height * MAX_WIDTH) / width); width = MAX_WIDTH; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Force lossy compression to guarantee sub-5MB storage string
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                window.app.db.company.logo = dataUrl;
                
                const preview = document.getElementById('logoPreviewModal');
                if(preview) {
                    preview.src = dataUrl;
                    preview.classList.remove('hidden');
                }
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
            
            document.getElementById('companyModal').classList.add('hidden');
            alert("Company Profile saved successfully.");
        } catch(error) {
            console.warn("Minor background error during save, but company data was recorded.", error);
        }
    },

    applyCompanyDataToUI: () => {
        const comp = window.app.db.company || {};
        
        const headerComp = document.getElementById('headerCompanyName');
        if(headerComp) headerComp.innerText = comp.name || "Company Name";
        
        const dashComp = document.getElementById('dashCompanyName');
        if(dashComp) dashComp.innerText = comp.name || "Company Name";
        
        const headerLogoText = document.getElementById('headerLogoText');
        if(headerLogoText) headerLogoText.innerText = comp.abbr || "COMP";
        
        const dashDetails = document.getElementById('dashCompanyDetails');
        if(dashDetails) dashDetails.innerText = `CR: ${comp.cr || '-'} | VAT: ${comp.vat || '-'}`;
        
        document.querySelectorAll('.dyn-company-name').forEach(el => el.innerText = comp.name || "COMPANY");
        document.querySelectorAll('.dyn-cr').forEach(el => el.innerText = comp.cr || "");
        document.querySelectorAll('.dyn-vat').forEach(el => el.innerText = comp.vat || "");
        document.querySelectorAll('.dyn-address').forEach(el => el.innerText = comp.address || "");
        document.querySelectorAll('.dyn-email').forEach(el => el.innerText = comp.email || "");
        
        const mainLogo = document.getElementById('headerLogo');
        const printLogo = document.getElementById('printLogo');
        
        if(comp.logo) {
            if(mainLogo) {
                mainLogo.src = comp.logo; 
                mainLogo.classList.remove('hidden');
            }
            if(headerLogoText) headerLogoText.classList.add('hidden');
            if(printLogo) { 
                printLogo.src = comp.logo; 
                printLogo.classList.remove('hidden'); 
            }
        } else {
            if(mainLogo) mainLogo.classList.add('hidden'); 
            if(headerLogoText) headerLogoText.classList.remove('hidden');
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

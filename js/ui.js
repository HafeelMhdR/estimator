// User Interface, Company Settings & Tab Switching
const ui = {
    switchTab: (tabId) => {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        document.getElementById('tab-' + tabId).classList.remove('hidden');
        document.querySelectorAll('.tab-btn').forEach(el => {
            el.classList.remove('text-emerald-400', 'border-b-2', 'border-emerald-400', 'active-tab');
            el.classList.add('text-slate-300');
        });
        event.currentTarget.classList.add('text-emerald-400', 'border-b-2', 'border-emerald-400', 'active-tab');
        event.currentTarget.classList.remove('text-slate-300');
        
        if(tabId === 'invoicing') { invoicer.renderEstimationChecklist(); invoicer.renderInvoiceTable(); }
        if(tabId === 'history') { dataManager.renderHistoryTable(); } // Trigger History Load
    },

    updateDashboardStats: () => {
        document.getElementById('statCodesCount').innerText = app.db.codes.length;
        document.getElementById('statClientsCount').innerText = app.db.clients.length;
        document.getElementById('statEstimationsCount').innerText = app.db.estimations.length;
    },

    openCompanyModal: () => {
        document.getElementById('setCompName').value = app.db.company.name;
        document.getElementById('setCompAbbr').value = app.db.company.abbr;
        document.getElementById('setCompCurrency').value = app.db.company.currency || "SAR";
        document.getElementById('setCompCR').value = app.db.company.cr;
        document.getElementById('setCompVAT').value = app.db.company.vat;
        document.getElementById('setCompEmail').value = app.db.company.email;
        document.getElementById('setCompAdd').value = app.db.company.address;
        const preview = document.getElementById('logoPreviewModal');
        if(app.db.company.logo) { preview.src = app.db.company.logo; preview.classList.remove('hidden'); }
        document.getElementById('companyModal').classList.remove('hidden');
    },

    openAddCodeModal: () => {
        document.getElementById('modalCode').value = ''; 
        document.getElementById('modalDesc').value = ''; 
        document.getElementById('codeModal').classList.remove('hidden');
    },

    openClientModal: () => {
        document.getElementById('mClientName').value = ''; 
        document.getElementById('clientModal').classList.remove('hidden');
    },

    convertLogoToBase64: (event) => {
        const file = event.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 300; 
                let width = img.width, height = img.height;
                if (width > MAX_WIDTH) { height = Math.round((height * MAX_WIDTH) / width); width = MAX_WIDTH; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                app.db.company.logo = dataUrl;
                document.getElementById('logoPreviewModal').src = dataUrl;
                document.getElementById('logoPreviewModal').classList.remove('hidden');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    saveCompanySettings: () => {
        app.db.company.name = document.getElementById('setCompName').value || "Company";
        app.db.company.abbr = document.getElementById('setCompAbbr').value || "COMP";
        app.db.company.currency = document.getElementById('setCompCurrency').value || "SAR";
        app.db.company.cr = document.getElementById('setCompCR').value;
        app.db.company.vat = document.getElementById('setCompVAT').value;
        app.db.company.email = document.getElementById('setCompEmail').value;
        app.db.company.address = document.getElementById('setCompAdd').value;
        app.saveData(); 
        ui.applyCompanyDataToUI(); 
        estimator.recalculateEstimation();
        if(!document.getElementById('tab-invoicing').classList.contains('hidden')) invoicer.renderInvoiceTable();
        document.getElementById('companyModal').classList.add('hidden');
    },

    applyCompanyDataToUI: () => {
        document.getElementById('headerCompanyName').innerText = app.db.company.name;
        document.getElementById('dashCompanyName').innerText = app.db.company.name;
        document.getElementById('headerLogoText').innerText = app.db.company.abbr;
        document.getElementById('dashCompanyDetails').innerText = `CR: ${app.db.company.cr || '-'} | VAT: ${app.db.company.vat || '-'}`;
        
        document.querySelectorAll('.dyn-company-name').forEach(el => el.innerText = app.db.company.name);
        document.querySelectorAll('.dyn-cr').forEach(el => el.innerText = app.db.company.cr);
        document.querySelectorAll('.dyn-vat').forEach(el => el.innerText = app.db.company.vat);
        document.querySelectorAll('.dyn-address').forEach(el => el.innerText = app.db.company.address);
        document.querySelectorAll('.dyn-email').forEach(el => el.innerText = app.db.company.email);
        
        const mainLogo = document.getElementById('headerLogo');
        const printLogo = document.getElementById('printLogo');
        if(app.db.company.logo) {
            mainLogo.src = app.db.company.logo; mainLogo.classList.remove('hidden');
            document.getElementById('headerLogoText').classList.add('hidden');
            if(printLogo) { printLogo.src = app.db.company.logo; printLogo.classList.remove('hidden'); }
        } else {
            mainLogo.classList.add('hidden'); document.getElementById('headerLogoText').classList.remove('hidden');
            if(printLogo) printLogo.classList.add('hidden');
        }
    }
};

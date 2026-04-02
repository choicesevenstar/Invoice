
// State Management
let currentView = 'login';
let allClients = [];
let allInvoices = [];
let currentClientId = null;
let currentInvoiceId = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();
    initTheme();
    checkSession();
    setupEventListeners();
});

// View Switching
function showView(viewId) {
    document.querySelectorAll('.view-section').forEach(v => v.style.display = 'none');
    const target = document.getElementById(`${viewId}-view`);
    if (target) {
        target.style.display = 'block';
        currentView = viewId;
        
        // Update nav active state
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.getAttribute('data-view') === viewId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Trigger view-specific data loading
        if (viewId === 'dashboard') loadDashboard();
        if (viewId === 'clients') loadClients();
        if (viewId === 'invoices') loadInvoices();
        if (viewId === 'create-invoice' && !currentInvoiceId) setupInvoiceView();
    }
}

async function checkSession() {
    const user = await getUser();
    if (user) {
        document.getElementById('login-view').style.display = 'none';
        document.getElementById('app-view').style.display = 'flex';
        document.querySelector('.mobile-header').style.display = window.innerWidth <= 768 ? 'flex' : 'none';
        showView('dashboard');
    } else {
        document.getElementById('login-view').style.display = 'flex';
        document.getElementById('app-view').style.display = 'none';
        document.querySelector('.mobile-header').style.display = 'none';
    }
}

// Event Listeners
function setupEventListeners() {
    // Login Form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            const { error } = await login(email, password);
            if (error) throw error;
            showToast('Login successful', 'success');
            checkSession();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Nav Links
    document.querySelectorAll('.nav-link[data-view]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = link.getAttribute('data-view');
            // If clicking Create Invoice from sidebar, ensure we're not in edit mode
            if (view === 'create-invoice') {
                currentInvoiceId = null;
                setupInvoiceView();
            }
            showView(view);
        });
    });

    // Logout
    document.getElementById('logout-link').addEventListener('click', async (e) => {
        e.preventDefault();
        await logout();
        checkSession();
    });

    // Client Form
    document.getElementById('add-client-btn').addEventListener('click', () => {
        document.getElementById('modal-title').textContent = 'Add New Client';
        document.getElementById('client-form').reset();
        document.getElementById('client-id').value = '';
        document.getElementById('client-modal').style.display = 'flex';
    });

    document.getElementById('close-modal-btn').addEventListener('click', () => {
        document.getElementById('client-modal').style.display = 'none';
    });

    document.getElementById('client-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const clientData = {
            name: document.getElementById('client-name').value,
            phone: document.getElementById('client-phone').value,
            address: document.getElementById('client-address').value,
            notes: document.getElementById('client-notes').value
        };
        const clientId = document.getElementById('client-id').value;

        try {
            if (clientId) {
                await updateClient(clientId, clientData);
                showToast('Client updated');
            } else {
                await addClient(clientData);
                showToast('Client added');
            }
            document.getElementById('client-modal').style.display = 'none';
            loadClients();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Invoice Row Management
    document.getElementById('add-item-btn').addEventListener('click', () => addProductRow());

    // Invoice Calculations
    document.getElementById('inv-discount').addEventListener('input', calculateInvoiceTotals);
    document.getElementById('inv-paid').addEventListener('input', calculateInvoiceRemaining);

    // Save Invoice
    document.getElementById('save-invoice-btn').addEventListener('click', saveNewInvoice);

    // Download Image
    document.getElementById('download-inv-img-btn').addEventListener('click', downloadInvoiceImage);
    // Client Search
    document.getElementById('client-search').addEventListener('input', (e) => {
        loadClients(e.target.value.toLowerCase());
    });

    // Theme Toggle
    document.getElementById('theme-toggle').addEventListener('click', (e) => {
        e.preventDefault();
        toggleTheme();
    });

    document.getElementById('mobile-theme-toggle').addEventListener('click', (e) => {
        e.preventDefault();
        toggleTheme();
    });

    document.getElementById('mobile-logout').addEventListener('click', async (e) => {
        e.preventDefault();
        await logout();
        checkSession();
    });
}

// --- Theme Logic ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        updateThemeIcon(true);
    }
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
}

function updateThemeIcon(isDark) {
    const icon = document.getElementById('theme-icon');
    icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    lucide.createIcons();
}

// --- Dashboard Logic ---
async function loadDashboard() {
    try {
        const stats = await getDashboardStats();
        document.getElementById('stat-total-clients').textContent = stats.totalClients;
        document.getElementById('stat-total-invoices').textContent = stats.totalInvoices;
        document.getElementById('stat-total-paid').textContent = `Rs ${stats.totalPaid.toLocaleString()}`;
        document.getElementById('stat-total-remaining').textContent = `Rs ${stats.totalRemaining.toLocaleString()}`;

        const invoices = await getInvoices();
        const tbody = document.getElementById('recent-invoices-table');
        tbody.innerHTML = '';
        invoices.slice(0, 5).forEach(inv => {
            const tr = document.createElement('tr');
            const statusClass = inv.remaining > 0 ? 'badge-pending' : 'badge-success';
            const statusText = inv.remaining > 0 ? 'Due' : 'Paid';
            
            tr.innerHTML = `
                <td>${inv.invoice_number}</td>
                <td>${inv.clients?.name || 'Unknown'}</td>
                <td>${new Date(inv.date).toLocaleDateString()}</td>
                <td>Rs ${inv.total.toLocaleString()}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn" onclick="previewInvoice('${inv.id}')" title="Preview" style="padding: 4px 8px; width: auto;"><i data-lucide="eye" style="width: 14px;"></i></button>
                    <button class="btn" onclick="editInvoice('${inv.id}')" title="Edit" style="padding: 4px 8px; width: auto;"><i data-lucide="edit-3" style="width: 14px;"></i></button>
                    <button class="btn" onclick="downloadInvoiceById('${inv.id}')" title="Download" style="padding: 4px 8px; width: auto;"><i data-lucide="download" style="width: 14px;"></i></button>
                    <button class="btn" onclick="deleteInvoicePrompt('${inv.id}')" title="Delete" style="padding: 4px 8px; width: auto; color: var(--danger-red);"><i data-lucide="trash" style="width: 14px;"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        lucide.createIcons();
    } catch (err) {
        showToast('Error loading stats', 'error');
    }
}

// --- Client Logic ---
async function loadClients(query = '') {
    try {
        allClients = await getClients();
        const container = document.getElementById('client-list');
        container.innerHTML = '';
        
        const filtered = allClients.filter(c => 
            c.name.toLowerCase().includes(query) || 
            c.phone.includes(query)
        );

        filtered.forEach(client => {
            const card = document.createElement('div');
            card.className = 'stat-card hover-lift';
            card.style.cursor = 'pointer';
            card.onclick = (e) => {
                if (e.target.closest('button')) return;
                showClientProfile(client.id);
            };
            card.innerHTML = `
                <div class="stat-info">
                    <h2 style="font-size: 20px;">${client.name}</h2>
                    <p style="font-size: 14px; color: #666; margin-top: 5px;">${client.phone}</p>
                    <p style="font-size: 13px; color: #888; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${client.address}</p>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button class="btn" onclick="editClient('${client.id}')" style="padding: 8px; width: auto; background: #f0f4f8;"><i data-lucide="edit" style="width: 16px;"></i></button>
                    <button class="btn" onclick="deleteClientPrompt('${client.id}')" style="padding: 8px; width: auto; background: #fff1f0; color: var(--danger-red);"><i data-lucide="trash-2" style="width: 16px;"></i></button>
                    <button class="btn" onclick="createInvoiceForClient('${client.id}')" style="padding: 8px; font-size: 12px; border: 1px solid var(--primary-navy);">New Invoice</button>
                    <button class="btn" onclick="showClientProfile('${client.id}')" style="padding: 8px; font-size: 12px; background: var(--primary-navy); color: white;">View Profile</button>
                </div>
            `;
            container.appendChild(card);
        });
        lucide.createIcons();
    } catch (err) {
        showToast('Error loading clients', 'error');
    }
}

async function showClientProfile(id) {
    const client = allClients.find(c => c.id === id);
    if (!client) return;
    
    currentClientId = id;
    document.getElementById('prof-client-name').textContent = client.name;
    document.getElementById('prof-client-info').textContent = `Phone: ${client.phone} | Address: ${client.address}`;
    
    // Setup profile buttons
    document.getElementById('prof-edit-btn').onclick = () => editClient(id);
    document.getElementById('prof-new-inv-btn').onclick = () => createInvoiceForClient(id);
    document.getElementById('prof-delete-btn').onclick = () => deleteClientPrompt(id);

    try {
        const invoices = await getInvoicesByClient(id);
        const tbody = document.getElementById('prof-invoice-table');
        tbody.innerHTML = '';
        
        let totalDue = 0;
        invoices.forEach(inv => {
            totalDue += Number(inv.remaining);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${inv.invoice_number}</td>
                <td>${new Date(inv.date).toLocaleDateString()}</td>
                <td>Rs ${inv.total.toLocaleString()}</td>
                <td style="color: ${inv.remaining > 0 ? 'var(--danger-red)' : 'var(--success-green)'}; font-weight: 700;">Rs ${inv.remaining.toLocaleString()}</td>
                <td>
                    <button class="btn" onclick="previewInvoice('${inv.id}')" title="Preview" style="padding: 4px 8px; width: auto;"><i data-lucide="eye" style="width: 14px;"></i></button>
                    <button class="btn" onclick="editInvoice('${inv.id}')" title="Edit" style="padding: 4px 8px; width: auto;"><i data-lucide="edit-3" style="width: 14px;"></i></button>
                    <button class="btn" onclick="downloadInvoiceById('${inv.id}')" title="Download" style="padding: 4px 8px; width: auto;"><i data-lucide="download" style="width: 14px;"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        document.getElementById('prof-stat-due').textContent = `Rs ${totalDue.toLocaleString()}`;
        document.getElementById('prof-stat-count').textContent = invoices.length;
        
        document.querySelectorAll('.view-section').forEach(v => v.style.display = 'none');
        document.getElementById('client-profile-view').style.display = 'block';
        currentView = 'client-profile';
        lucide.createIcons();
    } catch (err) {
        showToast('Error loading profile data', 'error');
    }
}

function editClient(id) {
    const client = allClients.find(c => c.id === id);
    if (client) {
        document.getElementById('modal-title').textContent = 'Edit Client';
        document.getElementById('client-id').value = client.id;
        document.getElementById('client-name').value = client.name;
        document.getElementById('client-phone').value = client.phone;
        document.getElementById('client-address').value = client.address;
        document.getElementById('client-notes').value = client.notes || '';
        document.getElementById('client-modal').style.display = 'flex';
    }
}

async function deleteClientPrompt(id) {
    if (confirm('Are you sure you want to delete this client? All their invoices will also be deleted.')) {
        try {
            await deleteClient(id);
            showToast('Client deleted');
            if (currentView === 'client-profile') {
                showView('clients');
            } else {
                loadClients();
            }
        } catch (err) {
            showToast('Error deleting client', 'error');
        }
    }
}

// --- Invoice Logic ---
async function setupInvoiceView(isEdit = false) {
    try {
        const clients = await getClients();
        const select = document.getElementById('inv-client-select');
        select.innerHTML = '<option value="">Choose a client...</option>';
        clients.forEach(c => {
            select.innerHTML += `<option value="${c.id}" ${currentClientId === c.id ? 'selected' : ''}>${c.name}</option>`;
        });
        
        if (!isEdit) {
            currentInvoiceId = null;
            document.getElementById('invoice-mode-title').textContent = 'Create New';
            
            // Reset rows
            const container = document.getElementById('product-rows-container');
            container.innerHTML = '';
            addProductRow(); // Add first empty row
            
            // Reset totals
            document.getElementById('inv-discount').value = 0;
            document.getElementById('inv-paid').value = 0;
            calculateInvoiceTotals();
        } else {
            document.getElementById('invoice-mode-title').textContent = 'Edit';
        }
        
    } catch (err) {
        showToast('Error setting up invoice creator', 'error');
    }
}

async function editInvoice(id) {
    try {
        const data = await getInvoiceDetails(id);
        currentInvoiceId = id;
        currentClientId = data.client_id;
        
        await setupInvoiceView(true);
        
        // Fill data
        document.getElementById('inv-client-select').value = data.client_id;
        document.getElementById('inv-discount').value = (data.items.reduce((a, b) => a + b.total, 0) - data.total).toFixed(2);
        document.getElementById('inv-paid').value = data.paid;
        
        const container = document.getElementById('product-rows-container');
        container.innerHTML = '';
        data.items.forEach(item => {
            const row = addProductRow();
            row.querySelector('.item-name').value = item.product_name;
            row.querySelector('.item-price').value = item.price;
            row.querySelector('.item-qty').value = item.quantity;
            row.querySelector('.item-total').value = item.total;
        });
        
        calculateInvoiceTotals();
        
        // Switch to the view manually instead of using showView('create-invoice') directly 
        // to avoid double setupInvoiceView call if that was the logic
        document.querySelectorAll('.view-section').forEach(v => v.style.display = 'none');
        document.getElementById('create-invoice-view').style.display = 'block';
        currentView = 'create-invoice';
        
        // Update nav active state manually
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.getAttribute('data-view') === 'invoices') link.classList.add('active');
            else link.classList.remove('active');
        });

    } catch (err) {
        showToast('Error loading invoice for edit', 'error');
    }
}

function createInvoiceForClient(clientId) {
    currentClientId = clientId;
    currentInvoiceId = null; // Ensure we are NOT in edit mode
    setupInvoiceView(); // Prepare fresh invoice form
    showView('create-invoice');
}

function addProductRow() {
    const container = document.getElementById('product-rows-container');
    const row = document.createElement('div');
    row.className = 'product-row';
    row.innerHTML = `
        <div class="form-group">
            <label>Product Name</label>
            <input type="text" class="input-field item-name" placeholder="Item Name">
        </div>
        <div class="form-group">
            <label>Price</label>
            <input type="number" class="input-field item-price" placeholder="0" value="0">
        </div>
        <div class="form-group">
            <label>Qty</label>
            <input type="number" class="input-field item-qty" placeholder="1" value="1">
        </div>
        <div class="form-group">
            <label>Total</label>
            <input type="number" class="input-field item-total" value="0" disabled>
        </div>
        <button class="btn" style="padding: 10px; color: var(--danger-red);" onclick="this.parentElement.remove(); calculateInvoiceTotals();"><i data-lucide="trash-2" style="width: 18px;"></i></button>
    `;
    container.appendChild(row);
    lucide.createIcons();
    
    // Add calc listeners
    const priceInput = row.querySelector('.item-price');
    const qtyInput = row.querySelector('.item-qty');
    const totalInput = row.querySelector('.item-total');
    
    [priceInput, qtyInput].forEach(inp => {
        inp.addEventListener('input', () => {
            const total = Number(priceInput.value) * Number(qtyInput.value);
            totalInput.value = total;
            calculateInvoiceTotals();
        });
    });
    
    return row;
}

function calculateInvoiceTotals() {
    const rowTotals = Array.from(document.querySelectorAll('.item-total')).map(inp => Number(inp.value));
    const subtotal = rowTotals.reduce((a, b) => a + b, 0);
    const discount = Number(document.getElementById('inv-discount').value);
    const grandTotal = subtotal - discount;
    
    document.getElementById('summary-subtotal').textContent = `Rs ${subtotal.toLocaleString()}`;
    document.getElementById('summary-grand-total').textContent = `Rs ${grandTotal.toLocaleString()}`;
    
    calculateInvoiceRemaining();
}

function calculateInvoiceRemaining() {
    const grandTotalText = document.getElementById('summary-grand-total').textContent.replace('Rs ', '').replace(/,/g, '');
    const grandTotal = Number(grandTotalText);
    const paid = Number(document.getElementById('inv-paid').value);
    const remaining = grandTotal - paid;
    
    document.getElementById('summary-remaining').textContent = `Rs ${remaining.toLocaleString()}`;
}

async function saveNewInvoice() {
    const clientId = document.getElementById('inv-client-select').value;
    if (!clientId) return showToast('Please select a client', 'error');
    
    const items = [];
    document.querySelectorAll('.product-row').forEach(row => {
        const name = row.querySelector('.item-name').value;
        const price = Number(row.querySelector('.item-price').value);
        const qty = Number(row.querySelector('.item-qty').value);
        const total = price * qty;
        
        if (name && qty > 0) {
            items.push({ product_name: name, price, quantity: qty, total });
        }
    });
    
    if (items.length === 0) return showToast('Please add at least one product', 'error');
    
    const subtotal = items.reduce((a, b) => a + b.total, 0);
    const discount = Number(document.getElementById('inv-discount').value);
    const total = subtotal - discount;
    const paid = Number(document.getElementById('inv-paid').value);
    const remaining = total - paid;
    
    try {
        if (currentInvoiceId) {
            // Edit existing
            const invoice = {
                client_id: clientId,
                total,
                paid,
                remaining
            };
            await updateInvoice(currentInvoiceId, invoice, items);
            showToast('Invoice updated successfully!');
        } else {
            // Create new
            const invoiceNumber = await getNextInvoiceNumber();
            const invoice = {
                client_id: clientId,
                invoice_number: invoiceNumber,
                total,
                paid,
                remaining,
                date: new Date().toISOString()
            };
            await createInvoice(invoice, items);
            showToast('Invoice created successfully!');
        }
        
        showView('dashboard');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// --- Invoice Preview & Export ---
async function previewInvoice(invoiceId) {
    try {
        const data = await getInvoiceDetails(invoiceId);
        currentInvoiceId = invoiceId;
        
        document.getElementById('prev-inv-number').textContent = `#${data.invoice_number}`;
        document.getElementById('prev-inv-date').textContent = `Date: ${new Date(data.date).toLocaleDateString()}`;
        document.getElementById('prev-client-name').textContent = data.clients.name;
        document.getElementById('prev-client-phone').textContent = `Phone: ${data.clients.phone}`;
        document.getElementById('prev-client-address').textContent = `Address: ${data.clients.address}`;
        
        const tbody = document.getElementById('prev-items-list');
        tbody.innerHTML = '';
        data.items.forEach(item => {
            tbody.innerHTML += `
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.product_name}</td>
                    <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee;">${item.price.toLocaleString()}</td>
                    <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee;">${item.quantity}</td>
                    <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee;">${item.total.toLocaleString()}</td>
                </tr>
            `;
        });
        
        const subtotal = data.items.reduce((a, b) => a + b.total, 0);
        const discount = subtotal - data.total;
        
        document.getElementById('prev-subtotal').textContent = `Rs ${subtotal.toLocaleString()}`;
        document.getElementById('prev-discount').textContent = `Rs ${discount.toLocaleString()}`;
        document.getElementById('prev-total').textContent = `Rs ${data.total.toLocaleString()}`;
        document.getElementById('prev-paid').textContent = `Rs ${data.paid.toLocaleString()}`;
        document.getElementById('prev-remaining').textContent = `Rs ${data.remaining.toLocaleString()}`;
        
        document.getElementById('invoice-preview-modal').style.display = 'flex';
        lucide.createIcons();
    } catch (err) {
        showToast('Error loading preview', 'error');
    }
}

async function loadInvoices() {
    try {
        allInvoices = await getInvoices();
        const tbody = document.getElementById('all-invoices-table');
        tbody.innerHTML = '';
        
        allInvoices.forEach(inv => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${inv.invoice_number}</td>
                <td>${inv.clients?.name || 'Deleted Client'}</td>
                <td>${new Date(inv.date).toLocaleDateString()}</td>
                <td>Rs ${inv.total.toLocaleString()}</td>
                <td>Rs ${inv.paid.toLocaleString()}</td>
                <td style="color: ${inv.remaining > 0 ? 'var(--danger-red)' : 'var(--success-green)'}; font-weight: 700;">Rs ${inv.remaining.toLocaleString()}</td>
                <td>
                    <button class="btn" onclick="previewInvoice('${inv.id}')" title="Preview" style="padding: 4px 8px; width: auto;"><i data-lucide="eye" style="width: 14px;"></i></button>
                    <button class="btn" onclick="editInvoice('${inv.id}')" title="Edit" style="padding: 4px 8px; width: auto;"><i data-lucide="edit-3" style="width: 14px;"></i></button>
                    <button class="btn" onclick="downloadInvoiceById('${inv.id}')" title="Download" style="padding: 4px 8px; width: auto;"><i data-lucide="download" style="width: 14px;"></i></button>
                    <button class="btn" onclick="deleteInvoicePrompt('${inv.id}')" title="Delete" style="padding: 4px 8px; width: auto; color: var(--danger-red);"><i data-lucide="trash" style="width: 14px;"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        lucide.createIcons();
    } catch (err) {
        showToast('Error loading invoices', 'error');
    }
}

// Dynamic direct download function (background)
async function downloadInvoiceById(invoiceId) {
    try {
        showToast('Preparing download...', 'info');
        
        // 1. Load details into the hidden capture area
        const data = await getInvoiceDetails(invoiceId);
        
        // Ensure modal is "active" but hidden off-screen for layout
        const modal = document.getElementById('invoice-preview-modal');
        const originalStyle = modal.style.display;
        modal.style.display = 'flex';
        modal.style.visibility = 'hidden';
        modal.style.position = 'fixed';
        modal.style.left = '-10000px';

        document.getElementById('prev-inv-number').textContent = `#${data.invoice_number}`;
        document.getElementById('prev-inv-date').textContent = `Date: ${new Date(data.date).toLocaleDateString()}`;
        document.getElementById('prev-client-name').textContent = data.clients.name;
        document.getElementById('prev-client-phone').textContent = `Phone: ${data.clients.phone}`;
        document.getElementById('prev-client-address').textContent = `Address: ${data.clients.address}`;
        
        const tbody = document.getElementById('prev-items-list');
        tbody.innerHTML = '';
        data.items.forEach(item => {
            tbody.innerHTML += `
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.product_name}</td>
                    <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee;">${item.price.toLocaleString()}</td>
                    <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee;">${item.quantity}</td>
                    <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee;">${item.total.toLocaleString()}</td>
                </tr>
            `;
        });
        
        const subtotal = data.items.reduce((a, b) => a + b.total, 0);
        const discount = subtotal - data.total;
        
        document.getElementById('prev-subtotal').textContent = `Rs ${subtotal.toLocaleString()}`;
        document.getElementById('prev-discount').textContent = `Rs ${discount.toLocaleString()}`;
        document.getElementById('prev-total').textContent = `Rs ${data.total.toLocaleString()}`;
        document.getElementById('prev-paid').textContent = `Rs ${data.paid.toLocaleString()}`;
        document.getElementById('prev-remaining').textContent = `Rs ${data.remaining.toLocaleString()}`;

        // 2. Wait for rendering
        await new Promise(r => setTimeout(r, 500));

        // 3. Capture and download immediately
        await downloadInvoiceImage();

        // 4. Reset modal
        modal.style.display = originalStyle;
        modal.style.visibility = 'visible';
        modal.style.position = 'fixed';
        modal.style.left = '0';
        if (originalStyle === 'none') {
            modal.style.display = 'none';
        }

    } catch (err) {
        showToast('Download failed: ' + err.message, 'error');
    }
}

async function deleteInvoicePrompt(id) {
    if (confirm('Are you sure you want to delete this invoice?')) {
        try {
            await deleteInvoice(id);
            showToast('Invoice deleted');
            if (currentView === 'invoices') loadInvoices();
            else loadDashboard();
        } catch (err) {
            showToast('Error deleting invoice', 'error');
        }
    }
}

async function downloadInvoiceImage() {
    const area = document.getElementById('invoice-capture-area');
    const invNum = document.getElementById('prev-inv-number').textContent;
    const clientName = document.getElementById('prev-client-name').textContent;
    
    try {
        showToast('Processing high-quality image...', 'info');

        // Create a temporary container for capture
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'fixed';
        tempContainer.style.top = '-9999px';
        tempContainer.style.left = '-9999px';
        tempContainer.style.background = '#ffffff';
        document.body.appendChild(tempContainer);

        // Clone the area and append to temp container
        const clone = area.cloneNode(true);
        clone.style.transform = 'none'; // Ensure no weird CSS transforms
        clone.style.margin = '0';
        tempContainer.appendChild(clone);

        // Standard high-quality capture
        const canvas = await html2canvas(clone, {
            scale: 2.5,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            logging: false,
            // Ensure all styles are computed
            onclone: (clonedDoc) => {
                const el = clonedDoc.getElementById('invoice-capture-area');
                el.style.display = 'block';
                el.style.opacity = '1';
                el.style.visibility = 'visible';
            }
        });
        
        // Clean up
        document.body.removeChild(tempContainer);

        const dataUrl = canvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        link.download = `Invoice-${clientName}-${invNum}.png`;
        link.href = dataUrl;
        link.click();
        
        showToast('Image downloaded successfully!');
    } catch (err) {
        console.error('Capture Error:', err);
        showToast('Capture failed. Please try again.', 'error');
    }
}

// --- Utils ---
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.background = type === 'error' ? 'var(--danger-red)' : 'var(--primary-navy)';
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
    
    setTimeout(() => {
        toast.style.transform = 'translateY(100px)';
        toast.style.opacity = '0';
    }, 3000);
}

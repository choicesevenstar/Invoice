
// Supabase Configuration
const SUPABASE_URL = 'https://rciwsxvyfxouwclbewdm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjaXdzeHZ5ZnhvdXdjbGJld2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNDcwNTQsImV4cCI6MjA5MDcyMzA1NH0.EtFbX190yBHDuM5vXohmin4w1r_8ANUw-85cryp6tJY';

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Auth Helpers
async function login(email, password) {
    return await _supabase.auth.signInWithPassword({ email, password });
}

async function logout() {
    return await _supabase.auth.signOut();
}

async function getUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    return user;
}

// Client Helpers
async function getClients() {
    const { data, error } = await _supabase.from('clients').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

async function addClient(client) {
    const { data, error } = await _supabase.from('clients').insert([client]).select();
    if (error) throw error;
    return data[0];
}

async function updateClient(id, client) {
    const { data, error } = await _supabase.from('clients').update(client).eq('id', id).select();
    if (error) throw error;
    return data[0];
}

async function deleteClient(id) {
    const { error } = await _supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
}

// Invoice Helpers
async function getInvoices() {
    const { data, error } = await _supabase.from('invoices').select('*, clients(*)').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

async function getInvoicesByClient(clientId) {
    const { data, error } = await _supabase.from('invoices').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

async function createInvoice(invoice, items) {
    const { data: invData, error: invError } = await _supabase.from('invoices').insert([invoice]).select();
    if (invError) throw invError;
    
    const invoiceId = invData[0].id;
    const itemsWithId = items.map(item => ({ ...item, invoice_id: invoiceId }));
    
    const { error: itemsError } = await _supabase.from('invoice_items').insert(itemsWithId);
    if (itemsError) throw itemsError;
    
    return invData[0];
}

async function updateInvoice(invoiceId, invoiceData, items) {
    // 1. Update the main invoice record
    const { data: invData, error: invError } = await _supabase.from('invoices').update(invoiceData).eq('id', invoiceId).select();
    if (invError) throw invError;

    // 2. Delete existing items
    const { error: delError } = await _supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);
    if (delError) throw delError;

    // 3. Insert new items
    const itemsWithId = items.map(item => ({ ...item, invoice_id: invoiceId }));
    const { error: insError } = await _supabase.from('invoice_items').insert(itemsWithId);
    if (insError) throw insError;

    return invData[0];
}

async function getInvoiceDetails(invoiceId) {
    const { data: invoice, error: invError } = await _supabase.from('invoices').select('*, clients(*)').eq('id', invoiceId).single();
    if (invError) throw invError;
    
    const { data: items, error: itemsError } = await _supabase.from('invoice_items').select('*').eq('invoice_id', invoiceId);
    if (itemsError) throw itemsError;
    
    return { ...invoice, items };
}

async function deleteInvoice(invoiceId) {
    const { error } = await _supabase.from('invoices').delete().eq('id', invoiceId);
    if (error) throw error;
}

async function getNextInvoiceNumber() {
    const { data, error } = await _supabase.from('invoices').select('invoice_number').order('created_at', { ascending: false }).limit(1);
    if (error) return 'CSS-0001';
    if (!data || data.length === 0) return 'CSS-0001';
    
    const lastNum = parseInt(data[0].invoice_number.split('-')[1]);
    const nextNum = (lastNum + 1).toString().padStart(4, '0');
    return `CSS-${nextNum}`;
}

async function getDashboardStats() {
    const [clients, invoices] = await Promise.all([
        _supabase.from('clients').select('id', { count: 'exact' }),
        _supabase.from('invoices').select('id, total, paid, remaining', { count: 'exact' })
    ]);
    
    const stats = {
        totalClients: clients.count || 0,
        totalInvoices: invoices.count || 0,
        totalPaid: invoices.data?.reduce((sum, inv) => sum + Number(inv.paid), 0) || 0,
        totalRemaining: invoices.data?.reduce((sum, inv) => sum + Number(inv.remaining), 0) || 0
    };
    
    return stats;
}

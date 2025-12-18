const SUPABASE_URL = 'https://ducmehygksmijtynfuzt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1Y21laHlna3NtaWp0eW5mdXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2NTgyNTQsImV4cCI6MjA4MTIzNDI1NH0.Zo0RTm5fPn-sA6AkqSIPCCiehn8iW2Ou4I26HnC2CfU';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', async () => {

    if(sessionStorage.getItem('role') !== 'admin') window.location.href = 'login.html';
    
    // --- 1. NAVIGATION ---
    const menuItems = document.querySelectorAll('.menu-item:not(.logout)');
    const sections = document.querySelectorAll('.content-section');

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            sections.forEach(sec => sec.classList.remove('active-section'));
            document.getElementById(targetId).classList.add('active-section');
            
            if(targetId === 'dashboard') initDashboard();
            if(targetId === 'customers') loadAllCustomers();
            if(targetId === 'sales') quickReport(30);
            if(targetId === 'users') loadStaffList();
            if(targetId === 'reviews') loadReviews();
            if(targetId === 'messages') loadMessages();
        });
    });

    // --- 2. DASHBOARD ---
    async function initDashboard() {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        // Format: 1 Dec - 18 Dec 2025
        const str = `${firstDay.getDate()} ${firstDay.toLocaleString('en', {month:'short'})} - ${now.getDate()} ${now.toLocaleString('en', {month:'short'})} ${now.getFullYear()}`;
        document.getElementById('dashboard-date-title').innerText = str;
        
        loadMonthStats();
        // Load working hours from DB
        const { data } = await supabaseClient.from('settings').select('*');
        if(data) {
            data.forEach(s => {
                const el = document.querySelector(`#chip-${s.key} .val`);
                if(el) el.innerText = s.value;
            });
        }
    }
    
    // Save Working Hours
    document.getElementById('save-wh-btn').onclick = async () => {
        const updates = [
            {key: 'start-time', value: document.querySelector('#chip-start-time .val').innerText},
            {key: 'end-time', value: document.querySelector('#chip-end-time .val').innerText},
            {key: 'start-day', value: document.querySelector('#chip-start-day .val').innerText},
            {key: 'end-day', value: document.querySelector('#chip-end-day .val').innerText}
        ];
        
        for(let u of updates) {
            await supabaseClient.from('settings').upsert(u);
        }
        alert("Working hours saved!");
    };

    async function loadMonthStats() {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const { data } = await supabaseClient.from('orders').select('total_amount').eq('status','completed').gte('created_at', firstDay);
        if(data) {
            const rev = data.reduce((a,b)=> a + (parseFloat(b.total_amount)||0), 0);
            document.getElementById('month-orders').innerText = data.length;
            document.getElementById('month-revenue').innerText = '$' + rev.toLocaleString();
        }
    }

    // --- 3. CUSTOMERS (PILL UI) ---
    window.switchCustomerTab = function(type, el) {
        document.querySelectorAll('#customers .pill-tab').forEach(t => t.classList.remove('active-tab'));
        el.classList.add('active-tab');
        if(type === 'all') loadAllCustomers();
        if(type === 'loyal') loadLoyalCustomers();
        if(type === 'valuable') loadMostValuable();
        if(type === 'interests') loadInterests();
    }

    async function loadAllCustomers() {
        renderHeader(['First Name & Last Name', 'Phone Number', 'Joined Date']);
        const { data } = await supabaseClient.from('customers').select('*');
        renderList(data, c => `
            <span style="flex:1; font-weight:500;">${c.name}</span>
            <span style="flex:1">${c.phone}</span>
            <span style="flex:1; text-align:right;">${new Date(c.created_at).toLocaleDateString()}</span>
        `);
    }

    async function loadLoyalCustomers() {
        renderHeader(['Customer Name', 'Phone', 'Total Orders']);
        const { data } = await supabaseClient.from('loyal_customers_view').select('*');
        renderList(data, c => `
            <span style="flex:1; font-weight:500;">${c.name}</span>
            <span style="flex:1">${c.phone}</span>
            <span style="flex:1; text-align:right; font-weight:bold;">${c.order_count}</span>
        `);
    }

    async function loadMostValuable() {
        renderHeader(['Name', 'Total Spent (1 Yr)', 'Value (10%)']);
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const { data: orders } = await supabaseClient.from('orders').select('customer_id, total_amount, customers(name)').eq('status', 'completed').gte('created_at', oneYearAgo.toISOString());
        
        const map = {};
        if(orders) orders.forEach(o => {
            const cid = o.customer_id;
            if(!map[cid]) map[cid] = { name: o.customers.name, total: 0 };
            map[cid].total += parseFloat(o.total_amount);
        });
        const sorted = Object.values(map).sort((a,b) => b.total - a.total);
        renderList(sorted, c => `
            <span style="flex:1; font-weight:500;">${c.name}</span>
            <span style="flex:1; color:#2ECC71; font-weight:bold;">$${c.total.toFixed(2)}</span>
            <span style="flex:1; text-align:right; color:#FF724C; font-weight:bold;">${(c.total * 0.1).toFixed(1)} Pts</span>
        `);
    }

    async function loadInterests() {
        renderHeader(['Customer', 'Top 3 Ingredients', 'Fav Food']);
        const { data: items } = await supabaseClient.from('order_items').select('product_name, ingredients, orders(customer_id, customers(name))');
        const map = {};
        if(items) items.forEach(i => {
            if(!i.orders) return;
            const cid = i.orders.customer_id;
            if(!map[cid]) map[cid] = { name: i.orders.customers.name, foods: {}, ings: {} };
            map[cid].foods[i.product_name] = (map[cid].foods[i.product_name]||0) + 1;
            if(i.ingredients) i.ingredients.split(',').forEach(ing => {
                const k = ing.trim();
                map[cid].ings[k] = (map[cid].ings[k]||0) + 1;
            });
        });
        const list = Object.values(map).map(c => {
            const topFood = Object.entries(c.foods).sort((a,b)=>b[1]-a[1])[0]?.[0] || '-';
            const topIngs = Object.entries(c.ings).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]).join(', ');
            return { name: c.name, topFood, topIngs };
        });
        renderList(list, c => `
            <span style="flex:1; font-weight:500;">${c.name}</span>
            <span style="flex:1; font-size:13px; color:#666;">${c.topIngs}</span>
            <span style="flex:1; text-align:right; color:#FF724C;">${c.topFood}</span>
        `);
    }

    function renderHeader(titles) {
        document.getElementById('customer-header').innerHTML = titles.map((t,i) => 
            `<span class="header-item" style="flex:1; ${i===titles.length-1?'text-align:right':''}">${t}</span>`
        ).join('');
    }
    function renderList(data, rowFn) {
        const c = document.getElementById('customer-list');
        c.innerHTML = '';
        if(!data || !data.length) c.innerHTML = '<p style="padding:15px; color:#aaa;">No data found.</p>';
        else data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'table-row';
            div.innerHTML = rowFn(item);
            c.appendChild(div);
        });
    }

    // --- 4. SALES ---
    window.switchSalesMode = function(mode, el) {
        document.querySelectorAll('#sales .pill-tab').forEach(t => t.classList.remove('active-tab'));
        el.classList.add('active-tab');
        document.getElementById('sales-cash-view').style.display = mode==='cash'?'block':'none';
        document.getElementById('sales-product-view').style.display = mode==='product'?'block':'none';
        if(mode==='product') setProductFilter(7, 'Last 7 Days');
    }
    window.quickReport = async function(days) {
        const start = new Date(); start.setDate(start.getDate()-days);
        const { data } = await supabaseClient.from('orders').select('total_amount').eq('status','completed').gte('created_at', start.toISOString());
        const total = data ? data.reduce((a,b)=>a+(parseFloat(b.total_amount)||0),0) : 0;
        document.getElementById('report-revenue').innerText = '$'+total.toLocaleString();
    }
    window.setProductFilter = async function(val, label) {
        document.querySelector('#chip-prod-range .val').innerText = label;
        document.querySelector('.chip-menu').classList.remove('show');
        let start = new Date(), end = new Date();
        if(typeof val === 'number') start.setDate(start.getDate()-val);
        else {
            const y = end.getFullYear();
            if(val==='Spring') { start=new Date(y,2,21); end=new Date(y,5,21); }
            if(val==='Summer') { start=new Date(y,5,22); end=new Date(y,8,22); }
            if(val==='Autumn') { start=new Date(y,8,23); end=new Date(y,11,21); }
            if(val==='Winter') { start=new Date(y,11,22); end=new Date(y+1,2,20); }
        }
        const { data } = await supabaseClient.from('order_items').select('product_name, final_price, quantity').gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
        const list = document.getElementById('product-list');
        list.innerHTML = '';
        if(data) {
            const agg = {};
            data.forEach(i => {
                if(!agg[i.product_name]) agg[i.product_name] = {qty:0, total:0};
                agg[i.product_name].qty += i.quantity;
                agg[i.product_name].total += (i.quantity * i.final_price);
            });
            Object.entries(agg).forEach(([name, stat]) => {
                list.innerHTML += `<div class="table-row"><span style="flex:2; font-weight:500;">${name}</span><span style="flex:1;">${stat.qty}</span><span style="flex:1; text-align:right;">$${stat.total.toFixed(2)}</span></div>`;
            });
        }
    }

    // --- 5. USERS MANAGEMENT ---
    window.switchUserTab = function(type, el) {
        document.querySelectorAll('#users .pill-tab').forEach(t => t.classList.remove('active-tab'));
        el.classList.add('active-tab');
        document.getElementById('user-tab-staff').style.display = type==='staff'?'block':'none';
        document.getElementById('user-tab-admin').style.display = type==='admin'?'block':'none';
        if(type==='staff') loadStaffList(); else loadAdminList();
    }
    document.getElementById('create-btn').onclick = async () => {
        const u = document.getElementById('new-user').value;
        const p = document.getElementById('new-pass').value;
        await supabaseClient.from('staff').insert([{username:u, password:p}]);
        loadStaffList();
    };
    document.getElementById('create-admin-btn').onclick = async () => {
        const u = document.getElementById('admin-user').value;
        const p = document.getElementById('admin-pass').value;
        await supabaseClient.from('admins').insert([{username:u, password:p}]);
        loadAdminList();
    };
    async function loadStaffList() {
        const c = document.getElementById('staff-list-container');
        const { data } = await supabaseClient.from('staff').select('*');
        renderUserList(c, data, 'staff');
    }
    async function loadAdminList() {
        const c = document.getElementById('admin-list-container');
        const { data } = await supabaseClient.from('admins').select('*');
        renderUserList(c, data, 'admins');
    }
    function renderUserList(container, data, table) {
        container.innerHTML = '';
        if(!data) return;
        data.forEach(u => {
            const div = document.createElement('div');
            div.className = 'table-row';
            div.innerHTML = `<span style="flex:1; font-weight:500;">${u.username}</span><span style="flex:1; text-align:right;"><button onclick="changePass('${table}', ${u.id})" style="background:none; border:none; color:#F39C12; cursor:pointer; margin-right:10px;">Change Pass</button><button onclick="deleteUser('${table}', ${u.id})" style="background:none; border:none; color:#E74C3C; cursor:pointer;">Delete</button></span>`;
            container.appendChild(div);
        });
    }
    window.changePass = async (table, id) => {
        const p = prompt("New Password:");
        if(p) await supabaseClient.from(table).update({password:p}).eq('id', id);
    }
    window.deleteUser = async (table, id) => {
        if(confirm("Delete?")) {
            await supabaseClient.from(table).delete().eq('id', id);
            if(table==='staff') loadStaffList(); else loadAdminList();
        }
    }

    // --- 6. REVIEWS & NOTIFICATIONS ---
    let notifEnabled = false, soundEnabled = true;
    window.toggleNotifSetting = () => {
        notifEnabled = !notifEnabled;
        document.getElementById('notif-state').innerText = notifEnabled ? 'ON' : 'OFF';
        document.getElementById('sound-btn').style.display = notifEnabled ? 'flex' : 'none';
        // (Optional) Save to settings DB here
    }
    window.toggleSoundSetting = () => {
        soundEnabled = !soundEnabled;
        document.getElementById('sound-state').innerText = soundEnabled ? 'ON' : 'OFF';
        if(soundEnabled) document.getElementById('notif-sound').play();
    }
    async function loadReviews() {
        const { data } = await supabaseClient.from('reviews').select('*');
        const c = document.getElementById('reviews-container');
        c.innerHTML = '';
        if(data) data.forEach(r => {
            c.innerHTML += `<div class="clean-table" style="margin-bottom:10px; padding:15px;"><strong>${r.customer_name}</strong> (${r.rating} stars)<p style="margin:5px 0 0 0; color:#666;">${r.comment}</p></div>`;
        });
    }
    async function loadMessages() {
        const { data } = await supabaseClient.from('messages').select('*');
        const c = document.getElementById('messages-container');
        c.innerHTML = '';
        if(data) data.forEach(m => c.innerHTML += `<div style="padding:10px; border-bottom:1px solid #eee;"><b>${m.title}</b>: ${m.body}</div>`);
    }

    // Profile & Chips
    document.getElementById('profile-trigger').onclick = () => document.getElementById('profile-modal').style.display='flex';
    document.getElementById('save-profile-btn').onclick = async () => {
        const u = document.getElementById('edit-self-user').value;
        const p = document.getElementById('edit-self-pass').value;
        const current = document.getElementById('header-username').innerText;
        await supabaseClient.from('admins').update({username:u, password:p}).eq('username', current);
        window.location.href = 'login.html';
    };
    window.toggleChip = (id) => {
        document.querySelectorAll('.chip-menu').forEach(m => m.classList.remove('show'));
        document.getElementById('menu-'+id).classList.add('show');
    };
    const times = Array.from({length:24},(_,i)=>`${i.toString().padStart(2,'0')}:00`);
    const daysArr = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    ['start-time','end-time'].forEach(t => fillMenu(t, times));
    ['start-day','end-day'].forEach(t => fillMenu(t, daysArr));
    function fillMenu(id, arr) {
        const m = document.getElementById('menu-'+id);
        arr.forEach(val => {
            const d = document.createElement('div'); d.className = 'chip-option'; d.innerText = val;
            d.onclick = () => { document.querySelector(`#chip-${id} .val`).innerText = val; m.classList.remove('show'); };
            m.appendChild(d);
        });
    }
    window.onclick = (e) => { if(!e.target.closest('.chip-dropdown')) document.querySelectorAll('.chip-menu').forEach(m => m.classList.remove('show')); }
});

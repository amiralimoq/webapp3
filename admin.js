const SUPABASE_URL = 'https://ducmehygksmijtynfuzt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1Y21laHlna3NtaWp0eW5mdXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2NTgyNTQsImV4cCI6MjA4MTIzNDI1NH0.Zo0RTm5fPn-sA6AkqSIPCCiehn8iW2Ou4I26HnC2CfU';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', async () => {

    // --- 0. CHECK LOGIN & HEADER USERNAME ---
    if(sessionStorage.getItem('role') !== 'admin') window.location.href = 'login.html';
    
    // دریافت نام ادمین فعلی
    // (فرض: ما فقط ادمین را با نقش ذخیره کردیم. برای نمایش نام دقیق نیاز است در لاگین نام را ذخیره کنیم. 
    // اینجا فعلا 'Admin Manager' را پیش فرض میگذاریم یا اگر در سشن ذخیره کردید میخوانیم)
    // بهتر است در لاگین این را اضافه کنید: sessionStorage.setItem('adminName', user);
    const adminName = sessionStorage.getItem('adminName') || 'Admin Manager';
    document.getElementById('header-username').innerText = adminName;

    // --- 1. SIDEBAR & NAVIGATION ---
    const menuItems = document.querySelectorAll('.menu-item:not(.logout)');
    const sections = document.querySelectorAll('.content-section');

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            sections.forEach(sec => sec.classList.remove('active-section'));
            document.getElementById(targetId).classList.add('active-section');
            
            // Init Section Data
            if(targetId === 'dashboard') initDashboard();
            if(targetId === 'customers') loadAllCustomers();
            if(targetId === 'sales') quickReport(30); // Default cash report
            if(targetId === 'users') loadStaffList();
            if(targetId === 'reviews') loadReviews();
            if(targetId === 'messages') loadMessages();
        });
    });

    // --- 2. DASHBOARD LOGIC ---
    function initDashboard() {
        // Date Title (1 Dec - Current)
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const options = { day: 'numeric', month: 'short' };
        document.getElementById('dashboard-date-title').innerText = 
            `${firstDay.toLocaleDateString('en-GB', options)} - ${now.toLocaleDateString('en-GB', options)}`;
        
        loadMonthStats();
        initWorkingHours();
    }
    
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

    // --- 3. CUSTOMERS LOGIC ---
    window.switchCustomerTab = function(type, el) {
        document.querySelectorAll('#customers .nav-tab').forEach(t => t.classList.remove('active-tab'));
        el.classList.add('active-tab');
        
        if(type === 'all') loadAllCustomers();
        if(type === 'loyal') loadLoyalCustomers();
        if(type === 'valuable') loadMostValuable();
        if(type === 'interests') loadInterests();
    }

    async function loadAllCustomers() {
        renderCustomerHeader(['Name', 'Phone', 'Joined']);
        const { data } = await supabaseClient.from('customers').select('*');
        renderCustomerList(data, c => `<span>${c.name}</span><span>${c.phone}</span><span style="text-align:right">${new Date(c.created_at).toLocaleDateString()}</span>`);
    }

    async function loadMostValuable() {
        renderCustomerHeader(['Name', 'Total Spent (1 Yr)', 'Value (10%)']);
        // منطق: گرفتن سفارشات ۱ سال اخیر -> جمع کردن برای هر مشتری -> سورت
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        
        const { data: orders } = await supabaseClient
            .from('orders')
            .select('customer_id, total_amount, customers(name, phone)')
            .eq('status', 'completed')
            .gte('created_at', oneYearAgo.toISOString());

        // Group by Customer
        const customerMap = {};
        if(orders) {
            orders.forEach(o => {
                const cid = o.customer_id;
                if(!customerMap[cid]) customerMap[cid] = { ...o.customers, total: 0 };
                customerMap[cid].total += parseFloat(o.total_amount);
            });
        }

        const sorted = Object.values(customerMap).sort((a,b) => b.total - a.total);
        renderCustomerList(sorted, c => `
            <span>${c.name} <br><small style="color:#aaa">${c.phone}</small></span>
            <span style="color:#2ECC71; font-weight:bold">$${c.total.toFixed(2)}</span>
            <span style="text-align:right; font-weight:bold; color:#FF724C;">${(c.total * 0.1).toFixed(1)} Pts</span>
        `);
    }

    async function loadInterests() {
        renderCustomerHeader(['Customer', 'Top 3 Ingredients', 'Fav Food']);
        // نیاز به join پیچیده دارد، برای سادگی کلاینت‌ساید انجام میدهیم
        const { data: items } = await supabaseClient
            .from('order_items')
            .select('product_name, ingredients, orders(customer_id, customers(name, phone))');
        
        const map = {}; // { custId: { name, phone, ingredientsCount: {}, foodCount: {} } }
        
        if(items) {
            items.forEach(item => {
                if(!item.orders || !item.orders.customers) return;
                const cid = item.orders.customer_id;
                const cust = item.orders.customers;
                
                if(!map[cid]) map[cid] = { name: cust.name, phone: cust.phone, ings: {}, foods: {} };
                
                // Count Food
                map[cid].foods[item.product_name] = (map[cid].foods[item.product_name] || 0) + 1;
                
                // Count Ingredients
                if(item.ingredients) {
                    item.ingredients.split(',').forEach(ing => {
                        const i = ing.trim();
                        map[cid].ings[i] = (map[cid].ings[i] || 0) + 1;
                    });
                }
            });
        }

        const list = Object.values(map).map(c => {
            // Get Top Food
            const topFood = Object.entries(c.foods).sort((a,b) => b[1]-a[1])[0]?.[0] || '-';
            // Get Top 3 Ingredients
            const topIngs = Object.entries(c.ings).sort((a,b) => b[1]-a[1]).slice(0,3).map(x=>x[0]).join(', ');
            return { ...c, topFood, topIngs };
        });

        renderCustomerList(list, c => `
            <span>${c.name}</span>
            <span style="font-size:12px; color:#555;">${c.topIngs}</span>
            <span style="text-align:right; color:#FF724C;">${c.topFood}</span>
        `);
    }

    function renderCustomerHeader(titles) {
        document.getElementById('customer-header').innerHTML = titles.map((t,i) => 
            `<span style="flex:1; ${i===titles.length-1 ? 'text-align:right':''}">${t}</span>`
        ).join('');
    }
    function renderCustomerList(data, templateFn) {
        const list = document.getElementById('customer-list');
        list.innerHTML = '';
        if(!data || !data.length) list.innerHTML = '<p style="padding:15px;color:#aaa">No data found.</p>';
        else data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'list-row';
            div.innerHTML = templateFn(item);
            list.appendChild(div);
        });
    }

    // --- 4. SALES LOGIC ---
    window.switchSalesMode = function(mode, el) {
        document.querySelectorAll('#sales .nav-tab').forEach(t => t.classList.remove('active-tab'));
        el.classList.add('active-tab');
        document.getElementById('sales-cash-view').style.display = mode === 'cash' ? 'block' : 'none';
        document.getElementById('sales-product-view').style.display = mode === 'product' ? 'block' : 'none';
        
        if(mode === 'product') setProductFilter(7, 'Last 7 Days'); // Default
    }

    // Product Filter Logic (Chips)
    window.setProductFilter = async function(val, label) {
        document.querySelector('#chip-prod-range .val').innerText = label;
        closeAllChips();
        
        let startDate = new Date();
        let endDate = new Date();

        if (typeof val === 'number') {
            startDate.setDate(endDate.getDate() - val);
        } else {
            // Seasonal Logic
            const year = endDate.getFullYear();
            if(val === 'Spring') { startDate = new Date(year, 2, 21); endDate = new Date(year, 5, 21); }
            if(val === 'Summer') { startDate = new Date(year, 5, 22); endDate = new Date(year, 8, 22); }
            if(val === 'Autumn') { startDate = new Date(year, 8, 23); endDate = new Date(year, 11, 21); }
            if(val === 'Winter') { startDate = new Date(year, 11, 22); endDate = new Date(year+1, 2, 20); }
        }

        const { data } = await supabaseClient
            .from('order_items')
            .select('product_name, final_price, quantity')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

        const list = document.getElementById('product-list');
        list.innerHTML = '';
        
        if(data) {
            const stats = {};
            data.forEach(i => {
                if(!stats[i.product_name]) stats[i.product_name] = { qty: 0, total: 0 };
                stats[i.product_name].qty += i.quantity;
                stats[i.product_name].total += (i.final_price * i.quantity);
            });
            
            Object.entries(stats).forEach(([name, stat]) => {
                list.innerHTML += `
                    <div class="list-row">
                        <span style="flex:2; font-weight:500;">${name}</span>
                        <span style="flex:1">${stat.qty}</span>
                        <span style="flex:1; text-align:right; font-weight:bold;">$${stat.total.toFixed(2)}</span>
                    </div>`;
            });
        }
    }

    // --- 5. USERS MANAGEMENT ---
    window.switchUserTab = function(type, el) {
        document.querySelectorAll('#users .nav-tab').forEach(t => t.classList.remove('active-tab'));
        el.classList.add('active-tab');
        if(type === 'staff') loadStaffList();
        else loadAdminList();
    }
    
    async function loadStaffList() {
        const list = document.getElementById('users-list');
        list.innerHTML = '...';
        const { data } = await supabaseClient.from('staff').select('*');
        list.innerHTML = '';
        data.forEach(u => {
            list.innerHTML += `
            <div class="list-row">
                <span style="flex:1">${u.username}</span>
                <span style="flex:1; text-align:right; display:flex; justify-content:flex-end; gap:10px;">
                    <button class="btn-action btn-reset" onclick="changePass('staff', ${u.id})">New Pass</button>
                    <button class="btn-action btn-delete" onclick="deleteUser('staff', ${u.id})">Delete</button>
                </span>
            </div>`;
        });
    }

    async function loadAdminList() {
        const list = document.getElementById('users-list');
        list.innerHTML = '...';
        const { data } = await supabaseClient.from('admins').select('*');
        list.innerHTML = '';
        data.forEach(u => {
            list.innerHTML += `
            <div class="list-row">
                <span style="flex:1; font-weight:bold;">${u.username}</span>
                <span style="flex:1; text-align:right; display:flex; justify-content:flex-end; gap:10px;">
                     <button class="btn-action btn-delete" onclick="deleteUser('admins', ${u.id})">Delete</button>
                </span>
            </div>`;
        });
    }

    window.changePass = async (table, id) => {
        const newP = prompt("Enter new password:");
        if(newP) {
            await supabaseClient.from(table).update({password: newP}).eq('id', id);
            alert("Password updated.");
        }
    }
    window.deleteUser = async (table, id) => {
        if(confirm("Delete user?")) {
            await supabaseClient.from(table).delete().eq('id', id);
            if(table==='staff') loadStaffList(); else loadAdminList();
        }
    }

    // --- 6. REVIEWS & SETTINGS ---
    let notifEnabled = false;
    let soundEnabled = true;

    async function loadReviews() {
        const { data } = await supabaseClient.from('reviews').select('*').order('created_at', {ascending:false});
        const container = document.getElementById('reviews-container');
        container.innerHTML = '';
        if(data) {
            data.forEach(r => {
                container.innerHTML += `
                <div class="review-card">
                    <div class="review-header">
                        <strong>${r.customer_name}</strong>
                        <div class="star-rating">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
                    </div>
                    <p style="font-size:13px; color:#555; margin:0;">${r.comment}</p>
                </div>`;
            });
        }
    }

    window.toggleNotifSetting = () => {
        notifEnabled = !notifEnabled;
        document.getElementById('notif-state').innerText = notifEnabled ? 'ON' : 'OFF';
        document.getElementById('sound-btn').style.display = notifEnabled ? 'flex' : 'none';
        document.getElementById('notif-btn').classList.toggle('active-chip', notifEnabled);
    }
    window.toggleSoundSetting = () => {
        soundEnabled = !soundEnabled;
        document.getElementById('sound-state').innerText = soundEnabled ? 'ON' : 'OFF';
        if(soundEnabled) document.getElementById('notif-sound').play();
    }

    // --- 7. CHIP DROPDOWNS (Generic) ---
    const workingHoursData = {
        start: Array.from({length:24}, (_,i)=> `${i.toString().padStart(2,'0')}:00`),
        days: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
    };

    function initWorkingHours() {
        fillMenu('menu-start-time', workingHoursData.start, 'start-time');
        fillMenu('menu-end-time', workingHoursData.start, 'end-time');
        fillMenu('menu-start-day', workingHoursData.days, 'start-day');
        fillMenu('menu-end-day', workingHoursData.days, 'end-day');
    }

    function fillMenu(id, items, type) {
        const menu = document.getElementById(id);
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'chip-option';
            div.innerText = item;
            div.onclick = () => {
                document.querySelector(`#chip-${type} .val`).innerText = item;
                closeAllChips();
            };
            menu.appendChild(div);
        });
    }

    window.toggleChip = (type) => {
        const menu = document.getElementById(`menu-${type}`);
        const isVisible = menu.classList.contains('show');
        closeAllChips();
        if(!isVisible) menu.classList.add('show');
    }

    function closeAllChips() {
        document.querySelectorAll('.chip-menu').forEach(m => m.classList.remove('show'));
    }

    // --- 8. PROFILE MODAL ---
    const modal = document.getElementById('profile-modal');
    document.getElementById('profile-trigger').onclick = () => {
        modal.style.display = 'flex';
        document.getElementById('edit-self-user').value = document.getElementById('header-username').innerText;
    };
    
    document.getElementById('save-profile-btn').onclick = async () => {
        const newU = document.getElementById('edit-self-user').value;
        const newP = document.getElementById('edit-self-pass').value;
        
        // This requires identifying the current admin ID. 
        // For prototype, we update based on current username
        const currentName = document.getElementById('header-username').innerText;
        
        const { error } = await supabaseClient.from('admins').update({username: newU, password: newP}).eq('username', currentName);
        
        if(!error) {
            alert("Profile updated! Please login again.");
            window.location.href = 'login.html';
        } else {
            alert("Error: " + error.message);
        }
    };
    
    // Close modal on outside click
    window.onclick = (e) => {
        if (!e.target.closest('.chip-dropdown')) closeAllChips();
        if (e.target == modal) modal.style.display = 'none';
    }
});

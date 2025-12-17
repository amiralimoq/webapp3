// ==========================================
// تنظیمات اتصال به دیتابیس Supabase
// ==========================================
const SUPABASE_URL = 'https://ducmehygksmijtynfuzt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1Y21laHlna3NtaWp0eW5mdXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2NTgyNTQsImV4cCI6MjA4MTIzNDI1NH0.Zo0RTm5fPn-sA6AkqSIPCCiehn8iW2Ou4I26HnC2CfU';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. مدیریت ناوبری سایدبار (Sidebar Navigation) ---
    const menuItems = document.querySelectorAll('.menu-item:not(.logout)');
    const sections = document.querySelectorAll('.content-section');

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            // آپدیت کلاس اکتیو منو
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // نمایش سکشن مربوطه
            const targetId = item.getAttribute('data-target');
            sections.forEach(sec => sec.classList.remove('active-section'));
            document.getElementById(targetId).classList.add('active-section');

            // بارگذاری دیتا بر اساس تب
            if(targetId === 'dashboard') loadMonthStats();
            if(targetId === 'customer-club') loadAllCustomers(); // پیشفرض همه مشتریان
            if(targetId === 'messages') loadMessages();
        });
    });

    // --- خروج (Logout) ---
    const logoutBtn = document.querySelector('.logout');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if(confirm('Are you sure you want to logout?')) {
                sessionStorage.clear();
                window.location.href = 'login.html';
            }
        });
    }

    // ============================================
    // A. داشبورد: آمار ماهانه (Current Month Stats)
    // ============================================
    async function loadMonthStats() {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

        // کوئری گرفتن سفارشات ماه جاری که Completed هستند
        const { data, error } = await supabaseClient
            .from('orders')
            .select('total_amount')
            .eq('status', 'completed')
            .gte('created_at', firstDay)
            .lte('created_at', lastDay);

        if (!error && data) {
            const count = data.length;
            const revenue = data.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0);
            
            document.getElementById('month-orders').innerText = count;
            document.getElementById('month-revenue').innerText = '$' + revenue.toLocaleString();
        }
    }
    // لود اولیه
    loadMonthStats();

    // ============================================
    // B. داشبورد: ساخت ادمین جدید
    // ============================================
    const createAdminBtn = document.getElementById('create-admin-btn');
    if(createAdminBtn) {
        createAdminBtn.addEventListener('click', async () => {
            const user = document.getElementById('admin-user').value.trim();
            const pass = document.getElementById('admin-pass').value.trim();
            const errorText = document.getElementById('admin-create-error');
            const successText = document.getElementById('admin-create-success');

            errorText.style.display = 'none';
            successText.style.display = 'none';

            // اعتبارسنجی: حروف و عدد (عدد اختیاری)
            const validRegex = /^[a-zA-Z0-9]+$/;

            if(!validRegex.test(user)) {
                errorText.innerText = "Username: Only letters and numbers allowed.";
                errorText.style.display = 'block';
                return;
            }
            if(!validRegex.test(pass)) {
                errorText.innerText = "Password: Only letters and numbers allowed.";
                errorText.style.display = 'block';
                return;
            }

            createAdminBtn.innerText = "Creating...";
            createAdminBtn.disabled = true;

            const { error } = await supabaseClient
                .from('admins')
                .insert([{ username: user, password: pass }]);

            createAdminBtn.innerText = "Create Admin";
            createAdminBtn.disabled = false;

            if(error) {
                errorText.innerText = "Error: " + error.message;
                errorText.style.display = 'block';
            } else {
                successText.style.display = 'block';
                document.getElementById('admin-user').value = '';
                document.getElementById('admin-pass').value = '';
            }
        });
    }

    // ============================================
    // C. باشگاه مشتریان (Customer Club)
    // ============================================
    window.switchCustomerTab = function(type, tabElement) {
        // مدیریت استایل تب‌ها
        document.querySelectorAll('#customer-club .nav-tab').forEach(t => t.classList.remove('active-tab'));
        tabElement.classList.add('active-tab');

        if(type === 'all') loadAllCustomers();
        else loadLoyalCustomers();
    }

    async function loadAllCustomers() {
        const list = document.getElementById('customer-list');
        const header = document.getElementById('customer-header');
        
        // تغییر هدر جدول
        header.innerHTML = `
            <span style="flex:1">First Name & Last Name</span>
            <span style="flex:1">Phone Number</span>
            <span style="flex:1; text-align:right;">Joined Date</span>
        `;
        list.innerHTML = '<p style="padding:15px; color:#aaa;">Loading...</p>';

        const { data, error } = await supabaseClient
            .from('customers')
            .select('*')
            .order('created_at', { ascending: false });

        list.innerHTML = '';
        if(error || !data.length) {
            list.innerHTML = '<p style="padding:15px;">No customers found.</p>';
            return;
        }

        data.forEach(c => {
            const date = new Date(c.created_at).toLocaleDateString();
            list.innerHTML += `
                <div class="list-row">
                    <span style="flex:1; font-weight:500;">${c.name}</span>
                    <span style="flex:1; color:#555;">${c.phone || '-'}</span>
                    <span style="flex:1; text-align:right; color:#888;">${date}</span>
                </div>
            `;
        });
    }

    async function loadLoyalCustomers() {
        const list = document.getElementById('customer-list');
        const header = document.getElementById('customer-header');

        // تغییر هدر برای مشتریان ثابت
        header.innerHTML = `
            <span style="flex:1.5">Customer Info</span>
            <span style="flex:1">Orders</span>
            <span style="flex:1; text-align:right;">Total Spent</span>
        `;
        list.innerHTML = '<p style="padding:15px; color:#aaa;">Loading Loyal Customers...</p>';

        // استفاده از View که در SQL ساختیم
        const { data, error } = await supabaseClient
            .from('loyal_customers_view')
            .select('*');

        list.innerHTML = '';
        if(error) {
            console.error(error);
            list.innerHTML = '<p style="padding:15px; color:red;">Error loading data.</p>';
            return;
        }
        if(!data || !data.length) {
            list.innerHTML = '<p style="padding:15px;">No loyal customers yet (>3 orders).</p>';
            return;
        }

        data.forEach(c => {
            list.innerHTML += `
                <div class="list-row">
                    <div style="flex:1.5">
                        <div style="font-weight:600; color:#2A2A2A;">${c.name}</div>
                        <div style="font-size:12px; color:#888;">${c.phone}</div>
                    </div>
                    <span style="flex:1; font-weight:500; color:#FF724C;">${c.order_count} Orders</span>
                    <span style="flex:1; text-align:right; font-weight:bold;">$${c.total_spent}</span>
                </div>
            `;
        });
    }

    // ============================================
    // D. گزارشات فروش (Sales Reports)
    // ============================================
    
    // تابع فیلتر دستی
    const filterBtn = document.getElementById('filter-report-btn');
    if(filterBtn) {
        filterBtn.addEventListener('click', () => {
            const start = document.getElementById('start-date').value;
            const end = document.getElementById('end-date').value;
            if(!start || !end) {
                alert("Please select both start and end dates.");
                return;
            }
            fetchReport(start, end);
        });
    }

    // تابع فیلتر سریع (1 روز، 7 روز و...)
    window.quickReport = function(days) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        fetchReport(startDate.toISOString(), endDate.toISOString());
    }

    async function fetchReport(startStr, endStr) {
        // تنظیم زمان دقیق برای پوشش کامل روز آخر
        const start = new Date(startStr); // 00:00:00
        const end = new Date(endStr);
        end.setHours(23, 59, 59, 999); // پایان روز

        const { data, error } = await supabaseClient
            .from('orders')
            .select('total_amount')
            .eq('status', 'completed')
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString());

        if(!error && data) {
            const count = data.length;
            const total = data.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
            
            document.getElementById('report-orders').innerText = count;
            document.getElementById('report-revenue').innerText = '$' + total.toLocaleString();
        } else {
            console.error(error);
        }
    }

    // ============================================
    // E. پیام‌ها (Messages)
    // ============================================
    async function loadMessages() {
        const container = document.getElementById('messages-container');
        container.innerHTML = '<p style="padding:15px; color:#aaa;">Loading...</p>';

        const { data, error } = await supabaseClient
            .from('messages')
            .select('*')
            .order('created_at', { ascending: false });

        container.innerHTML = '';
        if(error || !data.length) {
            container.innerHTML = '<p style="padding:15px;">No messages.</p>';
            return;
        }

        data.forEach(msg => {
            const time = new Date(msg.created_at).toLocaleString();
            container.innerHTML += `
                <div class="list-row" style="flex-direction:column; align-items:flex-start; gap:5px;">
                    <div style="display:flex; justify-content:space-between; width:100%;">
                        <span style="font-weight:700; color:#FF724C;">${msg.title}</span>
                        <span style="font-size:11px; color:#aaa;">${time}</span>
                    </div>
                    <p style="font-size:13px; color:#555; margin:0;">${msg.body}</p>
                </div>
            `;
        });
    }

    // ============================================
    // F. مدیریت کارکنان (کد قبلی شما - برای اینکه پاک نشود)
    // ============================================
    loadStaffList();
    const createStaffBtn = document.getElementById('create-btn');
    if (createStaffBtn) {
        createStaffBtn.addEventListener('click', async () => {
            const u = document.getElementById('new-user').value;
            const p = document.getElementById('new-pass').value;
            // ساده‌سازی شده برای جلوگیری از تداخل با کدهای جدید
            if(u && p) {
                await supabaseClient.from('staff').insert([{ username: u, password: p }]);
                loadStaffList();
                document.getElementById('new-user').value = '';
                document.getElementById('new-pass').value = '';
                document.getElementById('staff-success').style.display = 'block';
            }
        });
    }

    async function loadStaffList() {
        const c = document.getElementById('staff-container');
        if(!c) return;
        const { data } = await supabaseClient.from('staff').select('*');
        if(data) {
            c.innerHTML = '';
            data.forEach(user => {
                c.innerHTML += `
                <div class="staff-item">
                    <span>${user.username}</span>
                    <button class="btn-action btn-delete" onclick="deleteUser(${user.id})">Delete</button>
                </div>`;
            });
        }
    }
    window.deleteUser = async (id) => {
        if(confirm('Delete?')) {
            await supabaseClient.from('staff').delete().eq('id', id);
            loadStaffList();
        }
    }
});

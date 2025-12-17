document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. مدیریت منوی سایدبار (Sidebar Menu) ---
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            // اگر دکمه Logout بود
            if (item.classList.contains('logout')) {
                const confirmLogout = confirm("Are you sure you want to logout?");
                if (confirmLogout) {
                    alert("Logged out successfully!");
                }
                return;
            }

            // برداشتن کلاس فعال از همه و دادن به آیتم کلیک شده
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // --- 2. مدیریت دکمه‌های کارت سفارش (Accept / Reject) ---
    const orderGrid = document.querySelector('.order-grid');

    // استفاده از Event Delegation برای دکمه‌هایی که ممکن است بعداً اضافه شوند
    orderGrid.addEventListener('click', (e) => {
        const target = e.target;
        
        // پیدا کردن دکمه کلیک شده (با توجه به اینکه ممکن است روی آیکون داخل دکمه کلیک شود)
        const acceptBtn = target.closest('.btn-check');
        const rejectBtn = target.closest('.btn-close');

        if (acceptBtn || rejectBtn) {
            // پیدا کردن کارت مربوطه
            const card = target.closest('.card');
            const footer = card.querySelector('.card-footer');
            const actionsDiv = footer.querySelector('.actions');

            if (acceptBtn) {
                // تغییر وضعیت به تکمیل شده
                actionsDiv.remove(); // حذف دکمه‌ها
                const badge = document.createElement('div');
                badge.className = 'status-badge badge-completed';
                badge.innerHTML = '<i class="ri-check-line"></i> COMPLETED';
                footer.appendChild(badge);
                
                // تغییر رنگ تب بالا (اختیاری - برای هماهنگی بیشتر)
                updateTopTabStatus(card, 'green');

            } else if (rejectBtn) {
                // تغییر وضعیت به رد شده
                actionsDiv.remove(); // حذف دکمه‌ها
                const badge = document.createElement('div');
                badge.className = 'status-badge badge-rejected';
                badge.innerHTML = '<i class="ri-close-line"></i> REJECTED';
                footer.appendChild(badge);

                // تغییر رنگ تب بالا
                updateTopTabStatus(card, 'red');
            }
        }
    });

    // --- 3. قابلیت جستجو (Live Search) ---
    const searchInput = document.querySelector('.search-bar input');
    
    searchInput.addEventListener('input', (e) => {
        const searchText = e.target.value.toLowerCase();
        const cards = document.querySelectorAll('.card');

        cards.forEach(card => {
            // جستجو در شماره سفارش و نام غذاها
            const orderId = card.querySelector('.order-id').innerText.toLowerCase();
            const foodNames = Array.from(card.querySelectorAll('.food-info h4'))
                                   .map(h => h.innerText.toLowerCase())
                                   .join(' ');
            
            if (orderId.includes(searchText) || foodNames.includes(searchText)) {
                card.style.display = 'block'; // نمایش
            } else {
                card.style.display = 'none'; // مخفی کردن
            }
        });
    });

    // --- 4. فیلتر کردن با تب‌های بالا (Status Tabs) ---
    const tabs = document.querySelectorAll('.status-tabs .tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // گرفتن شماره سفارش از متن تب (مثلا #351)
            const tabOrderId = tab.innerText.trim();
            const cards = document.querySelectorAll('.card');
            
            // برداشتن استایل فعال از بقیه تب‌ها (اختیاری: فقط برای افکت بصری)
            tabs.forEach(t => t.style.opacity = '0.5');
            tab.style.opacity = '1';

            // اگر روی تبی کلیک شد، فقط کارت مربوط به آن نشان داده شود
            // اگر دوباره کلیک شد، همه نشان داده شوند (Toggle)
            if (tab.classList.contains('active-filter')) {
                // ریست کردن فیلتر
                cards.forEach(c => c.style.display = 'block');
                tabs.forEach(t => {
                    t.style.opacity = '1';
                    t.classList.remove('active-filter');
                });
            } else {
                // اعمال فیلتر
                tabs.forEach(t => t.classList.remove('active-filter'));
                tab.classList.add('active-filter');
                
                cards.forEach(card => {
                    const cardOrderId = card.querySelector('.order-id').innerText;
                    if (cardOrderId.includes(tabOrderId)) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
            }
        });
    });

    // تابع کمکی برای آپدیت رنگ تب‌های بالا وقتی دکمه کارت زده می‌شود
    function updateTopTabStatus(cardElement, colorClass) {
        const orderIdText = cardElement.querySelector('.order-id').innerText; // e.g., "Order #351"
        const idOnly = orderIdText.replace('Order ', '').trim(); // "#351"
        
        const matchingTab = Array.from(tabs).find(t => t.innerText.includes(idOnly));
        
        if (matchingTab) {
            // حذف کلاس‌های رنگی قبلی
            matchingTab.classList.remove('green', 'red', 'orange');
            // اضافه کردن کلاس جدید
            matchingTab.classList.add(colorClass);
            
            // اضافه کردن آیکون مناسب
            const iconClass = colorClass === 'green' ? 'ri-check-line' : 'ri-close-line';
            if (!matchingTab.querySelector('i')) {
                matchingTab.innerHTML = `<i class="${iconClass}"></i> ${matchingTab.innerText}`;
            } else {
                matchingTab.querySelector('i').className = iconClass;
            }
        }
    }

    // --- 5. دکمه نوتیفیکیشن ---
    const notifBtn = document.querySelector('.ri-notification-3-line');
    if(notifBtn) {
        notifBtn.style.cursor = 'pointer';
        notifBtn.addEventListener('click', () => {
            alert("You have 3 new orders pending!");
        });
    }

});

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. مدیریت سایدبار (Sidebar Navigation) ---
    const menuItems = document.querySelectorAll('.sidebar .menu-item:not(.logout)');
    
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            // حذف کلاس active از همه آیتم‌ها
            menuItems.forEach(i => i.classList.remove('active'));
            // افزودن کلاس active به آیتم کلیک شده
            item.classList.add('active');
        });
    });

    // --- 2. مدیریت دکمه خروج (Logout) ---
    const logoutBtn = document.querySelector('.logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            const confirmLogout = confirm("Are you sure you want to logout?");
            if (confirmLogout) {
                alert("Logged out successfully!");
                // اینجا می‌توانید کد ریدارکت به صفحه لاگین را قرار دهید
                // window.location.href = 'login.html';
            }
        });
    }

    // --- 3. مدیریت سبد خرید (Add to Cart) ---
    const cartBtns = document.querySelectorAll('.btn-add');
    const cartBadge = document.querySelector('.cart-btn .badge');
    let cartCount = 2; // شروع از عددی که در HTML بود

    cartBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // انیمیشن ساده برای دکمه
            const originalText = this.innerHTML;
            
            // جلوگیری از کلیک‌های پشت سر هم سریع
            if(this.classList.contains('added')) return;

            // افزایش تعداد سبد خرید
            cartCount++;
            cartBadge.textContent = cartCount;
            
            // تغییر ظاهر دکمه به "Added"
            this.innerHTML = '<i class="ri-check-line"></i> Added';
            this.style.backgroundColor = '#2ECC71'; // رنگ سبز
            this.style.color = '#fff';
            this.classList.add('added');

            // انیمیشن کوچک برای آیکون سبد خرید بالا
            const cartIcon = document.querySelector('.cart-btn i');
            cartIcon.style.transform = 'scale(1.3)';
            setTimeout(() => {
                cartIcon.style.transform = 'scale(1)';
            }, 200);

            // بازگرداندن دکمه به حالت اول بعد از 2 ثانیه
            setTimeout(() => {
                this.innerHTML = originalText;
                this.style.backgroundColor = ''; // بازگشت به رنگ اصلی (از CSS)
                this.style.color = '';
                this.classList.remove('added');
            }, 2000);
        });
    });

    // --- 4. فیلتر کردن دسته‌بندی‌ها (Categories Tabs) ---
    const categoryTabs = document.querySelectorAll('.menu-categories .tab');
    const menuCards = document.querySelectorAll('.menu-card');

    categoryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // مدیریت استایل تب فعال
            categoryTabs.forEach(t => t.classList.remove('active-cat'));
            tab.classList.add('active-cat');

            const category = tab.innerText.trim().toLowerCase();

            menuCards.forEach(card => {
                // دریافت نام غذا و توضیحات برای مقایسه
                const title = card.querySelector('h4').innerText.toLowerCase();
                const desc = card.querySelector('.menu-desc').innerText.toLowerCase();
                
                // منطق فیلتر:
                // اگر تب "All" باشد همه را نشان بده
                // در غیر این صورت، چک کن آیا عنوان یا توضیحات شامل کلمه دسته‌بندی هست یا نه
                if (category === 'all' || title.includes(category) || desc.includes(category)) {
                    card.style.display = 'flex';
                    // اضافه کردن انیمیشن محو شدن برای زیبایی
                    card.style.opacity = '0';
                    setTimeout(() => card.style.opacity = '1', 50);
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // --- 5. جستجو (Search Bar) ---
    const searchInput = document.querySelector('.search-bar input');

    searchInput.addEventListener('input', (e) => {
        const searchText = e.target.value.toLowerCase();

        menuCards.forEach(card => {
            const title = card.querySelector('h4').innerText.toLowerCase();
            const desc = card.querySelector('.menu-desc').innerText.toLowerCase();

            if (title.includes(searchText) || desc.includes(searchText)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    });
});

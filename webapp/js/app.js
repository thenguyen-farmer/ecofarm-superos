// MAIN ENTRY POINT
$(document).ready(function() {
    if (!CoreModule.init()) return;

    initApp();

    // Map Resize Fix
    const mapTab = document.querySelector('button[data-bs-target="#map-view"]');
    if (mapTab) {
        mapTab.addEventListener('shown.bs.tab', function () {
            if (MapModule.map) setTimeout(() => MapModule.map.invalidateSize(), 100);
        });
    }
});

async function initApp() {
    CoreModule.showLoading('Đang tải dữ liệu...');
    
    // Default Empty Data (in case of failure)
    let trees = [], staff = [], jobs = [], expenses = [], inventory = [], finance = [], knowledge = [];

    try {
        // Parallel Loading for Speed
        const results = await Promise.all([
            CoreModule.supabase.from('Nhan_Su').select('*'),
            CoreModule.supabase.from('Cau_Hinh_Cong_Viec').select('*'),
            CoreModule.supabase.from('Cau_Hinh_Chi_Phi').select('*'),
            CoreModule.supabase.from('Kho_Vat_Tu').select('*'),
            CoreModule.supabase.from('Ban_Do_So').select('*'),
            CoreModule.supabase.from('Tai_Chinh').select('*').order('ngay', { ascending: false }).limit(50),
            CoreModule.supabase.from('Kho_Tri_Thuc').select('*')
        ]);
        
        // Assign Data
        staff = results[0].data || [];
        jobs = results[1].data || [];
        expenses = results[2].data || [];
        inventory = results[3].data || [];
        trees = results[4].data || [];
        finance = results[5].data || [];
        knowledge = results[6].data || [];

    } catch (e) {
        console.error(e);
        // Do not block UI on error, just alert
        CoreModule.toast('error', 'Lỗi kết nối CSDL: ' + e.message);
    } finally {
        // ALWAYS Initialize Modules (even with empty data) to ensure UI renders
        DashboardModule.init(trees, staff, inventory, finance);
        MapModule.init(trees);
        HRMModule.init(staff, jobs);
        FinanceModule.init(expenses);
        ChatbotModule.init();
        
        // Render Config Tables
        ConfigModule.renderStaffTable(staff);
        ConfigModule.renderJobTable(jobs);
        ConfigModule.renderExpenseTable(expenses);
        ConfigModule.renderKnowledgeTable(knowledge);

        CoreModule.hideLoading();
    }
}

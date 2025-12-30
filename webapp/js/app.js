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
    try {
        // Parallel Loading for Speed
        const [
            { data: staff },
            { data: jobs },
            { data: expenses },
            { data: inventory },
            { data: trees },
            { data: finance },
            { data: knowledge }
        ] = await Promise.all([
            CoreModule.supabase.from('Nhan_Su').select('*'),
            CoreModule.supabase.from('Cau_Hinh_Cong_Viec').select('*'),
            CoreModule.supabase.from('Cau_Hinh_Chi_Phi').select('*'),
            CoreModule.supabase.from('Kho_Vat_Tu').select('*'),
            CoreModule.supabase.from('Ban_Do_So').select('*'),
            CoreModule.supabase.from('Tai_Chinh').select('*').order('ngay', { ascending: false }).limit(50),
            CoreModule.supabase.from('Kho_Tri_Thuc').select('*')
        ]);

        // Initialize Modules
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

    } catch (e) {
        console.error(e);
        CoreModule.toast('error', 'Lỗi khởi động: ' + e.message);
    } finally {
        CoreModule.hideLoading();
    }
}

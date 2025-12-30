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
        const { data: staff } = await CoreModule.supabase.from('Nhan_Su').select('*');
        const { data: jobs } = await CoreModule.supabase.from('Cau_Hinh_Cong_Viec').select('*');
        const { data: expenses } = await CoreModule.supabase.from('Cau_Hinh_Chi_Phi').select('*');
        const { data: inventory } = await CoreModule.supabase.from('Kho_Vat_Tu').select('*');
        const { data: trees } = await CoreModule.supabase.from('Ban_Do_So').select('*');
        const { data: finance } = await CoreModule.supabase.from('Tai_Chinh').select('*').order('ngay', { ascending: false }).limit(50);
        const { data: knowledge } = await CoreModule.supabase.from('Kho_Tri_Thuc').select('*');

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

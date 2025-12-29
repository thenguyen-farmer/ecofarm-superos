// CONFIGURATION
// Bạn sẽ lấy các thông tin này từ Supabase Dashboard -> Project Settings -> API
const SUPABASE_URL = 'https://aybopfqltybsfbqpxrsu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5Ym9wZnFsdHlic2ZicXB4cnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5OTM0ODgsImV4cCI6MjA4MjU2OTQ4OH0.O9Su4haSDqay3jfjz7SYUab3bPQ2TzX4YGH9omlWj34';

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let mapInstance = null;

$(document).ready(function() {
    initApp();
});

async function initApp() {
    $('#loading-overlay').fadeIn();
    try {
        // 1. Check Connection & Fetch Configs
        const { data: staff, error: errStaff } = await supabase.from('Nhan_Su').select('*');
        if (errStaff) throw errStaff;
        
        const { data: trees, error: errTree } = await supabase.from('Ban_Do_So').select('*');
        if (errTree) throw errTree;

        const { data: inv } = await supabase.from('Kho_Vat_Tu').select('*');
        const { data: fin } = await supabase.from('Tai_Chinh').select('*').limit(10).order('ngay', { ascending: false });

        // 2. Render UI
        $('#stat-tree').text(trees.length);
        $('#stat-staff').text(staff.length);
        $('#stat-inv').text(inv ? inv.length : 0);

        renderStaffTable(staff);
        renderFinanceTable(fin || []);
        initMap(trees);

    } catch (e) {
        console.error(e);
        alert("Lỗi kết nối Supabase: " + e.message + "\n\nHãy đảm bảo bạn đã điền URL và KEY trong file js/app.js");
    } finally {
        $('#loading-overlay').fadeOut();
    }
}

function renderStaffTable(staff) {
    const tbody = $('#table-staff tbody');
    tbody.empty();
    staff.forEach(s => {
        tbody.append(`<tr><td>${s.ten}</td><td>${s.chuc_vu}</td><td>${s.sdt}</td></tr>`);
    });
}

function renderFinanceTable(data) {
    const tbody = $('#table-finance tbody');
    tbody.empty();
    data.forEach(r => {
        tbody.append(`
            <tr>
                <td>${new Date(r.ngay).toLocaleDateString('vi-VN')}</td>
                <td>${r.loai}</td>
                <td>${Number(r.so_tien).toLocaleString()}</td>
                <td>${r.ghi_chu}</td>
            </tr>
        `);
    });
}

function initMap(trees) {
    if (mapInstance) mapInstance.remove();
    mapInstance = L.map('map').setView([10.7769, 106.7009], 18);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(mapInstance);

    trees.forEach(t => {
        const color = t.trang_thai === 'Tốt' ? 'green' : 'red';
        L.circleMarker([t.x, t.y], { color: color, radius: 8, fillOpacity: 0.8 }).addTo(mapInstance)
         .bindPopup(`<b>${t.loai}</b><br>${t.trang_thai}`);
    });
}

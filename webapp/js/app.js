let supabaseClient = null;
let mapInstance = null;
let mapMarkers = [];

// ====================================================================================================
// INITIALIZATION
// ====================================================================================================

$(document).ready(function() {
    // 1. Check Libraries
    if (typeof window.supabase === 'undefined' || typeof CONFIG === 'undefined') {
        alert("Lỗi: Không tải được thư viện hoặc file config.");
        $('#loading-overlay').fadeOut();
        return;
    }

    // 2. Check Config
    if (CONFIG.SUPABASE_URL.includes('YOUR_')) {
        $('#loading-overlay').fadeOut();
        alert("CHÀO MỪNG! Hãy mở file 'js/config.js' để điền API Key nhé.");
        return;
    }

    try {
        supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
    } catch (e) {
        alert("Lỗi kết nối: " + e.message);
        $('#loading-overlay').fadeOut();
        return;
    }

    initApp();
});

async function initApp() {
    $('#loading-overlay').fadeIn();
    try {
        // 1. Load Essential Data
        const { data: staff } = await supabaseClient.from('Nhan_Su').select('*');
        const { data: jobs } = await supabaseClient.from('Cau_Hinh_Cong_Viec').select('*');
        const { data: expenses } = await supabaseClient.from('Cau_Hinh_Chi_Phi').select('*');
        const { data: inventory } = await supabaseClient.from('Kho_Vat_Tu').select('*');
        const { data: trees } = await supabaseClient.from('Ban_Do_So').select('*');

        // 2. Render Modules
        ConfigModule.renderStaffTable(staff);
        ConfigModule.renderJobTable(jobs);
        ConfigModule.renderExpenseTable(expenses);
        
        HRMModule.init(staff, jobs);
        FinanceModule.init(expenses, inventory);
        MapModule.init(trees);
        
        // Fetch Revenue & Expenses for Charts
        const { data: financeData } = await supabaseClient.from('Tai_Chinh').select('*').order('ngay', { ascending: true });
        
        DashboardModule.init(trees, staff, inventory, financeData);
        ChatbotModule.init();
        WeatherModule.init();

    } catch (e) {
        console.error("Init Error:", e);
        // alert("Lỗi tải dữ liệu: " + e.message);
    } finally {
        $('#loading-overlay').fadeOut();
    }
}

// ====================================================================================================
// MODULE: WEATHER
// ====================================================================================================
const WeatherModule = {
    init: async function() {
        if (!CONFIG.OPENWEATHER_KEY || CONFIG.OPENWEATHER_KEY.includes('YOUR_')) {
            $('#weather-widget').html('<div class="alert alert-warning small">Chưa cấu hình API Thời tiết.</div>');
            return;
        }

        // Default: Ho Chi Minh City
        const lat = 10.7769, lon = 106.7009; 
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${CONFIG.OPENWEATHER_KEY}&units=metric&lang=vi`;

        try {
            const res = await fetch(url);
            const data = await res.json();
            
            if (data.cod !== 200) throw new Error(data.message);

            const iconUrl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
            $('#weather-widget').html(`
                <div class="d-flex align-items-center justify-content-center">
                    <img src="${iconUrl}" width="50">
                    <div class="text-start">
                        <h3 class="m-0">${Math.round(data.main.temp)}°C</h3>
                        <div class="small">${data.weather[0].description}</div>
                    </div>
                </div>
                <div class="row mt-2 small text-muted text-center">
                    <div class="col">💧 ${data.main.humidity}%</div>
                    <div class="col">💨 ${data.wind.speed} m/s</div>
                </div>
            `);
        } catch (e) {
            $('#weather-widget').html('<div class="small text-danger">Lỗi tải thời tiết.</div>');
        }
    }
};

// ====================================================================================================
// MODULE: DASHBOARD
// ====================================================================================================
const DashboardModule = {
    init: async function(trees, staff, inventory, financeData) {
        // 1. Stats
        $('#stat-tree').text(trees ? trees.length : 0);
        $('#stat-staff').text(staff ? staff.length : 0);
        $('#stat-inv').text(inventory ? inventory.length : 0);
        
        // 2. Chart
        this.renderChart(financeData);

        // 3. Tasks & Alerts
        const tasks = [];
        const alerts = [];
        const today = new Date();

        // Check Trees
        if (trees) {
            trees.forEach(t => {
                if (t.trang_thai !== 'Tốt') {
                    alerts.push(`Cây ${t.loai} (${t.trang_thai}) cần kiểm tra.`);
                }
                // Simple stage logic
                if (t.ngay_trong) {
                    const days = Math.floor((today - new Date(t.ngay_trong)) / (86400000));
                    if (t.giai_doan === 'Ra hoa' && days % 7 === 0) {
                        tasks.push(`Bón phân cho cây ${t.loai} (Ra hoa).`);
                    }
                }
            });
        }
        
        // Check Inventory
        if (inventory) {
            inventory.forEach(i => {
                if (i.so_luong_ton < 10) alerts.push(`Sắp hết: ${i.ten_vat_tu}`);
            });
        }

        // Render
        const taskList = $('#today-tasks');
        taskList.empty();
        if (tasks.length === 0) taskList.append('<li class="list-group-item bg-transparent">Không có việc cần làm.</li>');
        tasks.slice(0,5).forEach(t => taskList.append(`<li class="list-group-item bg-transparent"><i class="fas fa-check-circle text-success"></i> ${t}</li>`));

        const alertList = $('#dashboard-alerts');
        alertList.empty();
        if (alerts.length === 0) alertList.append('<li class="list-group-item text-muted">Hệ thống bình thường.</li>');
        alerts.slice(0,5).forEach(a => alertList.append(`<li class="list-group-item text-danger"><i class="fas fa-exclamation-triangle"></i> ${a}</li>`));
    },

    renderChart: function(data) {
        const ctx = document.getElementById('financeChart');
        if (!ctx || !data) return;

        // Group by Month (Simplification)
        const months = {};
        data.forEach(d => {
            const m = new Date(d.ngay).toLocaleDateString('vi-VN', { month: 'short' });
            if (!months[m]) months[m] = { thu: 0, chi: 0 };
            if (d.loai === 'Thu') months[m].thu += Number(d.so_tien);
            else months[m].chi += Number(d.so_tien);
        });

        const labels = Object.keys(months);
        const thuData = labels.map(l => months[l].thu);
        const chiData = labels.map(l => months[l].chi);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Thu', data: thuData, backgroundColor: '#2e7d32' },
                    { label: 'Chi', data: chiData, backgroundColor: '#c62828' }
                ]
            }
        });
    }
};

// ====================================================================================================
// MODULE: HRM (Human Resource Management)
// ====================================================================================================
const HRMModule = {
    staffList: [],
    jobList: [],

    init: async function(staff, jobs) {
        this.staffList = staff || [];
        this.jobList = jobs || [];
        
        this.renderStaffSelects();
        this.loadAttendanceHistory();
    },

    renderStaffSelects: function() {
        const container = $('#checkin-staff-list');
        container.empty();
        this.staffList.forEach(s => {
            container.append(`
                <div class="form-check">
                    <input class="form-check-input staff-check" type="checkbox" value="${s.id}" id="st_${s.id}">
                    <label class="form-check-label" for="st_${s.id}">${s.ten}</label>
                </div>
            `);
        });

        const jobSel = $('#checkin-job');
        jobSel.empty();
        this.jobList.forEach(j => {
            jobSel.append(`<option value="${j.ten_cong_viec}" data-price="${j.don_gia}">${j.ten_cong_viec} (${Number(j.don_gia).toLocaleString()}đ)</option>`);
        });
        
        // Salary Select
        const salSel = $('#salary-staff');
        salSel.empty().append('<option value="">-- Chọn NV --</option>');
        this.staffList.forEach(s => salSel.append(`<option value="${s.id}">${s.ten}</option>`));
    },

    submitBulkCheckin: async function() {
        const date = $('#checkin-date').val();
        if(!date) return alert("Chọn ngày!");
        
        const jobOption = $('#checkin-job option:selected');
        const jobName = jobOption.val();
        const price = jobOption.data('price');
        const bonus = Number($('#checkin-bonus').val()) || 0;
        const fine = Number($('#checkin-fine').val()) || 0;
        const rating = $('#checkin-rating').val();
        const note = $('#checkin-note').val();
        
        const selectedStaff = [];
        $('.staff-check:checked').each(function() { selectedStaff.push($(this).val()); });

        if (selectedStaff.length === 0) return alert("Chọn ít nhất 1 nhân viên");

        const rows = selectedStaff.map(id => ({
            ngay: date,
            id_nv: id,
            cong_viec: jobName,
            thanh_tien: price,
            thuong: bonus,
            phat: fine,
            diem: rating,
            ghi_chu: note,
            trang_thai_tt: 'Chua_TT'
        }));

        const { error } = await supabaseClient.from('Cham_Cong').insert(rows);
        if (error) alert("Lỗi: " + error.message);
        else {
            alert("Đã lưu chấm công!");
            this.loadAttendanceHistory();
            this.checkTotalDebt();
        }
    },

    loadAttendanceHistory: async function() {
        const { data } = await supabaseClient.from('Cham_Cong').select(`*, Nhan_Su(ten)`).order('ngay', {ascending: false}).limit(20);
        const tbody = $('#table-attendance tbody');
        tbody.empty();
        if (data) {
            data.forEach(r => {
                const status = r.trang_thai_tt === 'Da_TT' ? '<span class="badge bg-success">Đã Trả</span>' : '<span class="badge bg-warning">Chưa Trả</span>';
                tbody.append(`<tr><td>${new Date(r.ngay).toLocaleDateString()}</td><td>${r.Nhan_Su?.ten}</td><td>${r.cong_viec}</td><td>${Number(r.thanh_tien).toLocaleString()}</td><td>${status}</td></tr>`);
            });
        }
    },
    
    checkUnpaidSalary: async function() {
        const id = $('#salary-staff').val();
        if(!id) return;
        
        const { data } = await supabaseClient.from('Cham_Cong').select('id, thanh_tien, thuong, phat').eq('id_nv', id).eq('trang_thai_tt', 'Chua_TT');
        
        if (data && data.length > 0) {
            let total = 0;
            data.forEach(r => total += (r.thanh_tien + (r.thuong||0) - (r.phat||0)));
            $('#salary-info').html(`Nợ lương: <b>${total.toLocaleString()} đ</b> (${data.length} công)`);
            $('#btn-pay-salary').prop('disabled', false).data('total', total).data('ids', data.map(d=>d.id));
        } else {
            $('#salary-info').text("Không có nợ lương.");
            $('#btn-pay-salary').prop('disabled', true);
        }
    },
    
    paySalary: async function() {
        const staffId = $('#salary-staff').val();
        const staffName = $('#salary-staff option:selected').text();
        const total = $('#btn-pay-salary').data('total');
        const ids = $('#btn-pay-salary').data('ids'); // Array of attendance IDs
        
        // 1. Create Finance Record
        const { error: finErr } = await supabaseClient.from('Tai_Chinh').insert({
            loai: 'Chi',
            hang_muc: 'Tra_Luong',
            so_tien: total,
            ghi_chu: `Trả lương cho ${staffName}`,
            id_lien_quan: JSON.stringify(ids)
        });
        
        if (finErr) return alert("Lỗi tạo phiếu chi: " + finErr.message);
        
        // 2. Update Attendance
        const { error: upErr } = await supabaseClient.from('Cham_Cong').update({ trang_thai_tt: 'Da_TT' }).in('id', ids);
        
        if (upErr) alert("Lỗi cập nhật chấm công (nhưng đã tạo phiếu chi): " + upErr.message);
        else {
            alert("Thanh toán thành công!");
            this.checkUnpaidSalary(); // Refresh
            this.loadAttendanceHistory();
            this.checkTotalDebt();
        }
    },

    renderSalaryReport: async function() {
        // Default to current month if not set
        let val = $('#salary-month').val();
        if (!val) {
            const now = new Date();
            val = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
            $('#salary-month').val(val);
        }
        // val format: YYYY-MM
        const start = `${val}-01`;
        const [y, m] = val.split('-').map(Number);
        const lastDay = new Date(y, m, 0).getDate(); // Get last day of month
        const end = `${val}-${lastDay}`;
        
        const { data, error } = await supabaseClient.from('Cham_Cong')
            .select(`*, Nhan_Su(ten)`)
            .gte('ngay', start)
            .lte('ngay', end);
            
        if (error) {
            console.error("Report Error", error);
            return;
        }

        const report = {}; // Map: StaffName -> { days, bonus, fine, total, paid }
        
        if (data) {
            data.forEach(r => {
                const name = r.Nhan_Su?.ten || 'Unknown';
                if (!report[name]) report[name] = { days: 0, bonus: 0, fine: 0, total: 0, paid: 0 };
                
                // Formula: Base + Bonus - Fine
                const realIncome = (r.thanh_tien || 0) + (r.thuong || 0) - (r.phat || 0);
                
                report[name].days++;
                report[name].bonus += (r.thuong || 0);
                report[name].fine += (r.phat || 0);
                report[name].total += realIncome;
                
                if (r.trang_thai_tt === 'Da_TT') {
                    report[name].paid += realIncome;
                }
            });
        }
        
        const tbody = $('#table-salary-report tbody');
        tbody.empty();
        
        if (Object.keys(report).length === 0) {
            tbody.append('<tr><td colspan="5" class="text-center text-muted">Không có dữ liệu tháng này.</td></tr>');
            return;
        }

        Object.keys(report).forEach(name => {
            const r = report[name];
            // Status: If Paid >= Total (allow tiny floating point diff), it's done.
            const isPaid = r.paid >= r.total;
            const status = isPaid ? '<span class="badge bg-success">Đã TT</span>' : `<span class="badge bg-danger">Nợ ${(r.total - r.paid).toLocaleString()}</span>`;
            
            tbody.append(`
                <tr>
                    <td>${name}</td>
                    <td>${r.days}</td>
                    <td><span class="text-success">+${r.bonus.toLocaleString()}</span> / <span class="text-danger">-${r.fine.toLocaleString()}</span></td>
                    <td class="fw-bold">${r.total.toLocaleString()}</td>
                    <td>${status}</td>
                </tr>
            `);
        });
    }
};

// ====================================================================================================
// MODULE: FINANCE
// ====================================================================================================
const FinanceModule = {
    init: async function(expenses, inventory) {
        // Render Expense Types
        const sel = $('#expense-type');
        sel.empty();
        if(expenses) expenses.forEach(e => sel.append(`<option value="${e.ten_loai_chi}" data-group="${e.nhom}">${e.ten_loai_chi}</option>`));
        
        this.loadHistory();
    },
    
    submitExpense: async function() {
        const typeOption = $('#expense-type option:selected');
        const item = typeOption.val();
        const group = typeOption.data('group');
        const qty = Number($('#expense-qty').val()) || 0;
        const price = Number($('#expense-price').val()) || 0;
        const total = qty * price || Number($('#expense-amount-manual').val()); // Fallback if manually entered
        
        // 1. Create Expense
        const { error } = await supabaseClient.from('Tai_Chinh').insert({
            loai: 'Chi',
            hang_muc: item,
            nhom: group,
            so_luong: qty,
            don_gia: price,
            so_tien: total,
            ghi_chu: $('#expense-note').val()
        });
        
        if (error) return alert("Lỗi: " + error.message);
        
        // 2. Auto Inventory Update
        if (group === 'Vật tư' && qty > 0) {
            // Find item by name (simple logic)
            const { data: exist } = await supabaseClient.from('Kho_Vat_Tu').select('*').eq('ten_vat_tu', item).single();
            if (exist) {
                await supabaseClient.from('Kho_Vat_Tu').update({ so_luong_ton: exist.so_luong_ton + qty }).eq('id', exist.id);
            }
        }
        
        alert("Đã lưu chi phí.");
        this.loadHistory();
    },
    
    loadHistory: async function() {
        const { data } = await supabaseClient.from('Tai_Chinh').select('*').order('ngay', {ascending: false}).limit(20);
        const tbody = $('#table-finance tbody');
        tbody.empty();
        if(data) {
            data.forEach(r => {
                 const color = r.loai === 'Thu' ? 'text-success' : 'text-danger';
                 tbody.append(`<tr><td>${new Date(r.ngay).toLocaleDateString()}</td><td>${r.loai}</td><td>${r.hang_muc}</td><td class="${color}">${Number(r.so_tien).toLocaleString()}</td><td>${r.ghi_chu}</td></tr>`);
            });
        }
    },

    submitRevenue: async function() {
        const type = $('#rev-type').val();
        const qty = Number($('#rev-qty').val());
        const price = Number($('#rev-price').val());
        const total = qty * price;

        if (!type || !qty || !price) return alert("Vui lòng nhập đủ thông tin.");

        // 1. Add to Nguon_Thu
        const { data: rev, error } = await supabaseClient.from('Nguon_Thu').insert({
            loai_nong_san: type,
            so_luong: qty,
            don_gia: price,
            thanh_tien: total,
            ghi_chu: ''
        }).select();

        if (error) return alert("Lỗi: " + error.message);

        // 2. Add to Tai_Chinh (Cash Flow)
        await supabaseClient.from('Tai_Chinh').insert({
            loai: 'Thu',
            hang_muc: type,
            so_luong: qty,
            don_gia: price,
            so_tien: total,
            ghi_chu: 'Thu hoạch bán nông sản',
            id_lien_quan: rev[0].id
        });

        alert("Đã ghi nhận doanh thu!");
        this.loadHistory();
    }
};

// ====================================================================================================
// MODULE: MAP
// ====================================================================================================
const MapModule = {
    init: function(trees) {
        if (mapInstance) mapInstance.remove();
        
        // Default View or Center on First Tree
        let center = [10.7769, 106.7009];
        if (trees && trees.length > 0) {
            center = [trees[0].x, trees[0].y];
        }

        mapInstance = L.map('map').setView(center, 19);
        
        // Use Google Hybrid if Configured, else fallback
        L.tileLayer(CONFIG.MAP_TILE_URL, {
            maxZoom: 22,
            attribution: CONFIG.MAP_ATTRIBUTION
        }).addTo(mapInstance);
        
        // Locate Me Button
        L.control.locate = L.Control.extend({
            onAdd: function(map) {
                const btn = L.DomUtil.create('button', 'btn btn-light btn-sm mt-2 ms-2');
                btn.innerHTML = '<i class="fas fa-crosshairs"></i>';
                btn.onclick = () => {
                    map.locate({setView: true, maxZoom: 20});
                };
                return btn;
            }
        });
        new L.control.locate({ position: 'topleft' }).addTo(mapInstance);

        // Render Trees
        if (trees) {
            trees.forEach(t => {
                let color = 'green';
                if (t.trang_thai === 'Bệnh') color = 'red';
                if (t.trang_thai === 'Cần nước') color = 'blue';
                
                // Draggable Marker for Edit Position
                const marker = L.circleMarker([t.x, t.y], { color: color, radius: 8, fillOpacity: 0.9, draggable: true }).addTo(mapInstance);
                
                // Popup with Edit/Delete
                const popupContent = `
                    <b>${t.loai}</b><br>
                    Trạng thái: ${t.trang_thai}<br>
                    Giai đoạn: ${t.giai_doan || '?'}<br>
                    <div class="mt-2 btn-group btn-group-sm">
                        <button class="btn btn-warning" onclick="MapModule.editTree('${t.id}', '${t.loai}', '${t.trang_thai}', '${t.giai_doan}')">Sửa</button>
                        <button class="btn btn-danger" onclick="MapModule.deleteTree('${t.id}')">Xóa</button>
                    </div>
                `;
                marker.bindPopup(popupContent);
            });
        }

        // Map Click to Add Tree
        mapInstance.on('click', function(e) {
            if (confirm("Thêm cây mới tại đây?")) {
                MapModule.addTree(e.latlng.lat, e.latlng.lng);
            }
        });
    },

    addTree: async function(lat, lng) {
        const type = prompt("Loại cây (VD: Sầu riêng):", "Sầu riêng");
        if (!type) return;
        
        const { error } = await supabaseClient.from('Ban_Do_So').insert({
            loai: type,
            x: lat,
            y: lng,
            trang_thai: 'Tốt',
            giai_doan: 'Cây con',
            ngay_trong: new Date()
        });

        if (error) alert("Lỗi thêm cây: " + error.message);
        else {
            alert("Đã thêm cây! (Kéo thả chấm tròn để chỉnh lại vị trí)");
            location.reload();
        }
    },

    editTree: async function(id, oldName, oldStatus, oldStage) {
        const name = prompt("Tên cây:", oldName);
        if (!name) return;
        const status = prompt("Trạng thái (Tốt/Bệnh/Cần nước):", oldStatus);
        const stage = prompt("Giai đoạn (Cây con/Ra hoa/Thu hoạch):", oldStage);

        const { error } = await supabaseClient.from('Ban_Do_So').update({ 
            loai: name, 
            trang_thai: status,
            giai_doan: stage 
        }).eq('id', id);

        if (error) alert("Lỗi sửa: " + error.message);
        else {
            alert("Cập nhật thành công!");
            location.reload();
        }
    },

    deleteTree: async function(id) {
        if (!confirm("Bạn chắc chắn muốn xóa cây này?")) return;
        const { error } = await supabaseClient.from('Ban_Do_So').delete().eq('id', id);
        if (error) alert("Lỗi xóa: " + error.message);
        else {
            alert("Đã xóa cây.");
            location.reload();
        }
    }
};

// ====================================================================================================
// MODULE: CHATBOT (Gemini Vision)
// ====================================================================================================
const ChatbotModule = {
    init: function() {
        $('#chat-history').append(`<div class="chat-msg chat-bot">Xin chào! Gửi ảnh hoặc câu hỏi để tôi hỗ trợ nhé.</div>`);
    },
    
    previewImage: function() {
        const file = document.getElementById('chat-img').files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                $('#img-preview').attr('src', e.target.result);
                $('#chat-preview').show();
            }
            reader.readAsDataURL(file);
        }
    },
    
    clearImage: function() {
        $('#chat-img').val('');
        $('#chat-preview').hide();
    },

    sendChat: async function() {
        const input = $('#chat-input');
        const msg = input.val();
        const fileInput = document.getElementById('chat-img');
        const file = fileInput.files[0];
        
        if (!msg && !file) return;

        // UI User Msg
        let userHtml = `<div class="chat-msg chat-user">`;
        if (file) {
            const base64 = await this.fileToBase64(file);
            userHtml += `<img src="${base64}" style="max-width:100%; border-radius:5px"><br>`;
        }
        userHtml += `${msg}</div>`;
        $('#chat-history').append(userHtml);
        
        input.val('');
        this.clearImage();
        $('#chat-history').append(`<div class="chat-msg chat-bot" id="chat-loading">...</div>`);
        const chatBox = document.getElementById('chat-history');
        chatBox.scrollTop = chatBox.scrollHeight;

        // Call Gemini
        try {
            const reply = await this.callGemini(msg, file);
            $('#chat-loading').remove();
            $('#chat-history').append(`<div class="chat-msg chat-bot">${reply}</div>`);
        } catch (e) {
            $('#chat-loading').remove();
            $('#chat-history').append(`<div class="chat-msg chat-bot text-danger">Lỗi AI: ${e.message}</div>`);
        }
        chatBox.scrollTop = chatBox.scrollHeight;
    },

    fileToBase64: (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    }),

    callGemini: async function(text, file) {
        if (!CONFIG.GEMINI_KEY || CONFIG.GEMINI_KEY.includes('YOUR_')) return "Vui lòng cấu hình GEMINI_KEY trong file config.js";

        // Fetch System Prompt
        const { data: promptData } = await supabaseClient.from('Cau_Hinh_He_Thong').select('gia_tri').eq('ma_cau_hinh', 'PROMPT_BOT').single();
        const systemInstruction = promptData ? promptData.gia_tri : "Bạn là chuyên gia nông nghiệp.";

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${CONFIG.GEMINI_KEY}`;
        
        const contents = [{
            parts: [{ text: systemInstruction + "\n\nUser Question: " + text }]
        }];

        if (file) {
            const base64Data = await this.fileToBase64(file);
            // Gemini API needs pure base64 without prefix
            const base64String = base64Data.split(',')[1]; 
            contents[0].parts.push({
                inline_data: {
                    mime_type: file.type,
                    data: base64String
                }
            });
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: contents })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.candidates[0].content.parts[0].text.replace(/\n/g, '<br>');
    }
};

// ====================================================================================================
// MODULE: CONFIG
// ====================================================================================================
const ConfigModule = {
    renderStaffTable: function(staff) {
        const tbody = $('#table-staff tbody');
        tbody.empty();
        if(staff) staff.forEach(s => {
            tbody.append(`
                <tr>
                    <td>${s.ten}</td>
                    <td>${s.chuc_vu}</td>
                    <td>${s.sdt}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="ConfigModule.editStaff('${s.id}', '${s.ten}', '${s.chuc_vu}')">Sửa</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="ConfigModule.deleteItem('Nhan_Su', '${s.id}')">X</button>
                    </td>
                </tr>`
            );
        });
    },
    
    renderJobTable: function(jobs) {
        const tbody = $('#table-jobs tbody');
        tbody.empty();
        if(jobs) jobs.forEach(j => {
            tbody.append(`
                <tr>
                    <td>${j.ten_cong_viec}</td>
                    <td>${Number(j.don_gia).toLocaleString()}</td>
                    <td>${j.don_vi}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="ConfigModule.editJob('${j.id}', '${j.ten_cong_viec}', '${j.don_gia}')">Sửa</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="ConfigModule.deleteItem('Cau_Hinh_Cong_Viec', '${j.id}')">X</button>
                    </td>
                </tr>`
            );
        });
    },

    renderExpenseTable: function(exps) {
        const tbody = $('#table-expenses tbody');
        tbody.empty();
        if(exps) exps.forEach(e => {
            tbody.append(`
                <tr>
                    <td>${e.ten_loai_chi}</td>
                    <td>${e.nhom}</td>
                    <td>${Number(e.dinh_muc_tien).toLocaleString()}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="ConfigModule.editExpense('${e.id}', '${e.ten_loai_chi}', '${e.dinh_muc_tien}')">Sửa</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="ConfigModule.deleteItem('Cau_Hinh_Chi_Phi', '${e.id}')">X</button>
                    </td>
                </tr>`
            );
        });
    },

    // --- ADD ---
    addStaff: async function() {
        const name = prompt("Tên nhân viên:");
        if (!name) return;
        const role = prompt("Chức vụ:");
        const phone = prompt("SĐT:");
        await this.addItem('Nhan_Su', { ten: name, chuc_vu: role, sdt: phone });
    },

    addJob: async function() {
        const name = prompt("Tên công việc:");
        if (!name) return;
        const price = prompt("Đơn giá:");
        const unit = prompt("Đơn vị tính (Công/Giờ):");
        await this.addItem('Cau_Hinh_Cong_Viec', { ten_cong_viec: name, don_gia: price, don_vi: unit });
    },

    addExpense: async function() {
        const name = prompt("Tên loại chi:");
        if (!name) return;
        const group = prompt("Nhóm (Sinh hoạt/Vật tư):", "Vật tư");
        const price = prompt("Định mức tiền (nếu có):", 0);
        await this.addItem('Cau_Hinh_Chi_Phi', { ten_loai_chi: name, nhom: group, dinh_muc_tien: price });
    },

    addKnowledge: async function() {
        const key = prompt("Từ khóa (VD: vàng lá):");
        if (!key) return;
        const ans = prompt("Câu trả lời:");
        await this.addItem('Kho_Tri_Thuc', { tu_khoa: key, cau_tra_loi: ans });
    },

    // --- EDIT ---
    editStaff: async function(id, oldName, oldRole) {
        const name = prompt("Tên nhân viên:", oldName);
        if (!name) return;
        const role = prompt("Chức vụ:", oldRole);
        await this.updateItem('Nhan_Su', id, { ten: name, chuc_vu: role });
    },

    editJob: async function(id, oldName, oldPrice) {
        const name = prompt("Tên công việc:", oldName);
        if (!name) return;
        const price = prompt("Đơn giá:", oldPrice);
        await this.updateItem('Cau_Hinh_Cong_Viec', id, { ten_cong_viec: name, don_gia: price });
    },

    editExpense: async function(id, oldName, oldPrice) {
        const name = prompt("Tên loại chi:", oldName);
        if (!name) return;
        const price = prompt("Định mức tiền:", oldPrice);
        await this.updateItem('Cau_Hinh_Chi_Phi', id, { ten_loai_chi: name, dinh_muc_tien: price });
    },

    // --- HELPERS ---
    addItem: async function(table, data) {
        const { error } = await supabaseClient.from(table).insert(data);
        if (error) alert("Lỗi: " + error.message);
        else {
            alert("Thêm thành công!");
            location.reload();
        }
    },

    updateItem: async function(table, id, data) {
        const { error } = await supabaseClient.from(table).update(data).eq('id', id);
        if (error) alert("Lỗi sửa: " + error.message);
        else {
            alert("Cập nhật thành công!");
            location.reload();
        }
    },

    deleteItem: async function(table, id) {
        if (!confirm("Bạn chắc chắn muốn xóa?")) return;
        const { error } = await supabaseClient.from(table).delete().eq('id', id);
        if (error) alert("Lỗi xóa: " + error.message);
        else {
            alert("Đã xóa.");
            location.reload();
        }
    }
};


// HRM MODULE: Staff & Salary
const HRMModule = {
    init: function(staff, jobs) {
        this.renderStaffList(staff);
        this.renderJobSelect(jobs);
        this.loadHistory();
        this.checkDebt();
    },

    renderStaffList: function(staff) {
        const container = $('#checkin-staff-list');
        const salSel = $('#salary-staff');
        container.empty();
        salSel.empty().append('<option value="">-- Chọn NV --</option>');

        staff.forEach(s => {
            container.append(`
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <div class="form-check">
                        <input class="form-check-input staff-check" type="checkbox" value="${s.id}" id="st_${s.id}">
                        <label class="form-check-label" for="st_${s.id}">${s.ten}</label>
                    </div>
                    <button class="btn btn-sm btn-link text-decoration-none p-0" onclick="HRMModule.viewStaffDetail('${s.id}')"><i class="fas fa-eye"></i></button>
                </div>
            `);
            salSel.append(`<option value="${s.id}">${s.ten}</option>`);
        });
    },

    renderJobSelect: function(jobs) {
        const sel = $('#checkin-job');
        sel.empty();
        jobs.forEach(j => sel.append(`<option value="${j.ten_cong_viec}" data-price="${j.don_gia}">${j.ten_cong_viec} (${Number(j.don_gia).toLocaleString()})</option>`));
    },

    submitBulkCheckin: async function() {
        const date = $('#checkin-date').val();
        if (!date) return CoreModule.toast('error', 'Chọn ngày!');

        const jobOpt = $('#checkin-job option:selected');
        const ids = [];
        $('.staff-check:checked').each(function() { ids.push($(this).val()); });

        if (ids.length === 0) return CoreModule.toast('warning', 'Chọn nhân viên!');

        const rows = ids.map(id => ({
            ngay: date,
            id_nv: id,
            cong_viec: jobOpt.val(),
            thanh_tien: jobOpt.data('price'),
            thuong: Number($('#checkin-bonus').val()) || 0,
            phat: Number($('#checkin-fine').val()) || 0,
            diem: $('#checkin-rating').val(),
            ghi_chu: $('#checkin-note').val(),
            trang_thai_tt: 'Chua_TT'
        }));

        const { error } = await CoreModule.supabase.from('Cham_Cong').insert(rows);
        if (error) CoreModule.toast('error', error.message);
        else {
            CoreModule.toast('success', 'Đã lưu chấm công!');
            this.loadHistory();
            this.checkDebt();
        }
    },

    loadHistory: async function() {
        const { data } = await CoreModule.supabase.from('Cham_Cong').select('*, Nhan_Su(ten)').order('ngay', {ascending: false}).limit(10);
        const tbody = $('#table-attendance tbody');
        tbody.empty();
        if(data) data.forEach(r => {
            const total = (r.thanh_tien||0) + (r.thuong||0) - (r.phat||0);
            tbody.append(`<tr><td>${CoreModule.formatDate(r.ngay)}</td><td>${r.Nhan_Su?.ten}</td><td>${r.cong_viec}</td><td>${CoreModule.formatCurrency(total)}</td></tr>`);
        });
    },

    checkDebt: async function() {
        const { data } = await CoreModule.supabase.from('Cham_Cong').select('thanh_tien, thuong, phat').eq('trang_thai_tt', 'Chua_TT');
        let total = 0;
        if(data) data.forEach(r => total += (r.thanh_tien||0) + (r.thuong||0) - (r.phat||0));
        $('#stat-salary-debt').text(CoreModule.formatCurrency(total));
    },

    // Staff Detail Modal Logic
    viewStaffDetail: async function(id) {
        // Count workdays this year
        const year = new Date().getFullYear();
        const start = `${year}-01-01`, end = `${year}-12-31`;
        
        const { count } = await CoreModule.supabase.from('Cham_Cong')
            .select('*', { count: 'exact' })
            .eq('id_nv', id)
            .gte('ngay', start).lte('ngay', end);
            
        // Show modal (using SweetAlert for simplicity)
        Swal.fire({
            title: 'Hồ Sơ Nhân Viên',
            html: `Tổng công năm ${year}: <b>${count}</b> ngày.<br>Đánh giá: Tốt`,
            icon: 'info'
        });
    },

    checkUnpaidSalary: async function() {
        const id = $('#salary-staff').val();
        if(!id) return;
        const { data } = await CoreModule.supabase.from('Cham_Cong').select('id, thanh_tien, thuong, phat').eq('id_nv', id).eq('trang_thai_tt', 'Chua_TT');
        
        if (data && data.length > 0) {
            let total = 0;
            data.forEach(r => total += (r.thanh_tien || 0) + (r.thuong || 0) - (r.phat || 0));
            $('#salary-info').html(`Nợ lương: <b>${CoreModule.formatCurrency(total)}</b> (${data.length} công)`);
            $('#btn-pay-salary').prop('disabled', false).data('total', total).data('ids', data.map(d=>d.id));
        } else {
            $('#salary-info').text("Không có nợ lương.");
            $('#btn-pay-salary').prop('disabled', true);
        }
    },

    paySalary: async function() {
        const staffName = $('#salary-staff option:selected').text();
        const total = $('#btn-pay-salary').data('total');
        const ids = $('#btn-pay-salary').data('ids');
        
        const { error: finErr } = await CoreModule.supabase.from('Tai_Chinh').insert({
            loai: 'Chi',
            hang_muc: 'Tra_Luong',
            so_tien: total,
            ghi_chu: `Trả lương cho ${staffName}`,
            id_lien_quan: JSON.stringify(ids)
        });
        
        if (finErr) return CoreModule.toast('error', finErr.message);
        
        await CoreModule.supabase.from('Cham_Cong').update({ trang_thai_tt: 'Da_TT' }).in('id', ids);
        CoreModule.toast('success', "Thanh toán thành công!");
        this.checkUnpaidSalary();
        this.loadHistory();
        this.checkDebt();
    },

    renderSalaryReport: async function() {
        let val = $('#salary-month').val();
        if (!val) {
            const now = new Date();
            val = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
            $('#salary-month').val(val);
        }
        const start = `${val}-01`;
        const [y, m] = val.split('-').map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        const end = `${val}-${lastDay}`;
        
        const { data } = await CoreModule.supabase.from('Cham_Cong')
            .select(`*, Nhan_Su(ten)`)
            .gte('ngay', start)
            .lte('ngay', end);
            
        const report = {}; 
        
        if (data) {
            data.forEach(r => {
                const name = r.Nhan_Su?.ten || 'Unknown';
                if (!report[name]) report[name] = { days: 0, bonus: 0, fine: 0, total: 0, paid: 0 };
                
                const realIncome = (r.thanh_tien||0) + (r.thuong||0) - (r.phat||0);
                report[name].days++;
                report[name].bonus += (r.thuong||0);
                report[name].fine += (r.phat||0);
                report[name].total += realIncome;
                if (r.trang_thai_tt === 'Da_TT') report[name].paid += realIncome;
            });
        }
        
        const tbody = $('#table-salary-report tbody');
        tbody.empty();
        Object.keys(report).forEach(name => {
            const r = report[name];
            const isPaid = r.paid >= r.total;
            const status = isPaid ? '<span class="badge bg-success">Đã TT</span>' : `<span class="badge bg-danger">Nợ ${CoreModule.formatCurrency(r.total - r.paid)}</span>`;
            
            tbody.append(`
                <tr>
                    <td>${name}</td>
                    <td>${r.days}</td>
                    <td><span class="text-success">+${CoreModule.formatCurrency(r.bonus)}</span> / <span class="text-danger">-${CoreModule.formatCurrency(r.fine)}</span></td>
                    <td class="fw-bold">${CoreModule.formatCurrency(r.total)}</td>
                    <td>${status}</td>
                </tr>
            `);
        });
    }
};

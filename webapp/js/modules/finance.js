// FINANCE MODULE
const FinanceModule = {
    init: function(expenses) {
        const sel = $('#expense-type');
        sel.empty();
        expenses.forEach(e => sel.append(`<option value="${e.ten_loai_chi}" data-group="${e.nhom}">${e.ten_loai_chi}</option>`));
        this.loadHistory();
    },

    submitExpense: async function() {
        const date = $('#expense-date').val(); // New Date Input
        if (!date) return CoreModule.toast('warning', 'Chọn ngày!');

        const typeOpt = $('#expense-type option:selected');
        const qty = Number($('#expense-qty').val()) || 0;
        const price = Number($('#expense-price').val()) || 0;
        const total = qty * price || Number($('#expense-amount-manual').val());

        const { error } = await CoreModule.supabase.from('Tai_Chinh').insert({
            ngay: date,
            loai: 'Chi',
            hang_muc: typeOpt.val(),
            nhom: typeOpt.data('group'),
            so_luong: qty,
            don_gia: price,
            so_tien: total,
            ghi_chu: $('#expense-note').val()
        });

        if (error) CoreModule.toast('error', error.message);
        else {
            CoreModule.toast('success', 'Đã lưu chi phí!');
            this.loadHistory();
            // Auto Update Inventory if needed (omitted for brevity, same logic as before)
        }
    },

    loadHistory: async function() {
        const { data } = await CoreModule.supabase.from('Tai_Chinh').select('*').order('ngay', {ascending: false}).limit(10);
        const tbody = $('#table-finance tbody');
        tbody.empty();
        if(data) data.forEach(r => {
            const color = r.loai === 'Thu' ? 'text-success' : 'text-danger';
            tbody.append(`<tr><td>${CoreModule.formatDate(r.ngay)}</td><td class="${color}">${r.loai}</td><td>${r.hang_muc}</td><td>${CoreModule.formatCurrency(r.so_tien)}</td></tr>`);
        });
    },

    submitRevenue: async function() {
        const type = $('#rev-type').val();
        const qty = Number($('#rev-qty').val());
        const price = Number($('#rev-price').val());
        const total = qty * price;

        if (!type || !qty || !price) return CoreModule.toast('warning', "Vui lòng nhập đủ thông tin.");

        // 1. Add to Nguon_Thu
        const { data: rev, error } = await CoreModule.supabase.from('Nguon_Thu').insert({
            loai_nong_san: type,
            so_luong: qty,
            don_gia: price,
            thanh_tien: total,
            ghi_chu: ''
        }).select();

        if (error) return CoreModule.toast('error', error.message);

        // 2. Add to Tai_Chinh (Cash Flow)
        await CoreModule.supabase.from('Tai_Chinh').insert({
            ngay: new Date(),
            loai: 'Thu',
            hang_muc: type,
            so_luong: qty,
            don_gia: price,
            so_tien: total,
            ghi_chu: 'Thu hoạch bán nông sản',
            id_lien_quan: rev[0].id
        });

        CoreModule.toast('success', "Đã ghi nhận doanh thu!");
        this.loadHistory();
    }
};

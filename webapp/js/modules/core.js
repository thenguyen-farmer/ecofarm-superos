// CORE MODULE: Config, Database, Utils
const CoreModule = {
    supabase: null,
    
    init: function() {
        if (typeof CONFIG === 'undefined' || CONFIG.SUPABASE_URL.includes('YOUR_')) {
            $('#loading-overlay').fadeOut(); // Hide overlay to show alert
            Swal.fire("Cấu hình", "Vui lòng cập nhật API Key trong js/config.js", "warning");
            return false;
        }
        
        try {
            this.supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
            return true;
        } catch (e) {
            console.error(e);
            $('#loading-overlay').fadeOut();
            Swal.fire("Lỗi kết nối", e.message, "error");
            return false;
        }
    },

    // Format Money
    formatCurrency: function(amount) {
        return Number(amount).toLocaleString('vi-VN') + ' đ';
    },

    // Format Date
    formatDate: function(dateStr) {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('vi-VN');
    },

    // Show Loading
    showLoading: function(msg = 'Đang xử lý...') {
        Swal.fire({ title: msg, allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    },

    // Hide Loading
    hideLoading: function() {
        $('#loading-overlay').fadeOut();
        // Do not close Swal here if it's an error alert
        const isError = Swal.getPopup() && Swal.getPopup().classList.contains('swal2-icon-error');
        if (!isError) Swal.close();
    },

    // Generic Toast
    toast: function(type, msg) {
        Swal.fire({ icon: type, title: msg, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
    }
};

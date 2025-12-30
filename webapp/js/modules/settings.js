// SETTINGS MODULE: System Configuration
const ConfigModule = {
    // --- RENDER TABLES ---
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

    // --- ADD ACTIONS ---
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

    renderKnowledgeTable: function(data) {
        const tbody = $('#table-knowledge tbody');
        tbody.empty();
        if(data) data.forEach(k => {
            tbody.append(`
                <tr>
                    <td>${k.tu_khoa}</td>
                    <td>${k.cau_tra_loi.substring(0,30)}...</td>
                    <td><button class="btn btn-sm btn-outline-danger" onclick="ConfigModule.deleteItem('Kho_Tri_Thuc', '${k.id}')">X</button></td>
                </tr>
            `);
        });
    },

    // --- EDIT ACTIONS ---
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

    // --- DB HELPERS ---
    addItem: async function(table, data) {
        const { error } = await CoreModule.supabase.from(table).insert(data);
        if (error) CoreModule.toast('error', error.message);
        else {
            CoreModule.toast('success', "Thêm thành công!");
            location.reload();
        }
    },

    updateItem: async function(table, id, data) {
        const { error } = await CoreModule.supabase.from(table).update(data).eq('id', id);
        if (error) CoreModule.toast('error', error.message);
        else {
            CoreModule.toast('success', "Cập nhật thành công!");
            location.reload();
        }
    },

    deleteItem: async function(table, id) {
        if (!confirm("Bạn chắc chắn muốn xóa?")) return;
        const { error } = await CoreModule.supabase.from(table).delete().eq('id', id);
        if (error) CoreModule.toast('error', error.message);
        else {
            CoreModule.toast('success', "Đã xóa.");
            location.reload();
        }
    }
};

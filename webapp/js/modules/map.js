// MAP MODULE: Advanced Tree Management
const MapModule = {
    map: null,
    bulkMode: false,
    selectedType: 'Sầu riêng',

    TYPE_COLORS: {
        'Sầu riêng': '#2e7d32', // Green
        'Cà phê': '#795548', // Brown
        'Điều': '#ff5722', // Orange
        'Dừa': '#009688', // Teal
        'Tiêu': '#333333', // Dark
        'Bơ': '#8bc34a', // Light Green
        'Tủ điện': '#f44336', // Red Infrastructure
        'Ống nước': '#03a9f4' // Blue Infrastructure
    },
    
    init: function(trees) {
        if (this.map) this.map.remove();
        
        // Default View
        let center = [10.7769, 106.7009];
        if (trees && trees.length > 0) center = [trees[0].x, trees[0].y];

        this.map = L.map('map').setView(center, 19);
        L.tileLayer(CONFIG.MAP_TILE_URL, { maxZoom: 22, attribution: CONFIG.MAP_ATTRIBUTION }).addTo(this.map);
        
        // Locate Me
        const locateBtn = L.DomUtil.create('button', 'btn btn-light btn-sm mt-2 ms-2 shadow');
        locateBtn.innerHTML = '<i class="fas fa-crosshairs"></i>';
        locateBtn.onclick = () => this.map.locate({setView: true, maxZoom: 20});
        
        L.Control.Locate = L.Control.extend({ onAdd: () => locateBtn });
        new L.Control.Locate({ position: 'topleft' }).addTo(this.map);

        // Render Trees
        if (trees) this.renderMarkers(trees);

        // Map Click (Single vs Bulk)
        this.map.on('click', (e) => {
            if (this.bulkMode) {
                this.addTree(e.latlng.lat, e.latlng.lng, this.selectedType);
            } else {
                if (confirm("Thêm đối tượng mới tại đây?")) {
                    this.addTree(e.latlng.lat, e.latlng.lng, this.selectedType);
                }
            }
        });
    },

    renderMarkers: function(trees) {
        trees.forEach(t => {
            // Determine Color based on Type
            let color = this.TYPE_COLORS[t.loai] || '#999'; // Default Gray
            
            // Override by Health Status (Only for trees, not infra)
            if (!['Tủ điện', 'Ống nước'].includes(t.loai)) {
                if (t.trang_thai === 'Bệnh') color = '#f44336'; // Bright Red
                if (t.trang_thai === 'Cần nước') color = '#2196f3'; // Bright Blue
            }

            // Marker
            const marker = L.circleMarker([t.x, t.y], { 
                color: 'white', weight: 1, 
                fillColor: color, fillOpacity: 0.9, radius: 7, 
                draggable: true 
            }).addTo(this.map);
            
            marker.bindPopup(`
                <b>${t.loai}</b><br>
                <div class="badge bg-light text-dark border">${t.trang_thai}</div>
                <div class="mt-2 btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="MapModule.editTree('${t.id}')">Sửa</button>
                    <button class="btn btn-outline-danger" onclick="MapModule.deleteTree('${t.id}')">Xóa</button>
                </div>
            `);

            // Drag End: Update DB
            marker.on('dragend', async (e) => {
                const { lat, lng } = e.target.getLatLng();
                await CoreModule.supabase.from('Ban_Do_So').update({ x: lat, y: lng }).eq('id', t.id);
                CoreModule.toast('success', 'Đã lưu vị trí mới');
            });
        });
    },

    addTree: async function(lat, lng, type) {
        // If type not set, ask
        if (!type) type = prompt("Loại cây (VD: Sầu riêng):", "Sầu riêng");
        if (!type) return;

        const { error } = await CoreModule.supabase.from('Ban_Do_So').insert({
            loai: type,
            x: lat,
            y: lng,
            trang_thai: 'Tốt',
            giai_doan: 'Mới trồng',
            ngay_trong: new Date()
        });

        if (error) CoreModule.toast('error', error.message);
        else {
            if (!this.bulkMode) {
                CoreModule.toast('success', 'Đã thêm ' + type);
                location.reload(); 
            } else {
                CoreModule.toast('success', 'Đã thêm (Chế độ hàng loạt)');
                L.circleMarker([lat, lng], { color: 'white', fillColor: '#4caf50', fillOpacity: 0.5, radius: 5 }).addTo(this.map);
            }
        }
    },

    toggleBulkMode: function() {
        this.bulkMode = !this.bulkMode;
        this.selectedType = $('#map-type-select').val(); // Get selected type
        
        const btn = $('#btn-bulk-mode');
        if (this.bulkMode) {
            btn.addClass('btn-warning').removeClass('btn-outline-primary').html('<i class="fas fa-bolt"></i> Đang Bật');
            CoreModule.toast('info', `Đã bật chế độ thêm nhanh: ${this.selectedType}`);
        } else {
            btn.addClass('btn-outline-primary').removeClass('btn-warning').html('<i class="fas fa-magic"></i> Thêm Nhanh');
            location.reload(); // Reload to sync all data
        }
    },

    toggleListView: function() {
        const mapDiv = $('#map-container');
        const listDiv = $('#tree-list-container');
        
        if (mapDiv.is(':visible')) {
            mapDiv.hide();
            listDiv.show();
            this.renderTreeTable();
        } else {
            listDiv.hide();
            mapDiv.show();
            if (this.map) this.map.invalidateSize();
        }
    },

    renderTreeTable: async function() {
        const { data: trees } = await CoreModule.supabase.from('Ban_Do_So').select('*').order('ngay_cn', {ascending: false});
        const tbody = $('#table-trees tbody');
        tbody.empty();
        
        if (trees) {
            trees.forEach(t => {
                tbody.append(`
                    <tr>
                        <td>${t.loai}</td>
                        <td>${t.trang_thai}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary" onclick="MapModule.editTree('${t.id}')"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-outline-danger" onclick="MapModule.deleteTree('${t.id}')"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `);
            });
        }
    },

    editTree: async function(id) {
        const status = prompt("Trạng thái mới (Tốt/Bệnh/Thu hoạch):");
        if (status) {
            await CoreModule.supabase.from('Ban_Do_So').update({ trang_thai: status }).eq('id', id);
            location.reload();
        }
    },

    deleteTree: async function(id) {
        if (!confirm("Xóa cây này?")) return;
        await CoreModule.supabase.from('Ban_Do_So').delete().eq('id', id);
        CoreModule.toast('success', 'Đã xóa');
        location.reload();
    }
};

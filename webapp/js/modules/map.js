// MAP MODULE: Advanced Tree Management
const MapModule = {
    map: null,
    
    init: function(trees) {
        if (this.map) this.map.remove();
        
        // 1. Setup Map
        let center = [10.7769, 106.7009];
        if (trees && trees.length > 0) center = [trees[0].x, trees[0].y];
        
        this.map = L.map('map').setView(center, 19);
        L.tileLayer(CONFIG.MAP_TILE_URL, { maxZoom: 22, attribution: CONFIG.MAP_ATTRIBUTION }).addTo(this.map);
        
        // Locate Me Control
        const locateBtn = L.DomUtil.create('button', 'btn btn-light btn-sm mt-2 ms-2');
        locateBtn.innerHTML = '<i class="fas fa-crosshairs"></i>';
        locateBtn.onclick = () => this.map.locate({setView: true, maxZoom: 20});
        
        // Add to a custom control container if needed, or just append to map container
        // Simple way: Add standard Leaflet control
        L.Control.Locate = L.Control.extend({
            onAdd: () => locateBtn
        });
        new L.Control.Locate({ position: 'topleft' }).addTo(this.map);

        // 2. Render Markers
        if (trees) this.renderMarkers(trees);

        // 3. Events
        this.map.on('click', (e) => {
            if (confirm("Thêm cây mới tại vị trí này?")) this.addTree(e.latlng.lat, e.latlng.lng);
        });
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

    deleteTree: async function(id) {
        if (!confirm("Xóa cây này?")) return;
        await CoreModule.supabase.from('Ban_Do_So').delete().eq('id', id);
        CoreModule.toast('success', 'Đã xóa');
        location.reload();
    },

    renderMarkers: function(trees) {
        trees.forEach(t => {
            // Color Logic
            let color = '#2e7d32'; // Green (Default)
            if (t.trang_thai === 'Bệnh') color = '#c62828'; // Red
            if (t.trang_thai === 'Cần nước') color = '#0277bd'; // Blue
            if (t.trang_thai === 'Thu hoạch') color = '#f9a825'; // Yellow

            // Marker
            const marker = L.circleMarker([t.x, t.y], {
                color: color,
                fillColor: color,
                fillOpacity: 0.7,
                radius: 8,
                draggable: true
            }).addTo(this.map);

            // Drag End (Update Position)
            marker.on('dragend', (e) => {
                const newPos = e.target.getLatLng();
                this.updatePosition(t.id, newPos.lat, newPos.lng);
            });

            // Popup (Advanced)
            const popupContent = `
                <div class="text-center">
                    <strong class="text-uppercase">${t.loai}</strong>
                    <div class="badge bg-secondary mb-2">${t.giai_doan || 'Chưa rõ'}</div>
                    <div class="mb-2">
                        <span class="badge ${t.trang_thai === 'Tốt' ? 'bg-success' : 'bg-danger'}">${t.trang_thai}</span>
                    </div>
                    <div class="d-grid gap-2">
                        <button class="btn btn-sm btn-outline-primary" onclick="MapModule.logAction('${t.id}', 'Tưới nước')">💧 Tưới</button>
                        <button class="btn btn-sm btn-outline-warning" onclick="MapModule.logAction('${t.id}', 'Bón phân')">💊 Phân</button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="MapModule.editTree('${t.id}')">✏️ Sửa</button>
                    </div>
                </div>
            `;
            marker.bindPopup(popupContent);
        });
    },

    addTree: async function(lat, lng) {
        const type = prompt("Loại cây:", "Sầu riêng");
        if (!type) return;
        const { error } = await CoreModule.supabase.from('Ban_Do_So').insert({
            loai: type, x: lat, y: lng, trang_thai: 'Tốt', giai_doan: 'Cây con', ngay_trong: new Date()
        });
        
        if (error) CoreModule.toast('error', error.message);
        else { CoreModule.toast('success', 'Đã trồng cây!'); location.reload(); }
    },

    updatePosition: async function(id, lat, lng) {
        await CoreModule.supabase.from('Ban_Do_So').update({ x: lat, y: lng }).eq('id', id);
        CoreModule.toast('success', 'Đã di chuyển!');
    },

    logAction: async function(id, action) {
        // Fetch current history
        const { data } = await CoreModule.supabase.from('Ban_Do_So').select('lich_su_cham_soc').eq('id', id).single();
        let history = data.lich_su_cham_soc || [];
        
        // Add new action
        history.push({ date: new Date().toISOString(), action: action });
        
        // Update DB
        await CoreModule.supabase.from('Ban_Do_So').update({ lich_su_cham_soc: history }).eq('id', id);
        CoreModule.toast('success', `Đã ghi nhận: ${action}`);
    },

    editTree: async function(id) {
        const status = prompt("Trạng thái mới (Tốt/Bệnh/Thu hoạch):");
        if (status) {
            await CoreModule.supabase.from('Ban_Do_So').update({ trang_thai: status }).eq('id', id);
            location.reload();
        }
    }
};

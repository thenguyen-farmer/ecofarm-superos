// DASHBOARD MODULE: Weather, Stats, Alerts
const DashboardModule = {
    init: function(trees, staff, inventory, financeData) {
        // 1. Stats
        $('#stat-tree').text(trees ? trees.length : 0);
        $('#stat-staff').text(staff ? staff.length : 0);
        
        // 2. Weather & Suggestions
        this.loadWeather();

        // 3. Finance Chart
        this.renderChart(financeData);
    },

    loadWeather: async function() {
        if (!CONFIG.OPENWEATHER_KEY || CONFIG.OPENWEATHER_KEY.includes('YOUR_')) {
            $('#weather-widget').html('<div class="alert alert-warning small">Thiếu API Thời Tiết</div>');
            return;
        }

        const lat = 10.7769, lon = 106.7009; // Default HCM
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${CONFIG.OPENWEATHER_KEY}&units=metric&lang=vi`;

        try {
            const res = await fetch(url);
            const data = await res.json();
            
            // Forecast Logic (Simulated based on current weather code)
            const isRainy = data.weather[0].main === 'Rain' || data.weather[0].main === 'Drizzle';
            const isCold = data.main.temp < 15; // Sương muối risk
            
            let suggestion = "Thời tiết tốt. Có thể bón phân/xịt thuốc.";
            let alertHtml = "";

            if (isRainy) {
                suggestion = "Trời mưa: Trì hoãn bón phân và phun thuốc.";
                alertHtml += `<li class="list-group-item text-warning"><i class="fas fa-cloud-rain"></i> Cảnh báo mưa!</li>`;
            }
            if (isCold) {
                alertHtml += `<li class="list-group-item text-primary"><i class="fas fa-snowflake"></i> Cảnh báo lạnh/sương!</li>`;
            }

            // Render Widget
            const iconUrl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
            $('#weather-widget').html(`
                <div class="d-flex align-items-center justify-content-center">
                    <img src="${iconUrl}" width="50">
                    <div class="text-start">
                        <h4 class="m-0">${Math.round(data.main.temp)}°C</h4>
                        <div class="small">${data.weather[0].description}</div>
                    </div>
                </div>
                <div class="row mt-2 small text-muted text-center border-top pt-2">
                    <div class="col">💧 ${data.main.humidity}%</div>
                    <div class="col">💨 ${data.wind.speed} m/s</div>
                </div>
                <div class="alert alert-info mt-2 mb-0 small p-2">
                    <i class="fas fa-lightbulb"></i> ${suggestion}
                </div>
            `);

            // Render Alerts
            $('#dashboard-alerts').append(alertHtml);

        } catch (e) {
            $('#weather-widget').html('<div class="small text-danger">Lỗi tải thời tiết.</div>');
        }
    },

    renderChart: function(data) {
        const ctx = document.getElementById('financeChart');
        if (!ctx || !data) return;

        const months = {};
        data.forEach(d => {
            const m = new Date(d.ngay).toLocaleDateString('vi-VN', { month: 'short' });
            if (!months[m]) months[m] = { thu: 0, chi: 0 };
            if (d.loai === 'Thu') months[m].thu += Number(d.so_tien);
            else months[m].chi += Number(d.so_tien);
        });

        const labels = Object.keys(months);
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Thu', data: labels.map(l => months[l].thu), backgroundColor: '#2e7d32' },
                    { label: 'Chi', data: labels.map(l => months[l].chi), backgroundColor: '#c62828' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
};

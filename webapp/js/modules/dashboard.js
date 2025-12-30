// DASHBOARD MODULE: Weather, Stats, Alerts
const DashboardModule = {
    chartInstance: null,

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
        let data = null;
        let isMock = false;

        if (!CONFIG.OPENWEATHER_KEY || CONFIG.OPENWEATHER_KEY.includes('YOUR_')) {
            // Mock Data if No Key
            isMock = true;
            data = {
                main: { temp: 28, humidity: 75 },
                weather: [{ description: 'Nắng nhẹ (Demo)', icon: '01d', main: 'Clear' }],
                wind: { speed: 3.5 },
                cod: 200
            };
        } else {
            const lat = 10.7769, lon = 106.7009; // Default HCM
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${CONFIG.OPENWEATHER_KEY}&units=metric&lang=vi`;
            try {
                const res = await fetch(url);
                data = await res.json();
                if (data.cod !== 200) throw new Error();
            } catch (e) {
                console.error("Weather Load Error");
            }
        }

        if (data) {
            // Forecast Logic
            const isRainy = data.weather[0].main === 'Rain' || data.weather[0].main === 'Drizzle';
            const isCold = data.main.temp < 15;
            
            let suggestion = "Thời tiết ổn định. Thích hợp canh tác.";
            let alertHtml = "";

            if (isRainy) {
                suggestion = "Trời mưa: Trì hoãn bón phân/phun thuốc.";
                alertHtml += `<li class="list-group-item bg-transparent text-warning"><i class="fas fa-cloud-rain"></i> Cảnh báo mưa!</li>`;
            }
            if (isCold) {
                alertHtml += `<li class="list-group-item bg-transparent text-primary"><i class="fas fa-snowflake"></i> Cảnh báo lạnh/sương!</li>`;
            }
            if (isMock) {
                suggestion += " (Dữ liệu mẫu - Vui lòng nhập API Key)";
            }

            // Render Widget
            const iconUrl = isMock ? 'https://openweathermap.org/img/wn/01d@2x.png' : `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
            $('#weather-widget').html(`
                <div class="d-flex align-items-center justify-content-center">
                    <img src="${iconUrl}" width="50">
                    <div class="text-start">
                        <h4 class="m-0 text-dark">${Math.round(data.main.temp)}°C</h4>
                        <div class="small text-muted">${data.weather[0].description}</div>
                    </div>
                </div>
                <div class="row mt-2 small text-muted text-center border-top pt-2">
                    <div class="col"><i class="fas fa-tint"></i> ${data.main.humidity}%</div>
                    <div class="col"><i class="fas fa-wind"></i> ${data.wind.speed} m/s</div>
                </div>
                <div class="alert alert-light mt-2 mb-0 small p-2 border-0 bg-opacity-10 bg-primary text-primary">
                    <i class="fas fa-lightbulb"></i> ${suggestion}
                </div>
            `);

            $('#dashboard-alerts').append(alertHtml);
        } else {
            $('#weather-widget').html('<div class="small text-danger text-center">Không thể tải thời tiết.</div>');
        }
    },

    renderChart: function(data) {
        const ctx = document.getElementById('financeChart');
        if (!ctx || !data) return;

        // Destroy old instance to prevent overlay/error
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        const months = {};
        if (data) {
            data.forEach(d => {
                const m = new Date(d.ngay).toLocaleDateString('vi-VN', { month: 'short' });
                if (!months[m]) months[m] = { thu: 0, chi: 0 };
                if (d.loai === 'Thu') months[m].thu += Number(d.so_tien);
                else months[m].chi += Number(d.so_tien);
            });
        }

        const labels = Object.keys(months);
        
        this.chartInstance = new Chart(ctx, {
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

// SECURITY CONFIGURATION
// Lưu ý: Đây là Web App tĩnh (Static). Để bảo mật API Key tuyệt đối, bạn cần:
// 1. Vào Google Cloud Console -> Restrict API Key -> Chỉ cho phép domain của bạn (VD: ecofarm.vercel.app).
// 2. Vào Supabase Dashboard -> Authentication -> URL Configuration -> Site URL.

const CONFIG = {
    SUPABASE_URL = 'https://aybopfqltybsfbqpxrsu.supabase.co',
    SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5Ym9wZnFsdHlic2ZicXB4cnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5OTM0ODgsImV4cCI6MjA4MjU2OTQ4OH0.O9Su4haSDqay3jfjz7SYUab3bPQ2TzX4YGH9omlWj34',
    GEMINI_API_KEY = 'AIzaSyBEVOIN-KkGaT08PWUF9ywOHFyWOhb0i6A', // Placeholder
    WEATHER_API_KEY = 'd55adcde720c023c53ec16f44ea51a06', // Lấy tại makersuite.google.com
    
    // Cấu hình Bản đồ mặc định (Google Hybrid)
    MAP_TILE_URL: 'https://mt0.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}',
    MAP_ATTRIBUTION: 'Google Hybrid'
};

// CHATBOT MODULE
const ChatbotModule = {
    init: function() {
        // Init logic
    },
    
    sendChat: async function() {
        // Basic Logic stub - Connect to Gemini if Key exists
        if (!CONFIG.GEMINI_KEY || CONFIG.GEMINI_KEY.includes('YOUR_')) return CoreModule.toast('warning', 'Chưa cấu hình Gemini AI');
        // Logic similar to previous app.js
    },

    updateSettings: async function() {
        const prompt = $('#bot-system-prompt').val();
        if (prompt) {
            await CoreModule.supabase.from('Cau_Hinh_He_Thong').upsert({ ma_cau_hinh: 'PROMPT_BOT', gia_tri: prompt });
            CoreModule.toast('success', 'Đã lưu cấu hình AI');
        }
    }
};

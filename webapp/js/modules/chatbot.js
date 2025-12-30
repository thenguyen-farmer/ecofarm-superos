// CHATBOT MODULE: Gemini Vision Integration
const ChatbotModule = {
    init: function() {
        $('#chat-history').append(`<div class="chat-msg chat-bot">Xin chào! Gửi ảnh hoặc câu hỏi để tôi hỗ trợ nhé.</div>`);
    },
    
    previewImage: function() {
        const file = document.getElementById('chat-img').files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                $('#img-preview').attr('src', e.target.result);
                $('#chat-preview').show();
            }
            reader.readAsDataURL(file);
        }
    },
    
    clearImage: function() {
        $('#chat-img').val('');
        $('#chat-preview').hide();
    },

    sendChat: async function() {
        const input = $('#chat-input');
        const msg = input.val();
        const fileInput = document.getElementById('chat-img');
        const file = fileInput.files[0];
        
        if (!msg && !file) return;

        // UI User Msg
        let userHtml = `<div class="chat-msg chat-user">`;
        if (file) {
            const base64 = await this.fileToBase64(file);
            userHtml += `<img src="${base64}" style="max-width:100%; border-radius:5px"><br>`;
        }
        userHtml += `${msg}</div>`;
        $('#chat-history').append(userHtml);
        
        input.val('');
        this.clearImage();
        $('#chat-history').append(`<div class="chat-msg chat-bot" id="chat-loading">...</div>`);
        const chatBox = document.getElementById('chat-history');
        chatBox.scrollTop = chatBox.scrollHeight;

        // Call Gemini
        try {
            const reply = await this.callGemini(msg, file);
            $('#chat-loading').remove();
            $('#chat-history').append(`<div class="chat-msg chat-bot">${reply}</div>`);
        } catch (e) {
            $('#chat-loading').remove();
            $('#chat-history').append(`<div class="chat-msg chat-bot text-danger">Lỗi AI: ${e.message}</div>`);
        }
        chatBox.scrollTop = chatBox.scrollHeight;
    },

    fileToBase64: (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    }),

    callGemini: async function(text, file) {
        if (!CONFIG.GEMINI_KEY || CONFIG.GEMINI_KEY.includes('YOUR_')) return "Vui lòng cấu hình GEMINI_KEY trong file config.js";

        // Fetch System Prompt
        const { data: promptData } = await CoreModule.supabase.from('Cau_Hinh_He_Thong').select('gia_tri').eq('ma_cau_hinh', 'PROMPT_BOT').single();
        const systemInstruction = promptData ? promptData.gia_tri : "Bạn là chuyên gia nông nghiệp.";

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${CONFIG.GEMINI_KEY}`;
        
        const contents = [{
            parts: [{ text: systemInstruction + "\n\nUser Question: " + text }]
        }];

        if (file) {
            const base64Data = await this.fileToBase64(file);
            const base64String = base64Data.split(',')[1]; 
            contents[0].parts.push({
                inline_data: {
                    mime_type: file.type,
                    data: base64String
                }
            });
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: contents })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.candidates[0].content.parts[0].text.replace(/\n/g, '<br>');
    },

    updateSettings: async function() {
        const prompt = $('#bot-system-prompt').val();
        if (prompt) {
            await CoreModule.supabase.from('Cau_Hinh_He_Thong').upsert({ ma_cau_hinh: 'PROMPT_BOT', gia_tri: prompt });
            CoreModule.toast('success', 'Đã lưu cấu hình AI');
        }
    }
};

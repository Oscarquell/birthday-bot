require('dotenv').config();

const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });
const chatId = process.env.CHAT_ID;

// UTC+6 (Бишкек)
function getBishkekDate() {
    const now = new Date();
    return new Date(now.getTime() + 6 * 60 * 60 * 1000);
}

function loadBirthdays() {
    try {
        const raw = fs.readFileSync('./birthdays.json', 'utf-8');
        return JSON.parse(raw);
    } catch (e) {
        console.error("❌ Failed to read birthdays.json:", e.message);
        return [];
    }
}

function getTodayBirthdays() {
    const data = loadBirthdays();

    const bishkek = getBishkekDate();
    const day = bishkek.getDate();
    const month = bishkek.getMonth();

    return data.filter(p => {
        const d = new Date(p.birthday);
        return d.getDate() === day && d.getMonth() === month;
    });
}

// 🚀 основная логика (НЕ блокирует HTTP)
async function sendBirthdays() {
    console.log("🚀 Job started:", new Date().toISOString());

    const people = getTodayBirthdays();

    if (!people.length) {
        console.log("📭 No birthdays today");
        return;
    }

    const year = getBishkekDate().getFullYear();

    for (const person of people) {
        try {
            const birth = new Date(person.birthday);
            const age = year - birth.getFullYear();

            const phone = person.phone.replace('+', '');

            const text = `🎉 ${person.name} (${age} лет)\n📞 ${phone}`;

            console.log("📤 Sending:", person.name);

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

        } catch (err) {
            console.error("❌ Send error:", err.message);
        }
    }

    console.log(`✅ Done. Sent: ${people.length}`);
}

// 🟢 health check
app.get('/', (req, res) => {
    res.send('Bot is alive');
});

// 🔥 CRON ENDPOINT (ВАЖНО: отвечает СРАЗУ)
app.get('/run-bot', (req, res) => {
    console.log("⚡ Trigger received");

    // отвечаем мгновенно (решает timeout проблему)
    res.json({ ok: true, message: "triggered" });

    // запускаем в фоне (НЕ ждём)
    sendBirthdays().catch(err => {
        console.error("❌ Background error:", err.message);
    });
});

app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
});
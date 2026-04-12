require('dotenv').config();

const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });
const chatId = process.env.CHAT_ID;

const BISHKEK_OFFSET_HOURS = 6;

// 🕒 Бишкек время (чистый UTC + offset)
function getBishkekDate() {
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utcMs + BISHKEK_OFFSET_HOURS * 60 * 60 * 1000);
}

// 📂 загрузка JSON
function loadBirthdays() {
    try {
        return JSON.parse(fs.readFileSync('./birthdays.json', 'utf-8'));
    } catch (e) {
        console.error("❌ Failed to read birthdays.json:", e.message);
        return [];
    }
}

// 🔁 убираем дубликаты
function uniqueBirthdays(data) {
    const map = new Map();

    for (const p of data) {
        map.set(`${p.name}-${p.birthday}`, p);
    }

    return [...map.values()];
}

// 🎯 сегодня ДР
function getTodayBirthdays() {
    const data = uniqueBirthdays(loadBirthdays());
    const now = getBishkekDate();

    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    const todayKey = `${mm}-${dd}`;

    console.log("📅 Today key:", todayKey);

    return data.filter(p => {
        const parts = String(p.birthday).trim().split('-');
        if (parts.length !== 3) return false;

        const key = `${parts[1]}-${parts[2]}`;

        console.log(`👤 ${p.name}: ${key}`);

        return key === todayKey;
    });
}

// 🔍 САМЫЙ БЛИЖАЙШИЙ ДЕНЬ (ОДИН)
function getNextBirthdayGroup() {
    const data = uniqueBirthdays(loadBirthdays());

    const now = getBishkekDate();
    const year = now.getFullYear();

    let minTime = Infinity;
    let result = null;

    for (const p of data) {
        const [, mm, dd] = p.birthday.split('-').map(Number);

        let thisYear = new Date(year, mm - 1, dd);
        let nextYear = new Date(year + 1, mm - 1, dd);

        let target = thisYear >= now ? thisYear : nextYear;

        const time = target.getTime();

        if (time < minTime) {
            minTime = time;
            result = {
                date: target,
                names: [p.name]
            };
        } else if (time === minTime && result) {
            result.names.push(p.name);
        }
    }

    return result;
}

// 🚀 основная логика
async function sendBirthdays() {
    console.log("🚀 Job started:", new Date().toISOString());

    const today = getTodayBirthdays();

    // ❌ нет ДР сегодня
    if (!today.length) {
        console.log("📭 No birthdays today");

        const next = getNextBirthdayGroup();

        if (!next) {
            await bot.sendMessage(chatId, "📭 Список пуст.");
            return;
        }

        const formatted = next.date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long'
        });

        await bot.sendMessage(
            chatId,
            `📭 Сегодня нет рождений

🎂 Ближайшая дата:
${formatted} — ${next.names.length} человек

━━━━━━━━━━━━━━
📌 Детали будут отправлены в указанный день.`
        );

        return;
    }

    // ✅ есть ДР сегодня
    const currentYear = getBishkekDate().getFullYear();

    for (const p of today) {
        try {
            const birthYear = Number(p.birthday.split('-')[0]);
            const age = currentYear - birthYear;

            const phone = p.phone.replace('+', '');

            console.log("📤 Sending:", p.name);

            await bot.sendMessage(
                chatId,
                `🎂 Сегодня день рождения\n🎉 ${p.name} (${age} лет)\n📞 ${phone}\n\n🎉 Не забудьте поздравить 🎂`,
                {
                    reply_markup: {
                        inline_keyboard: [[
                            {
                                text: "WhatsApp 💬",
                                url: `https://wa.me/${phone}`
                            }
                        ]]
                    }
                }
            );

        } catch (err) {
            console.error("❌ Send error:", err.message);
        }
    }

    console.log(`✅ Done. Sent: ${today.length}`);
}

// 🌐 server
app.get('/', (req, res) => {
    res.send('Bot is alive');
});

app.get('/run-bot', (req, res) => {
    res.json({ ok: true, message: "triggered" });

    sendBirthdays().catch(console.error);
});

app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
});
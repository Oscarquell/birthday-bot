require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });
const chatId = process.env.CHAT_ID;


function getBishkekDate() {
    const now = new Date();
    const bishkek = new Date(now.getTime() + 6 * 60 * 60 * 1000);

    return {
        day: bishkek.getDate(),
        month: bishkek.getMonth(),
        year: bishkek.getFullYear()
    };
}

function loadBirthdays() {
    try {
        return JSON.parse(fs.readFileSync('./birthdays.json', 'utf-8'));
    } catch (e) {
        console.error("❌ Error reading birthdays.json:", e.message);
        return [];
    }
}

function getTodayBirthdays() {
    const data = loadBirthdays();
    const { day, month } = getBishkekDate();

    return data.filter(p => {
        const d = new Date(p.birthday);
        return d.getDate() === day && d.getMonth() === month;
    });
}

async function run() {
    console.log("🚀 Bot started at", new Date().toISOString());

    const people = getTodayBirthdays();

    if (!people.length) {
        console.log("📭 No birthdays today");
        return;
    }

    console.log(`🎉 Found ${people.length} birthday(s)`);

    const { year } = getBishkekDate();

    for (const person of people) {
        try {
            const birth = new Date(person.birthday);
            const age = year - birth.getFullYear();

            const phone = person.phone.replace('+', '');

            const text = `🎉 ${person.name} (${age} лет)\n📞 ${phone}`;

            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "Написать в WhatsApp 💬",
                                url: `https://wa.me/${phone}`
                            }
                        ]
                    ]
                }
            };

            console.log(`📤 Sending to ${person.name}`);

            await bot.sendMessage(chatId, text, keyboard);

        } catch (err) {
            console.error("❌ Send error:", err.message);
        }
    }

    console.log("✅ Done");
}

run();
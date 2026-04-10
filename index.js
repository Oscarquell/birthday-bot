require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const bot = new TelegramBot(process.env.BOT_TOKEN);
const chatId = process.env.CHAT_ID;

function getTodayBirthdays() {
    const data = JSON.parse(fs.readFileSync('./birthdays.json'));

    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth();

    return data.filter(p => {
        const d = new Date(p.birthday);
        return d.getDate() === day && d.getMonth() === month;
    });
}

function sendBirthdayMessage() {
    const people = getTodayBirthdays();

    if (!people.length) {
        console.log('Сегодня ДР нет');
        return;
    }

    const currentYear = new Date().getFullYear();

    people.forEach(person => {
        const age = currentYear - new Date(person.birthday).getFullYear();

        const phoneRaw = person.phone;
        const phoneForWhatsApp = phoneRaw.replace('+', '');

        const text = `🎉 ${person.name} (${age} лет)\n📞 ${phoneForWhatsApp}`;

        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "Написать в WhatsApp 💬",
                            url: `https://wa.me/${phoneForWhatsApp}`
                        }
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, text, keyboard);
    });
}

// запускается ОДИН РАЗ
sendBirthdayMessage();
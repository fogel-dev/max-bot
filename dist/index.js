import 'dotenv/config';
import { Bot, Keyboard } from '@maxhub/max-bot-api';
import { savePhone } from "./db.js";
const bot = new Bot(process.env.BOT_TOKEN);
// Обработчик события запуска бота
bot.on('bot_started', (ctx) => ctx.reply('👋 Привет! Чтобы продолжить, пожалуйста, поделитесь номером телефона:', {
    attachments: [
        Keyboard.inlineKeyboard([
            [Keyboard.button.requestContact('📱 Отправить номер')],
        ]),
    ],
}));
bot.command('start', (ctx) => ctx.reply('👋 Привет! Чтобы продолжить, пожалуйста, поделитесь номером телефона:', {
    attachments: [
        Keyboard.inlineKeyboard([
            [Keyboard.button.requestContact('📱 Отправить номер')],
        ]),
    ],
}));
bot.on('message_created', async (ctx, next) => {
    if (!ctx.contactInfo)
        return next();
    // @ts-ignore
    const userId = String(ctx.user?.user_id);
    const phone = String(ctx.contactInfo.tel);
    console.log('Получен контакт:', userId, phone); // <-- лог в терминал
    savePhone(userId, phone);
    await ctx.reply('✅ Ваш номер сохранён!');
});
// /*  CreateChat keyboard  */
//
// bot.command(/createChat(.+)?/, async (ctx) => {
//     const chatTitle = ctx.match?.[1]?.trim();
//     if (!chatTitle) {
//         return ctx.reply('Enter chat title after command');
//     }
//     return ctx.reply('Create chat keyboard', {
//         attachments: [
//             Keyboard.inlineKeyboard([[
//                 Keyboard.button.chat(`Create chat "${chatTitle}"`, chatTitle),
//             ]]),
//         ],
//     });
// });
bot.start();

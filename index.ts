import 'dotenv/config';
import {Bot, Keyboard} from '@maxhub/max-bot-api';
import {deleteUserById, getAllUsers, getUserByPhone, savePhone} from "./db.js";
import express from 'express';

const bot = new Bot(process.env.BOT_TOKEN!);
const app = express();

app.use(express.json())


import type { Request, Response, NextFunction } from 'express';

function basicAuth(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    if (
        username !== process.env.WEBHOOK_BASIC_USER ||
        password !== process.env.WEBHOOK_BASIC_PASSWORD
    ) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    next();
}

app.post('/events', basicAuth, async (req, res) => {
    const event = req.body;

    console.log('=== WEBHOOK EVENT ===');
    console.log(JSON.stringify(event, null, 2));

    const phone = event.phone;
    const data = event.data;

    const message = data.code && !data.message ? `Код доступа к документам: ${data.code}` : `F.Doc. Для вас сформирован комплект документов. Чтобы открыть его, нажмите на кнопку ниже.`;

    if (!phone) {
        return res.status(400).json({ error: 'phone is required' });
    }

    const user = getUserByPhone(phone);

    if (!user) {
        console.log('Пользователь не найден:', phone);
        return res.json({ status: 'user_not_found' });
    }

    try {
        await bot.api.sendMessageToUser(Number(user.user_id), message, {attachments: [
                Keyboard.inlineKeyboard([
                    data.message ? [Keyboard.button.link('➡️ Перейти к документам', data.message)] : [],
                ]),
            ],});
    } catch (e) {
        // @ts-ignore
        if (e.status === 403) {
            deleteUserById(user.user_id)
        }
        console.log('Ошибка при отправке сообщения: ', e);
    }


    console.log('ALL USERS: ', getAllUsers());
    res.json({ status: 'delivered' });
});


bot.api.setMyCommands([
    { name: 'start', description: 'Запустить бота' },
    { name: 'esia', description: 'Открыть авторизацию по ESIA' },
    { name: 'gosuslugi', description: 'Открыть госуслуги' },
    {name: 'permalink', description: 'Пермалинк на меде с верификацией'}
]);



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
    if (!ctx.contactInfo) return next();
    // @ts-ignore
    const userId = String(ctx.user?.user_id);
    const phone = String(ctx.contactInfo.tel)
    console.log('Получен контакт:', userId, phone);
    savePhone(userId, phone);
    await ctx.reply('✅ Ваш номер сохранён!');
});

bot.command('esia', async (ctx) => {
    return ctx.reply('Чтобы авторизоваться в ЕСИА, нажмите на кнопку ниже:', {
        attachments: [
            Keyboard.inlineKeyboard([
                [Keyboard.button.link('Авторизоваться в ЕСИА12', 'https://esia-portal.gosuslugi.ru/aas/oauth2/ac?client_id=FD5470')],
                // [Keyboard.button.link('Авторизоваться в ЕСИА', 'https://esia-portal1.test.gosuslugi.ru/aas/oauth2/ac?client_id=FD5470&client_secret=MIILCgYJKoZIhvcNAQcCoIIK%2BzCCCvcCAQExDDAKBgYqhQMCAgkFADALBgkqhkiG9w0BBwGgggjQMIIIzDCCCHmgAwIBAgIRAsD54wC%2Fsqy7TUcLJmd%2B6egwCgYIKoUDBwEBAwIwggGBMRUwEwYFKoUDZAQSCjc3MDcwNDkzODgxGDAWBgUqhQNkARINMTAyNzcwMDE5ODc2NzELMAkGA1UEBhMCUlUxKTAnBgNVBAgMIDc4INCh0LDQvdC60YIt0J%2FQtdGC0LXRgNCx0YPRgNCzMSYwJAYDVQQHDB3QodCw0L3QutGCLdCf0LXRgtC10YDQsdGD0YDQszGBnjCBmwYDVQQJDIGT0LzRg9C90LjRhtC40L%2FQsNC70YzQvdGL0Lkg0L7QutGA0YPQsyDQodC80L7Qu9GM0L3QuNC90YHQutC%2B0LUg0JLQnS7QotCV0KAu0JMuLCDQodC40L3QvtC%2F0YHQutCw0Y8g0L3QsNCx0LXRgNC10LbQvdCw0Y8sINC00L7QvCAxNCwg0LvQuNGC0LXRgNCwINCQMSYwJAYDVQQKDB3Qn9CQ0J4gItCg0L7RgdGC0LXQu9C10LrQvtC8IjElMCMGA1UEAwwc0KLQtdGB0YLQvtCy0YvQuSDQo9CmINCg0KLQmjAeFw0yNTA0MTQxMzQwMDJaFw0yNjA0MTQxMzUwMDJaMIIBljEVMBMGBSqFA2QEEgowMDAwMDAwMDAwMSQwIgYJKoZIhvcNAQkBFhVFc2lhVGVzdDAwNkB5YW5kZXgucnUxGjAYBggqhQMDgQMBARIMNjcxNzQyMzU4ODMwMRYwFAYFKoUDZAMSCzAwMDAwMDYwMDA2MRgwFgYFKoUDZAESDTIwMDAwMDAwMDAwMDIxGzAZBgNVBAwMEtCh0L7RgtGA0YPQtNC90LjQujEsMCoGA1UECgwj0KLQtdGB0YLQvtCy0L7QtSDQstC10LTQvtC80YHRgtCy0L4xCjAIBgNVBAkMAS0xFTATBgNVBAcMDNCc0L7RgdC60LLQsDEcMBoGA1UECAwTNzcg0LMuINCc0L7RgdC60LLQsDELMAkGA1UEBhMCUlUxJjAkBgNVBCoMHdCY0LzRjzAwNiDQntGC0YfQtdGB0YLQstC%2BMDA2MRowGAYDVQQEDBHQpNCw0LzQuNC70LjRjzAwNjEsMCoGA1UEAwwj0KLQtdGB0YLQvtCy0L7QtSDQstC10LTQvtC80YHRgtCy0L4wZjAfBggqhQMHAQEBATATBgcqhQMCAiQABggqhQMHAQECAgNDAARAPq8tbC3uDsf5s%2F2zA4ToRkhX9F2NsJuSPT%2BVBfa%2BFKcMRO1MXs0Z6PI6YHJIvRrLNX0ZFy2MjmfhZAwohca6TaOCBKowggSmMA4GA1UdDwEB%2FwQEAwID%2BDAdBgNVHQ4EFgQUWupGQzcfXX8XtHFng14JIFCpNjYwHQYDVR0lBBYwFAYIKwYBBQUHAwIGCCsGAQUFBwMEMFQGCCsGAQUFBwEBBEgwRjBEBggrBgEFBQcwAoY4aHR0cDovL2NlcnRlbnJvbGwudGVzdC5nb3N1c2x1Z2kucnUvY2RwL3Rlc3RfY2FfcnRrMy5jZXIwHQYDVR0gBBYwFDAIBgYqhQNkcQEwCAYGKoUDZHECMCsGA1UdEAQkMCKADzIwMjUwNDE0MTM0MDAyWoEPMjAyNjA0MTQxMzQwMDJaMIIBNwYFKoUDZHAEggEsMIIBKAwyItCa0YDQuNC%2F0YLQvtCf0YDQviBDU1AgNC4wIFI0IiAo0LLQtdGA0YHQuNGPIDQuMCkMLCLQmtGA0LjQv9GC0L7Qn9GA0L4g0KPQpiIgKNCy0LXRgNGB0LjQuCAyLjApDGHQodC10YDRgtC40YTQuNC60LDRgtGLINGB0L7QvtGC0LLQtdGC0YHRgtCy0LjRjyDQpNCh0JEg0KDQvtGB0YHQuNC4INCh0KQvMTI0LTM5NzEg0L7RgiAxNS4wMS4yMDIxDGHQodC10YDRgtC40YTQuNC60LDRgtGLINGB0L7QvtGC0LLQtdGC0YHRgtCy0LjRjyDQpNCh0JEg0KDQvtGB0YHQuNC4INCh0KQvMTI4LTQzNzYg0L7RgiAyOC4xMC4yMDIyMD0GBSqFA2RvBDQMMiLQmtGA0LjQv9GC0L7Qn9GA0L4gQ1NQIDQuMCBSNCIgKNCy0LXRgNGB0LjRjyA0LjApMGUGA1UdHwReMFwwWqBYoFaGVGh0dHA6Ly9jZXJ0ZW5yb2xsLnRlc3QuZ29zdXNsdWdpLnJ1L2NkcC9iMGZkOGViOTU5ZDk0ODlkNWI3YjRjMTQzYTA2Y2FkNzk1MmEwNzQ0LmNybDAMBgUqhQNkcgQDAgEAMIIBwwYDVR0jBIIBujCCAbaAFLD9jrlZ2UidW3tMFDoGyteVKgdEoYIBiaSCAYUwggGBMRUwEwYFKoUDZAQSCjc3MDcwNDkzODgxGDAWBgUqhQNkARINMTAyNzcwMDE5ODc2NzELMAkGA1UEBhMCUlUxKTAnBgNVBAgMIDc4INCh0LDQvdC60YIt0J%2FQtdGC0LXRgNCx0YPRgNCzMSYwJAYDVQQHDB3QodCw0L3QutGCLdCf0LXRgtC10YDQsdGD0YDQszGBnjCBmwYDVQQJDIGT0LzRg9C90LjRhtC40L%2FQsNC70YzQvdGL0Lkg0L7QutGA0YPQsyDQodC80L7Qu9GM0L3QuNC90YHQutC%2B0LUg0JLQnS7QotCV0KAu0JMuLCDQodC40L3QvtC%2F0YHQutCw0Y8g0L3QsNCx0LXRgNC10LbQvdCw0Y8sINC00L7QvCAxNCwg0LvQuNGC0LXRgNCwINCQMSYwJAYDVQQKDB3Qn9CQ0J4gItCg0L7RgdGC0LXQu9C10LrQvtC8IjElMCMGA1UEAwwc0KLQtdGB0YLQvtCy0YvQuSDQo9CmINCg0KLQmoIRAtGQqQCIsFiWS3yUT9DfFhcwCgYIKoUDBwEBAwIDQQA4eTA3mYF1BGNHtOL0mNT3yJjrw%2FCLL6IMdYhg5q%2BvzSbTvi0pnP6AE093KI07ascV7sXEo80iRKM1lCtlmrC%2FMYICATCCAf0CAQEwggGYMIIBgTEVMBMGBSqFA2QEEgo3NzA3MDQ5Mzg4MRgwFgYFKoUDZAESDTEwMjc3MDAxOTg3NjcxCzAJBgNVBAYTAlJVMSkwJwYDVQQIDCA3OCDQodCw0L3QutGCLdCf0LXRgtC10YDQsdGD0YDQszEmMCQGA1UEBwwd0KHQsNC90LrRgi3Qn9C10YLQtdGA0LHRg9GA0LMxgZ4wgZsGA1UECQyBk9C80YPQvdC40YbQuNC%2F0LDQu9GM0L3Ri9C5INC%2B0LrRgNGD0LMg0KHQvNC%2B0LvRjNC90LjQvdGB0LrQvtC1INCS0J0u0KLQldCgLtCTLiwg0KHQuNC90L7Qv9GB0LrQsNGPINC90LDQsdC10YDQtdC20L3QsNGPLCDQtNC%2B0LwgMTQsINC70LjRgtC10YDQsCDQkDEmMCQGA1UECgwd0J%2FQkNCeICLQoNC%2B0YHRgtC10LvQtdC60L7QvCIxJTAjBgNVBAMMHNCi0LXRgdGC0L7QstGL0Lkg0KPQpiDQoNCi0JoCEQLA%2BeMAv7Ksu01HCyZnfunoMAwGCCqFAwcBAQICBQAwDAYIKoUDBwEBAQEFAARAGt%2F7fHRmXUCg4wqSpjH9rdH8KFxi7F8gwHsatM7Iz4c%2FAwqr7ZfAM6g52aC3nAsMaQKdQ4GK1%2F2rRnv1cn8Qvw&scope=openid+fullname+birthdate+snils+id_doc+mobile+gender&state=6cb71272-d7ec-4c04-90c4-6f36b014c750&timestamp=2026.02.02+17%3A37%3A05+%2B0700&redirect_uri=https%3A%2F%2Fdemo.fdoc.ru%2Ff%2Fclient%2Fesia-return&response_type=code&access_type=offline&person_filter=Y29uZl9hY2M%3D')],
            ]),
        ],
    });
});

bot.command('gosuslugi', async (ctx) => {
    return ctx.reply('Чтобы открыть госуслуги, нажмите на кнопку ниже:', {
        attachments: [
            Keyboard.inlineKeyboard([
                [Keyboard.button.link('Открыть госуслуги', 'https://lk.gosuslugi.ru/notifications')],
                // [Keyboard.button.link('Авторизоваться в ЕСИА', 'https://esia-portal1.test.gosuslugi.ru/aas/oauth2/ac?client_id=FD5470&client_secret=MIILCgYJKoZIhvcNAQcCoIIK%2BzCCCvcCAQExDDAKBgYqhQMCAgkFADALBgkqhkiG9w0BBwGgggjQMIIIzDCCCHmgAwIBAgIRAsD54wC%2Fsqy7TUcLJmd%2B6egwCgYIKoUDBwEBAwIwggGBMRUwEwYFKoUDZAQSCjc3MDcwNDkzODgxGDAWBgUqhQNkARINMTAyNzcwMDE5ODc2NzELMAkGA1UEBhMCUlUxKTAnBgNVBAgMIDc4INCh0LDQvdC60YIt0J%2FQtdGC0LXRgNCx0YPRgNCzMSYwJAYDVQQHDB3QodCw0L3QutGCLdCf0LXRgtC10YDQsdGD0YDQszGBnjCBmwYDVQQJDIGT0LzRg9C90LjRhtC40L%2FQsNC70YzQvdGL0Lkg0L7QutGA0YPQsyDQodC80L7Qu9GM0L3QuNC90YHQutC%2B0LUg0JLQnS7QotCV0KAu0JMuLCDQodC40L3QvtC%2F0YHQutCw0Y8g0L3QsNCx0LXRgNC10LbQvdCw0Y8sINC00L7QvCAxNCwg0LvQuNGC0LXRgNCwINCQMSYwJAYDVQQKDB3Qn9CQ0J4gItCg0L7RgdGC0LXQu9C10LrQvtC8IjElMCMGA1UEAwwc0KLQtdGB0YLQvtCy0YvQuSDQo9CmINCg0KLQmjAeFw0yNTA0MTQxMzQwMDJaFw0yNjA0MTQxMzUwMDJaMIIBljEVMBMGBSqFA2QEEgowMDAwMDAwMDAwMSQwIgYJKoZIhvcNAQkBFhVFc2lhVGVzdDAwNkB5YW5kZXgucnUxGjAYBggqhQMDgQMBARIMNjcxNzQyMzU4ODMwMRYwFAYFKoUDZAMSCzAwMDAwMDYwMDA2MRgwFgYFKoUDZAESDTIwMDAwMDAwMDAwMDIxGzAZBgNVBAwMEtCh0L7RgtGA0YPQtNC90LjQujEsMCoGA1UECgwj0KLQtdGB0YLQvtCy0L7QtSDQstC10LTQvtC80YHRgtCy0L4xCjAIBgNVBAkMAS0xFTATBgNVBAcMDNCc0L7RgdC60LLQsDEcMBoGA1UECAwTNzcg0LMuINCc0L7RgdC60LLQsDELMAkGA1UEBhMCUlUxJjAkBgNVBCoMHdCY0LzRjzAwNiDQntGC0YfQtdGB0YLQstC%2BMDA2MRowGAYDVQQEDBHQpNCw0LzQuNC70LjRjzAwNjEsMCoGA1UEAwwj0KLQtdGB0YLQvtCy0L7QtSDQstC10LTQvtC80YHRgtCy0L4wZjAfBggqhQMHAQEBATATBgcqhQMCAiQABggqhQMHAQECAgNDAARAPq8tbC3uDsf5s%2F2zA4ToRkhX9F2NsJuSPT%2BVBfa%2BFKcMRO1MXs0Z6PI6YHJIvRrLNX0ZFy2MjmfhZAwohca6TaOCBKowggSmMA4GA1UdDwEB%2FwQEAwID%2BDAdBgNVHQ4EFgQUWupGQzcfXX8XtHFng14JIFCpNjYwHQYDVR0lBBYwFAYIKwYBBQUHAwIGCCsGAQUFBwMEMFQGCCsGAQUFBwEBBEgwRjBEBggrBgEFBQcwAoY4aHR0cDovL2NlcnRlbnJvbGwudGVzdC5nb3N1c2x1Z2kucnUvY2RwL3Rlc3RfY2FfcnRrMy5jZXIwHQYDVR0gBBYwFDAIBgYqhQNkcQEwCAYGKoUDZHECMCsGA1UdEAQkMCKADzIwMjUwNDE0MTM0MDAyWoEPMjAyNjA0MTQxMzQwMDJaMIIBNwYFKoUDZHAEggEsMIIBKAwyItCa0YDQuNC%2F0YLQvtCf0YDQviBDU1AgNC4wIFI0IiAo0LLQtdGA0YHQuNGPIDQuMCkMLCLQmtGA0LjQv9GC0L7Qn9GA0L4g0KPQpiIgKNCy0LXRgNGB0LjQuCAyLjApDGHQodC10YDRgtC40YTQuNC60LDRgtGLINGB0L7QvtGC0LLQtdGC0YHRgtCy0LjRjyDQpNCh0JEg0KDQvtGB0YHQuNC4INCh0KQvMTI0LTM5NzEg0L7RgiAxNS4wMS4yMDIxDGHQodC10YDRgtC40YTQuNC60LDRgtGLINGB0L7QvtGC0LLQtdGC0YHRgtCy0LjRjyDQpNCh0JEg0KDQvtGB0YHQuNC4INCh0KQvMTI4LTQzNzYg0L7RgiAyOC4xMC4yMDIyMD0GBSqFA2RvBDQMMiLQmtGA0LjQv9GC0L7Qn9GA0L4gQ1NQIDQuMCBSNCIgKNCy0LXRgNGB0LjRjyA0LjApMGUGA1UdHwReMFwwWqBYoFaGVGh0dHA6Ly9jZXJ0ZW5yb2xsLnRlc3QuZ29zdXNsdWdpLnJ1L2NkcC9iMGZkOGViOTU5ZDk0ODlkNWI3YjRjMTQzYTA2Y2FkNzk1MmEwNzQ0LmNybDAMBgUqhQNkcgQDAgEAMIIBwwYDVR0jBIIBujCCAbaAFLD9jrlZ2UidW3tMFDoGyteVKgdEoYIBiaSCAYUwggGBMRUwEwYFKoUDZAQSCjc3MDcwNDkzODgxGDAWBgUqhQNkARINMTAyNzcwMDE5ODc2NzELMAkGA1UEBhMCUlUxKTAnBgNVBAgMIDc4INCh0LDQvdC60YIt0J%2FQtdGC0LXRgNCx0YPRgNCzMSYwJAYDVQQHDB3QodCw0L3QutGCLdCf0LXRgtC10YDQsdGD0YDQszGBnjCBmwYDVQQJDIGT0LzRg9C90LjRhtC40L%2FQsNC70YzQvdGL0Lkg0L7QutGA0YPQsyDQodC80L7Qu9GM0L3QuNC90YHQutC%2B0LUg0JLQnS7QotCV0KAu0JMuLCDQodC40L3QvtC%2F0YHQutCw0Y8g0L3QsNCx0LXRgNC10LbQvdCw0Y8sINC00L7QvCAxNCwg0LvQuNGC0LXRgNCwINCQMSYwJAYDVQQKDB3Qn9CQ0J4gItCg0L7RgdGC0LXQu9C10LrQvtC8IjElMCMGA1UEAwwc0KLQtdGB0YLQvtCy0YvQuSDQo9CmINCg0KLQmoIRAtGQqQCIsFiWS3yUT9DfFhcwCgYIKoUDBwEBAwIDQQA4eTA3mYF1BGNHtOL0mNT3yJjrw%2FCLL6IMdYhg5q%2BvzSbTvi0pnP6AE093KI07ascV7sXEo80iRKM1lCtlmrC%2FMYICATCCAf0CAQEwggGYMIIBgTEVMBMGBSqFA2QEEgo3NzA3MDQ5Mzg4MRgwFgYFKoUDZAESDTEwMjc3MDAxOTg3NjcxCzAJBgNVBAYTAlJVMSkwJwYDVQQIDCA3OCDQodCw0L3QutGCLdCf0LXRgtC10YDQsdGD0YDQszEmMCQGA1UEBwwd0KHQsNC90LrRgi3Qn9C10YLQtdGA0LHRg9GA0LMxgZ4wgZsGA1UECQyBk9C80YPQvdC40YbQuNC%2F0LDQu9GM0L3Ri9C5INC%2B0LrRgNGD0LMg0KHQvNC%2B0LvRjNC90LjQvdGB0LrQvtC1INCS0J0u0KLQldCgLtCTLiwg0KHQuNC90L7Qv9GB0LrQsNGPINC90LDQsdC10YDQtdC20L3QsNGPLCDQtNC%2B0LwgMTQsINC70LjRgtC10YDQsCDQkDEmMCQGA1UECgwd0J%2FQkNCeICLQoNC%2B0YHRgtC10LvQtdC60L7QvCIxJTAjBgNVBAMMHNCi0LXRgdGC0L7QstGL0Lkg0KPQpiDQoNCi0JoCEQLA%2BeMAv7Ksu01HCyZnfunoMAwGCCqFAwcBAQICBQAwDAYIKoUDBwEBAQEFAARAGt%2F7fHRmXUCg4wqSpjH9rdH8KFxi7F8gwHsatM7Iz4c%2FAwqr7ZfAM6g52aC3nAsMaQKdQ4GK1%2F2rRnv1cn8Qvw&scope=openid+fullname+birthdate+snils+id_doc+mobile+gender&state=6cb71272-d7ec-4c04-90c4-6f36b014c750&timestamp=2026.02.02+17%3A37%3A05+%2B0700&redirect_uri=https%3A%2F%2Fdemo.fdoc.ru%2Ff%2Fclient%2Fesia-return&response_type=code&access_type=offline&person_filter=Y29uZl9hY2M%3D')],
            ]),
        ],
    });
});

bot.command('permalink', async (ctx) => {
    return ctx.reply('Чтобы открыть пермалинк с ЕСИА, нажмите на кнпоку ниже:', {
        attachments: [
            Keyboard.inlineKeyboard([
                [Keyboard.button.link('Открыть пермалинк', 'https://m.fdoc.ru/client/y16Umda8/identification')],
            ]),
        ],
    });
});

bot.on('bot_removed', (ctx) => {
    console.log('BOT REMOVED', ctx)
});

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Webhook API запущено на http://localhost:${PORT}`);
});

bot.start();
console.log('ALL USERS', getAllUsers())
console.log('Бот запущен')
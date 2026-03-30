const yandexMetrikaId =
  process.env.NUXT_PUBLIC_YANDEX_METRIKA_ID ||
  process.env.YANDEX_METRIKA_ID ||
  '108302299'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: process.env.NODE_ENV !== 'production' },
  app: {
    head: {
      htmlAttrs: {
        lang: 'ru'
      },
      noscript: [
        {
          children: `<div><img src="https://mc.yandex.ru/watch/${yandexMetrikaId}" style="position:absolute; left:-9999px;" alt="" /></div>`
        }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'shortcut icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '120x120', href: '/favicon-120x120.png' },
        { rel: 'apple-touch-icon', sizes: '120x120', href: '/favicon-120x120.png' }
      ]
    }
  },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || process.env.TG_BOT,
    telegramChatId: process.env.TELEGRAM_CHAT_ID,
    telegramReviewChatId: process.env.TELEGRAM_REVIEW_CHAT_ID,
    telegramAdminIds: process.env.TELEGRAM_ADMIN_IDS || process.env.TG_ADMIN_IDS,
    vkBotToken: process.env.VK_BOT_TOKEN,
    vkPeerIds: process.env.VK_PEER_IDS,
    vkReviewPeerIds: process.env.VK_REVIEW_PEER_IDS,
    vkApiVersion: process.env.VK_API_VERSION || '5.199',
    vkApiBaseUrl: process.env.VK_API_BASE_URL || 'https://api.vk.com/method',
    adminCredential: process.env.ADMIN_CREDENTIAL || 'malinaAdminP',
    adminSessionDays: Number(process.env.ADMIN_SESSION_DAYS || 14),
    publicSiteUrl: process.env.PUBLIC_SITE_URL || '',
    public: {
      siteName: 'МАЛИНА',
      siteUrl: process.env.PUBLIC_SITE_URL || '',
      yandexMetrikaId
    }
  }
})

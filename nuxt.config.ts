// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: process.env.NODE_ENV !== 'production' },
  app: {
    head: {
      htmlAttrs: {
        lang: 'ru'
      },
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' }
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
    adminCredential: process.env.ADMIN_CREDENTIAL || 'malinaAdminP',
    adminSessionDays: Number(process.env.ADMIN_SESSION_DAYS || 14),
    publicSiteUrl: process.env.PUBLIC_SITE_URL || '',
    public: {
      siteName: 'МАЛИНА',
      siteUrl: process.env.PUBLIC_SITE_URL || ''
    }
  }
})

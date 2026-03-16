// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || process.env.TG_BOT,
    telegramChatId: process.env.TELEGRAM_CHAT_ID,
    telegramReviewChatId: process.env.TELEGRAM_REVIEW_CHAT_ID,
    telegramAdminIds: process.env.TELEGRAM_ADMIN_IDS || process.env.TG_ADMIN_IDS,
    adminCredential: process.env.ADMIN_CREDENTIAL || 'malinaAdminP',
    adminSessionDays: Number(process.env.ADMIN_SESSION_DAYS || 14),
    publicSiteUrl: process.env.PUBLIC_SITE_URL || ''
  }
})

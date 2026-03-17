import { prisma } from '../../../utils/prisma'
import { verifyReviewModerationToken } from '../../../utils/admin-auth'

const renderHtml = (title: string, message: string, linkUrl: string, linkText: string) => `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: "Nunito", "Segoe UI", sans-serif;
        background: linear-gradient(160deg, #fff9fb 0%, #fff2f7 48%, #f8fcef 100%);
        color: #2f1c26;
      }
      .box {
        width: min(92vw, 560px);
        border: 1px solid rgba(198, 58, 107, 0.2);
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 20px 40px rgba(145, 36, 76, 0.14);
        padding: 1.25rem;
      }
      h1 {
        margin: 0 0 0.65rem;
        font-size: 1.4rem;
      }
      p {
        margin: 0;
        line-height: 1.55;
        color: #513b47;
      }
      a {
        margin-top: 1rem;
        display: inline-flex;
        text-decoration: none;
        border-radius: 10px;
        padding: 0.6rem 0.85rem;
        background: #c63a6b;
        color: #fff;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main class="box">
      <h1>${title}</h1>
      <p>${message}</p>
      <a href="${linkUrl}">${linkText}</a>
    </main>
  </body>
</html>`

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  const config = useRuntimeConfig(event)
  const siteUrl = String(config.publicSiteUrl || '').trim() || '/'
  const adminUrl = siteUrl === '/' ? '/admin' : `${siteUrl}/admin`

  if (!token) {
    setResponseHeader(event, 'content-type', 'text/html; charset=utf-8')
    return renderHtml('Ошибка', 'Ссылка модерации не содержит токен.', adminUrl, 'Открыть админ-панель')
  }

  const payload = verifyReviewModerationToken(event, token)
  if (!payload) {
    setResponseHeader(event, 'content-type', 'text/html; charset=utf-8')
    return renderHtml('Ссылка недействительна', 'Срок действия ссылки истек или она повреждена.', adminUrl, 'Открыть админ-панель')
  }

  const exists = await prisma.review.findUnique({
    where: { id: payload.reviewId },
    select: { id: true }
  })

  if (!exists) {
    setResponseHeader(event, 'content-type', 'text/html; charset=utf-8')
    return renderHtml('Отзыв не найден', 'Запись не существует или была удалена.', adminUrl, 'Открыть админ-панель')
  }

  await prisma.review.update({
    where: { id: payload.reviewId },
    data: {
      approved: payload.approved,
      moderatedAt: new Date()
    }
  })

  const statusText = payload.approved ? 'подтвержден' : 'отклонен'
  setResponseHeader(event, 'content-type', 'text/html; charset=utf-8')
  return renderHtml('Готово', `Отзыв успешно ${statusText}.`, adminUrl, 'Перейти в админ-панель')
})

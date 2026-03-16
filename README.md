# МАЛИНА — десерты на заказ

Nuxt 4 сайт с каталогом, модалками ТТК, галереей, Telegram-ботом и админ-панелью.

## Что реализовано

- PostgreSQL + Prisma для хранения:
  - каталога десертов
  - фотографий (галерея + фото десертов)
  - отзывов (с модерацией)
  - заявок
- Админ-панель `/admin` с полным CRUD по десертам/фото/отзывам и просмотром заявок
- Авторизация админки:
  - логин: `malinaAdminP`
  - пароль: `malinaAdminP`
- Telegram модерация отзывов:
  - кнопки `Принять` / `Отклонить` прямо под сообщением
  - кнопка с авто-входом в админку
- Отдельный bot service (`bot/index.mjs`) для polling Telegram и пересылки update в API

## Локальный запуск

```bash
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed
npm run dev
```

## Переменные окружения

```bash
DATABASE_URL=postgresql://malina:malinaAdminP@localhost:5433/malina?schema=public

TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
TELEGRAM_REVIEW_CHAT_ID=...
TELEGRAM_ADMIN_IDS=502773482
TELEGRAM_PROXY_URL=http://login:password@host:port

ADMIN_CREDENTIAL=malinaAdminP
ADMIN_SESSION_DAYS=14
PUBLIC_SITE_URL=http://localhost:3000

# для bot service
BOT_FORWARD_URL=http://localhost:3000/api/telegram/webhook
```

Если на сервере заблокирован прямой доступ к Telegram, задайте `TELEGRAM_PROXY_URL` и перезапустите `web` + `bot`.

## Docker production

Файлы:
- `Dockerfile`
- `docker-compose-prod.yml`

Запуск:

```bash
docker compose -f docker-compose-prod.yml up -d --build
```

Под ваш nginx (`proxy_pass http://127.0.0.1:4015/`) сервис `web` уже настроен на bind:

```yaml
ports:
  - "127.0.0.1:4015:3000"
```

Обязательно задайте в `.env`:

```bash
PUBLIC_SITE_URL=https://malina.kiruhak11.ru
```

Сервисы в compose:
- `db` — PostgreSQL
- `web` — Nuxt/Nitro сайт + API
- `bot` — Telegram polling worker

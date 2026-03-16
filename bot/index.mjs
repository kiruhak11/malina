import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const loadEnvFile = () => {
  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) {
    return
  }

  const raw = readFileSync(envPath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue
    }

    const separatorIndex = trimmed.indexOf('=')
    const key = trimmed.slice(0, separatorIndex).trim()
    if (!key || process.env[key] !== undefined) {
      continue
    }

    let value = trimmed.slice(separatorIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    process.env[key] = value
  }
}

loadEnvFile()

const token = process.env.TELEGRAM_BOT_TOKEN || process.env.TG_BOT
const forwardUrl = process.env.BOT_FORWARD_URL || 'http://web:3000/api/telegram/webhook'
const timeoutSec = Number(process.env.BOT_POLL_TIMEOUT || 50)

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN не задан. Бот остановлен.')
  process.exit(1)
}

let offset = Number(process.env.BOT_OFFSET || 0)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const telegramRequest = async (method, body) => {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    throw new Error(`Telegram HTTP ${response.status}`)
  }

  const payload = await response.json()
  if (!payload.ok) {
    throw new Error(`Telegram API ${method} failed`)
  }

  return payload.result || []
}

const ensurePollingMode = async () => {
  try {
    await telegramRequest('deleteWebhook', { drop_pending_updates: false })
  } catch (error) {
    console.error('deleteWebhook error:', error)
  }
}

const forwardUpdate = async (update) => {
  const response = await fetch(forwardUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(update)
  })

  if (!response.ok) {
    throw new Error(`Forward HTTP ${response.status}`)
  }
}

const run = async () => {
  await ensurePollingMode()
  console.log(`Bot polling started. Forward: ${forwardUrl}`)

  while (true) {
    try {
      const updates = await telegramRequest('getUpdates', {
        offset,
        timeout: timeoutSec,
        allowed_updates: ['message', 'callback_query']
      })

      for (const update of updates) {
        offset = update.update_id + 1

        try {
          await forwardUpdate(update)
        } catch (error) {
          console.error('Forward error:', error)
          await sleep(1200)
        }
      }
    } catch (error) {
      console.error('Polling error:', error)
      await sleep(2500)
    }
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})

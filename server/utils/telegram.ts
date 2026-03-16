import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

type TelegramApiResponse<TResponse> = {
  ok: boolean
  result?: TResponse
  description?: string
  error_code?: number
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const telegramRequest = async <TResponse = unknown>(
  token: string,
  method: string,
  body: Record<string, unknown>
) => {
  const attempts = 3
  let lastError: unknown = null

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await $fetch<TelegramApiResponse<TResponse>>(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        body
      })

      if (!response.ok) {
        throw new Error(
          `Telegram API ${method} failed${response.error_code ? ` (${response.error_code})` : ''}: ${response.description || 'unknown error'}`
        )
      }

      return response.result as TResponse
    } catch (error: unknown) {
      const payloadDescription =
        (error as { data?: { description?: string; error_code?: number } })?.data?.description || null
      const payloadCode = (error as { data?: { error_code?: number } })?.data?.error_code || null
      const message = error instanceof Error ? error.message : String(error)
      const causeMessage =
        (error as { cause?: { message?: string; code?: string; errno?: number } })?.cause?.message ||
        (error as { cause?: { code?: string; errno?: number } })?.cause?.code ||
        ''
      const fullMessage = `Telegram API ${method} request failed${payloadCode ? ` (${payloadCode})` : ''}: ${payloadDescription || message}${causeMessage ? `; cause: ${causeMessage}` : ''}`

      const isRetryableNetworkError =
        fullMessage.includes('fetch failed') ||
        fullMessage.includes('ETIMEDOUT') ||
        fullMessage.includes('ECONNRESET') ||
        fullMessage.includes('EAI_AGAIN')

      lastError = new Error(fullMessage)

      if (!isRetryableNetworkError || attempt === attempts) {
        throw lastError
      }

      await sleep(350 * attempt)
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Telegram API ${method} request failed`)
}

type SendTelegramMessageOptions = {
  replyMarkup?: Record<string, unknown>
  disableWebPagePreview?: boolean
}

export const sendTelegramMessage = async (
  token: string,
  chatId: string,
  text: string,
  options: SendTelegramMessageOptions = {}
) =>
  telegramRequest<{ message_id: number }>(token, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: options.disableWebPagePreview ?? true,
    reply_markup: options.replyMarkup
  })

export const fetchTelegramFile = async (token: string, fileId: string) => {
  const fileInfo = await telegramRequest<{ file_path?: string }>(token, 'getFile', { file_id: fileId })

  const filePath = fileInfo.file_path
  if (!filePath) {
    throw new Error('Telegram не вернул путь к файлу.')
  }

  const fileBuffer = await $fetch<ArrayBuffer>(`https://api.telegram.org/file/bot${token}/${filePath}`, {
    responseType: 'arrayBuffer'
  })

  return {
    filePath,
    data: Buffer.from(fileBuffer)
  }
}

export const saveTelegramImage = async (buffer: Buffer, targetPath: string) => {
  await mkdir(dirname(targetPath), { recursive: true })
  await writeFile(targetPath, buffer)
}

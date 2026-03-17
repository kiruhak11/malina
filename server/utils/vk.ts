import { randomInt } from 'node:crypto'

type VkApiErrorPayload = {
  error_code?: number
  error_msg?: string
}

type VkApiResponse<TResponse> = {
  response?: TResponse
  error?: VkApiErrorPayload
}

type VkKeyboardActionOpenLink = {
  type: 'open_link'
  label: string
  link: string
}

type VkKeyboardButton = {
  action: VkKeyboardActionOpenLink
}

type VkKeyboard = {
  one_time?: boolean
  inline?: boolean
  buttons: VkKeyboardButton[][]
}

type SendVkMessageOptions = {
  keyboard?: VkKeyboard
}

const VK_HTTP_TIMEOUT_MS = Number(process.env.VK_HTTP_TIMEOUT_MS || 15000)
const DEFAULT_VK_API_BASE_URL = 'https://api.vk.com/method'
const DEFAULT_VK_API_VERSION = '5.199'

const normalizeVkApiBaseUrl = (value: string) => value.replace(/\/+$/, '')

type VkMessageTarget =
  | {
      type: 'peer_id'
      value: string
    }
  | {
      type: 'domain'
      value: string
    }

const normalizeVkTarget = (rawTarget: string): VkMessageTarget => {
  const source = String(rawTarget || '').trim().replace(/^['\"]+|['\"]+$/g, '')
  if (!source) {
    throw new Error('VK target is empty')
  }

  let normalized = source
    .replace(/^https?:\/\/(m\.)?vk\.com\//i, '')
    .replace(/^(m\.)?vk\.com\//i, '')
    .replace(/^@+/, '')
    .replace(/^\/+/, '')
    .split(/[?#]/)[0]
    .split('/')[0]
    .trim()

  if (!normalized) {
    throw new Error(`VK target is invalid: "${rawTarget}"`)
  }

  if (/^id\d+$/i.test(normalized)) {
    normalized = normalized.slice(2)
  }

  if (/^-?\d+$/.test(normalized)) {
    return {
      type: 'peer_id',
      value: normalized
    }
  }

  if (!/^[a-zA-Z0-9_.-]+$/.test(normalized)) {
    throw new Error(`VK target is invalid: "${rawTarget}"`)
  }

  return {
    type: 'domain',
    value: normalized
  }
}

export const sendVkMessage = async (
  token: string,
  target: string,
  text: string,
  apiVersion = DEFAULT_VK_API_VERSION,
  apiBaseUrl = DEFAULT_VK_API_BASE_URL,
  options: SendVkMessageOptions = {}
) => {
  const normalizedBaseUrl = normalizeVkApiBaseUrl(apiBaseUrl || DEFAULT_VK_API_BASE_URL)
  const endpoint = `${normalizedBaseUrl}/messages.send`
  const randomId = randomInt(1, 2_147_483_647)
  const normalizedTarget = normalizeVkTarget(target)

  const body = new URLSearchParams({
    random_id: String(randomId),
    message: text,
    access_token: token,
    v: apiVersion || DEFAULT_VK_API_VERSION
  })

  if (normalizedTarget.type === 'peer_id') {
    body.set('peer_id', normalizedTarget.value)
  } else {
    body.set('domain', normalizedTarget.value)
  }

  if (options.keyboard) {
    body.set('keyboard', JSON.stringify(options.keyboard))
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    },
    body,
    signal: AbortSignal.timeout(VK_HTTP_TIMEOUT_MS)
  })

  let payload: VkApiResponse<number> | null = null
  try {
    payload = (await response.json()) as VkApiResponse<number>
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new Error(`VK API messages.send failed: HTTP ${response.status}`)
  }

  if (payload?.error) {
    const errorCode = payload.error.error_code ? ` (${payload.error.error_code})` : ''
    const description = payload.error.error_msg || 'Unknown error'
    throw new Error(`VK API messages.send failed${errorCode}: ${description}`)
  }

  if (typeof payload?.response !== 'number') {
    throw new Error('VK API messages.send failed: invalid response payload')
  }

  return payload.response
}

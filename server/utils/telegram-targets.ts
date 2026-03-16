const sanitizeId = (raw: string) => raw.replace(/^['\"]+|['\"]+$/g, '').trim()

const parseIdList = (rawValue: unknown) =>
  String(rawValue || '')
    .replace(/[\[\]]/g, '')
    .split(/[,\s;]+/)
    .map((item) => sanitizeId(item))
    .filter(Boolean)

const unique = (ids: string[]) => [...new Set(ids)]

export const getAdminTelegramIds = (config: ReturnType<typeof useRuntimeConfig>) =>
  unique(parseIdList(config.telegramAdminIds || ''))

export const getOrderTelegramTargets = (config: ReturnType<typeof useRuntimeConfig>) => {
  const configured = parseIdList(config.telegramChatId || '')
  const adminIds = getAdminTelegramIds(config)
  return unique([...configured, ...adminIds])
}

export const getReviewTelegramTargets = (config: ReturnType<typeof useRuntimeConfig>) => {
  const reviewIds = parseIdList(config.telegramReviewChatId || '')
  const commonIds = parseIdList(config.telegramChatId || '')
  const adminIds = getAdminTelegramIds(config)
  return unique([...reviewIds, ...commonIds, ...adminIds])
}

const CONTROL_CHARS_RE = /[\u0000-\u001f\u007f]/g

type SanitizeOptions = {
  multiline?: boolean
}

export const sanitizeText = (value: unknown, options: SanitizeOptions = {}) => {
  const raw = String(value ?? '')
    .replace(CONTROL_CHARS_RE, ' ')
    .replace(/[<>]/g, '')

  if (options.multiline) {
    return raw
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join('\n')
      .trim()
  }

  return raw.replace(/\s+/g, ' ').trim()
}

export const isValidPhone = (value: string) => {
  const compact = value.replace(/[^\d+]/g, '')
  const digitsOnly = compact.replace(/\D/g, '')
  return digitsOnly.length >= 10 && digitsOnly.length <= 15 && /^(\+?\d[\d()+\-\s]{8,24})$/.test(value)
}

export const isValidFutureDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return false
  }

  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const targetStart = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
  const daysDiff = Math.floor((targetStart.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000))

  return daysDiff >= 0 && daysDiff <= 365
}

export const isSafePublicImagePath = (value: string) => {
  if (!value.startsWith('/')) {
    return false
  }

  if (value.includes('..') || value.includes('\\') || value.includes('\0')) {
    return false
  }

  return value.startsWith('/uploads/') || value.startsWith('/images/')
}

export const assertMaxLength = (value: string, maxLength: number) => value.length <= maxLength

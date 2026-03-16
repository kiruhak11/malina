import { getRequestIP, setResponseHeader } from 'h3'

type RateLimitOptions = {
  key: string
  limit: number
  windowMs: number
}

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

const cleanupExpiredBuckets = (now: number) => {
  if (buckets.size < 3000) {
    return
  }

  for (const [bucketKey, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(bucketKey)
    }
  }
}

export const enforceRateLimit = (event: Parameters<typeof getRequestIP>[0], options: RateLimitOptions) => {
  const now = Date.now()
  cleanupExpiredBuckets(now)

  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const bucketKey = `${options.key}:${ip}`

  const existing = buckets.get(bucketKey)
  const currentBucket: Bucket =
    existing && existing.resetAt > now
      ? existing
      : {
          count: 0,
          resetAt: now + options.windowMs
        }

  if (currentBucket.count >= options.limit) {
    const retryAfterSeconds = Math.ceil((currentBucket.resetAt - now) / 1000)
    setResponseHeader(event, 'Retry-After', String(Math.max(1, retryAfterSeconds)))
    throw createError({
      statusCode: 429,
      statusMessage: 'Слишком много запросов. Повторите попытку позже.'
    })
  }

  currentBucket.count += 1
  buckets.set(bucketKey, currentBucket)

  const remaining = Math.max(0, options.limit - currentBucket.count)
  setResponseHeader(event, 'X-RateLimit-Limit', String(options.limit))
  setResponseHeader(event, 'X-RateLimit-Remaining', String(remaining))
  setResponseHeader(event, 'X-RateLimit-Reset', String(Math.ceil(currentBucket.resetAt / 1000)))
}

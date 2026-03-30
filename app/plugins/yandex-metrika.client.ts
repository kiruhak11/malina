type YandexMetrikaFn = ((...args: unknown[]) => void) & {
  a?: unknown[][]
  l?: number
}

declare global {
  interface Window {
    dataLayer?: unknown[]
    ym?: YandexMetrikaFn
  }
}

const METRIKA_BASE_URL = 'https://mc.yandex.ru/metrika/tag.js'

const isAdminRoute = (path: string) => path.startsWith('/admin')

const toAbsoluteUrl = (path: string) => new URL(path, window.location.origin).href

const ensureCounterScript = (counterId: number) => {
  const scriptSrc = `${METRIKA_BASE_URL}?id=${counterId}`
  const hasScript = Array.from(document.scripts).some((script) => script.src === scriptSrc)

  if (hasScript) {
    return
  }

  const script = document.createElement('script')
  const firstScript = document.getElementsByTagName('script')[0]

  script.async = true
  script.src = scriptSrc

  if (firstScript?.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript)
    return
  }

  document.head.appendChild(script)
}

const ensureYm = () => {
  if (window.ym) {
    return window.ym
  }

  const ym = ((...args: unknown[]) => {
    ;(ym.a = ym.a || []).push(args)
  }) as YandexMetrikaFn

  ym.l = Date.now()
  window.ym = ym

  return ym
}

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const router = useRouter()
  const route = useRoute()
  const counterId = Number(config.public.yandexMetrikaId)

  if (!Number.isInteger(counterId) || counterId <= 0) {
    return
  }

  let initialized = false
  let lastTrackedUrl = ''

  const initCounter = () => {
    if (initialized) {
      return
    }

    window.dataLayer = window.dataLayer || []

    const ym = ensureYm()
    ensureCounterScript(counterId)

    ym(counterId, 'init', {
      ssr: true,
      webvisor: true,
      clickmap: true,
      ecommerce: 'dataLayer',
      referrer: document.referrer,
      url: window.location.href,
      accurateTrackBounce: true,
      trackLinks: true
    })

    initialized = true
    lastTrackedUrl = window.location.href
  }

  if (!isAdminRoute(route.path)) {
    initCounter()
  }

  router.afterEach((to, from) => {
    if (isAdminRoute(to.path)) {
      return
    }

    if (!initialized) {
      initCounter()
      return
    }

    window.requestAnimationFrame(() => {
      const currentUrl = toAbsoluteUrl(to.fullPath)

      if (currentUrl === lastTrackedUrl) {
        return
      }

      const referer = isAdminRoute(from.path)
        ? lastTrackedUrl || document.referrer
        : toAbsoluteUrl(from.fullPath)

      window.ym?.(counterId, 'hit', currentUrl, {
        referer,
        title: document.title
      })

      lastTrackedUrl = currentUrl
    })
  })
})

type SiteSeoInput = {
  title: string
  description: string
  path?: string
  imagePath?: string
  noindex?: boolean
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const normalizePath = (value: string) => {
  if (!value) {
    return '/'
  }
  return value.startsWith('/') ? value : `/${value}`
}

export const useSiteSeo = (input: SiteSeoInput) => {
  const route = useRoute()
  const config = useRuntimeConfig()

  const siteName = String(config.public.siteName || 'МАЛИНА')
  const baseUrl = trimTrailingSlash(String(config.public.siteUrl || ''))
  const path = normalizePath(input.path || route.path)
  const canonicalUrl = baseUrl ? `${baseUrl}${path}` : undefined

  const imagePath = normalizePath(input.imagePath || '/logo-malina.png')
  const imageUrl = baseUrl ? `${baseUrl}${imagePath}` : imagePath
  const robots = input.noindex
    ? 'noindex, nofollow, noarchive, nosnippet, noimageindex'
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'

  useSeoMeta({
    title: input.title,
    description: input.description,
    robots,
    googlebot: robots,
    ogType: 'website',
    ogLocale: 'ru_RU',
    ogSiteName: siteName,
    ogTitle: input.title,
    ogDescription: input.description,
    ogUrl: canonicalUrl,
    ogImage: imageUrl,
    twitterCard: 'summary_large_image',
    twitterTitle: input.title,
    twitterDescription: input.description,
    twitterImage: imageUrl
  })

  useHead(() => ({
    link: canonicalUrl
      ? [
          {
            rel: 'canonical',
            href: canonicalUrl
          }
        ]
      : []
  }))
}

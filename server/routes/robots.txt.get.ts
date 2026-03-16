import { getRequestHost, getRequestProtocol, setHeader } from 'h3'

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const resolveSiteUrl = (event: Parameters<typeof getRequestHost>[0]) => {
  const config = useRuntimeConfig(event)
  const configured = String(config.publicSiteUrl || config.public.siteUrl || '').trim()

  if (configured) {
    return trimTrailingSlash(configured)
  }

  return trimTrailingSlash(`${getRequestProtocol(event)}://${getRequestHost(event)}`)
}

export default defineEventHandler((event) => {
  const siteUrl = resolveSiteUrl(event)
  const robots = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api/',
    `Sitemap: ${siteUrl}/sitemap.xml`
  ].join('\n')

  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600, s-maxage=3600')

  return robots
})

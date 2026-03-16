import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { getRouterParam, setHeader } from 'h3'
import { isSafeUploadRelativePath, resolveUploadReadCandidates } from '../../utils/uploads'

const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif'
}

const resolveContentType = (relativePath: string) => MIME_BY_EXTENSION[extname(relativePath).toLowerCase()] || 'application/octet-stream'

export default defineEventHandler(async (event) => {
  const rawPath = decodeURIComponent(getRouterParam(event, 'path') || '')
  const relativePath = rawPath.replace(/^\/+/, '')

  if (!isSafeUploadRelativePath(relativePath)) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный путь к загруженному файлу.' })
  }

  for (const absolutePath of resolveUploadReadCandidates(relativePath)) {
    try {
      const file = await readFile(absolutePath)
      setHeader(event, 'content-type', resolveContentType(relativePath))
      setHeader(event, 'cache-control', 'public, max-age=3600, s-maxage=3600')
      return file
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        continue
      }
      throw error
    }
  }

  throw createError({ statusCode: 404, statusMessage: 'Файл не найден.' })
})

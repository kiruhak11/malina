import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const getUploadRoots = () => {
  const roots = [resolve(process.cwd(), 'public/uploads'), resolve(process.cwd(), '.output/public/uploads')]
  return [...new Set(roots)]
}

const UPLOAD_RELATIVE_SEGMENT_RE = /^[A-Za-z0-9._-]+$/

export const isSafeUploadRelativePath = (value: string) => {
  const normalized = value.replace(/^\/+/, '').replace(/\\/g, '/')

  if (!normalized || normalized.includes('..') || normalized.includes('\0')) {
    return false
  }

  return normalized.split('/').every((segment) => Boolean(segment) && UPLOAD_RELATIVE_SEGMENT_RE.test(segment))
}

export const resolveUploadReadCandidates = (relativePath: string) =>
  getUploadRoots().map((root) => resolve(root, relativePath))

export const buildUploadPublicPath = (scope: string, filename: string) => `/uploads/${scope}/${filename}`

export const writeUploadFile = async (scope: string, filename: string, data: Buffer) => {
  const absolutePaths = getUploadRoots().map((root) => resolve(root, scope, filename))

  const settled = await Promise.allSettled(
    absolutePaths.map(async (absolutePath) => {
      await mkdir(dirname(absolutePath), { recursive: true })
      await writeFile(absolutePath, data)
      return absolutePath
    })
  )
  const successfulPaths = settled
    .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
    .map((result) => result.value)

  if (!successfulPaths.length) {
    throw new Error('Не удалось сохранить загруженный файл в публичное хранилище.')
  }

  return {
    publicPath: buildUploadPublicPath(scope, filename),
    absolutePaths: successfulPaths
  }
}

<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'

useHead({
  title: 'Админ-панель — МАЛИНА'
})

useSeoMeta({
  robots: 'noindex, nofollow, noarchive, nosnippet, noimageindex',
  googlebot: 'noindex, nofollow, noarchive, nosnippet, noimageindex'
})

type AdminDessert = {
  id: string
  slug: string
  category: string
  name: string
  description: string
  inside: string
  decor: string
  price: string
  leadTimeHours: number | null
  active: boolean
  ttk: {
    kbju: {
      proteins: string | null
      fats: string | null
      carbs: string | null
      kcal: string | null
    }
  }
  holidaySectionSlugs: string[]
}

type AdminHolidaySection = {
  id: string
  name: string
  slug: string
  active: boolean
  sortOrder: number
  isCurrentHoliday: boolean
  icon: string | null
  activeFrom: string | null
  activeTo: string | null
  dessertCount: number
}

type AdminPhoto = {
  id: string
  path: string
  title: string
  inGallery: boolean
  source: 'seed' | 'telegram' | 'admin'
  dessertSlug: string | null
  dessertName: string | null
}

type AdminReview = {
  id: string
  name: string
  phone: string | null
  text: string
  rating: number
  approved: boolean
  createdAt: string
}

type AdminOrder = {
  id: string
  name: string
  phone: string
  dessert: string
  orderDate: string
  details: string | null
  createdAt: string
}

type DashboardResponse = {
  desserts: AdminDessert[]
  photos: AdminPhoto[]
  reviews: AdminReview[]
  orders: AdminOrder[]
  holidayCatalog: {
    title: string
    sections: AdminHolidaySection[]
  }
}

type AdminTab = 'holiday' | 'desserts' | 'photos' | 'reviews' | 'orders'

const authFetch = process.server ? useRequestFetch() : $fetch

const session = await authFetch<{ authenticated: boolean }>('/api/admin/session').catch(() => ({ authenticated: false }))
if (!session.authenticated) {
  await navigateTo('/admin/login')
}

const desserts = ref<AdminDessert[]>([])
const photos = ref<AdminPhoto[]>([])
const reviews = ref<AdminReview[]>([])
const orders = ref<AdminOrder[]>([])
const holidayTitle = ref('Праздничный каталог')
const holidaySections = ref<AdminHolidaySection[]>([])

const sortedHolidaySections = computed(() =>
  [...holidaySections.value].sort((a, b) =>
    a.sortOrder === b.sortOrder ? a.name.localeCompare(b.name, 'ru-RU') : a.sortOrder - b.sortOrder
  )
)

const currentHolidaySection = computed(() =>
  sortedHolidaySections.value.find((section) => section.isCurrentHoliday) || null
)

const categoryOptions = computed(() =>
  [...new Set(desserts.value.map((item) => item.category.trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'ru-RU'))
)
const holidaySectionOptions = computed(() => sortedHolidaySections.value.map((section) => ({ ...section })))
const dessertSlugOptions = computed(() =>
  [...desserts.value]
    .sort((a, b) => a.name.localeCompare(b.name, 'ru-RU'))
    .map((item) => ({
      slug: item.slug,
      label: `${item.name} (${item.slug})`
    }))
)

const status = ref('')
const statusIsError = ref(false)
const isBusy = ref(false)
const activeAdminTab = ref<AdminTab>('holiday')

const newDessert = reactive({
  slug: '',
  category: '',
  name: '',
  description: '',
  inside: '',
  decor: '',
  price: '',
  leadTimeHours: '',
  proteins: '',
  fats: '',
  carbs: '',
  kcal: '',
  holidaySectionSlugs: [] as string[]
})

const newHolidaySection = reactive({
  name: '',
  slug: '',
  sortOrder: '100',
  active: true
})

const currentHolidayDraft = reactive({
  id: '',
  name: '',
  slug: '',
  sortOrder: '30',
  active: false,
  icon: '',
  useDateWindow: false,
  activeFrom: '',
  activeTo: ''
})
const newDessertPhotoFile = ref<File | null>(null)
const newDessertPhotoPreviewUrl = ref('')
const newDessertPhotoTitle = ref('')
const newDessertPhotoInput = ref<HTMLInputElement | null>(null)
const isCreatingDessert = ref(false)

const uploadPhoto = reactive({
  title: '',
  dessertSlug: '',
  inGallery: true,
  source: 'admin' as 'seed' | 'telegram' | 'admin'
})

const uploadPhotoFile = ref<File | null>(null)
const uploadPreviewUrl = ref('')
const uploadFileInput = ref<HTMLInputElement | null>(null)
const isUploadingPhoto = ref(false)

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya'
}

const slugify = (value: string) =>
  [...value.trim().toLowerCase()]
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

const pad2 = (value: number) => String(value).padStart(2, '0')

const toDateInputValue = (value: string | null) => {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

const syncCurrentHolidayDraft = () => {
  const current = currentHolidaySection.value
  if (!current) {
    currentHolidayDraft.id = ''
    currentHolidayDraft.name = ''
    currentHolidayDraft.slug = ''
    currentHolidayDraft.sortOrder = '30'
    currentHolidayDraft.active = false
    currentHolidayDraft.icon = ''
    currentHolidayDraft.useDateWindow = false
    currentHolidayDraft.activeFrom = ''
    currentHolidayDraft.activeTo = ''
    return
  }

  currentHolidayDraft.id = current.id
  currentHolidayDraft.name = current.name
  currentHolidayDraft.slug = current.slug
  currentHolidayDraft.sortOrder = String(current.sortOrder)
  currentHolidayDraft.active = current.active
  currentHolidayDraft.icon = current.icon || ''
  currentHolidayDraft.activeFrom = toDateInputValue(current.activeFrom)
  currentHolidayDraft.activeTo = toDateInputValue(current.activeTo)
  currentHolidayDraft.useDateWindow = Boolean(currentHolidayDraft.activeFrom || currentHolidayDraft.activeTo)
}

const applyDashboard = (payload: DashboardResponse) => {
  holidayTitle.value = payload.holidayCatalog?.title || 'Праздничный каталог'
  holidaySections.value = (payload.holidayCatalog?.sections || []).map((item) => ({
    ...item,
    icon: item.icon || '',
    activeFrom: item.activeFrom || null,
    activeTo: item.activeTo || null
  }))

  const availableHolidaySlugs = new Set(holidaySections.value.map((item) => item.slug))

  desserts.value = payload.desserts.map((item) => ({
    ...item,
    holidaySectionSlugs: (item.holidaySectionSlugs || []).filter((slug) => availableHolidaySlugs.has(slug)),
    ttk: {
      kbju: {
        proteins: item.ttk?.kbju?.proteins || '',
        fats: item.ttk?.kbju?.fats || '',
        carbs: item.ttk?.kbju?.carbs || '',
        kcal: item.ttk?.kbju?.kcal || ''
      }
    }
  }))
  photos.value = payload.photos.map((item) => ({ ...item }))
  reviews.value = payload.reviews.map((item) => ({ ...item }))
  orders.value = payload.orders.map((item) => ({ ...item }))
  newDessert.holidaySectionSlugs = []
  syncCurrentHolidayDraft()
}

const loadDashboard = async () => {
  isBusy.value = true
  try {
    const payload = await authFetch<DashboardResponse>('/api/admin/dashboard')
    applyDashboard(payload)
  } catch (error: unknown) {
    const statusCode =
      (error as { statusCode?: number; data?: { statusCode?: number } })?.statusCode ||
      (error as { data?: { statusCode?: number } })?.data?.statusCode

    if (statusCode === 401) {
      await navigateTo('/admin/login')
      return
    }

    throw error
  } finally {
    isBusy.value = false
  }
}

if (session.authenticated) {
  await loadDashboard()
}

const setStatus = (message: string, isError = false) => {
  status.value = message
  statusIsError.value = isError
  if (isError) {
    return
  }
  setTimeout(() => {
    if (status.value === message) {
      status.value = ''
      statusIsError.value = false
    }
  }, 2400)
}

const extractStatusMessage = (error: unknown, fallback: string) => {
  const statusMessage =
    (error as { data?: { statusMessage?: string }; statusMessage?: string })?.data?.statusMessage ||
    (error as { statusMessage?: string })?.statusMessage

  return statusMessage || fallback
}

const onDessertPhotoChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  newDessertPhotoFile.value = target.files?.[0] || null

  if (newDessertPhotoPreviewUrl.value) {
    URL.revokeObjectURL(newDessertPhotoPreviewUrl.value)
    newDessertPhotoPreviewUrl.value = ''
  }

  if (newDessertPhotoFile.value) {
    newDessertPhotoPreviewUrl.value = URL.createObjectURL(newDessertPhotoFile.value)
  }
}

const resetDessertPhoto = () => {
  newDessertPhotoFile.value = null
  newDessertPhotoTitle.value = ''

  if (newDessertPhotoPreviewUrl.value) {
    URL.revokeObjectURL(newDessertPhotoPreviewUrl.value)
    newDessertPhotoPreviewUrl.value = ''
  }

  if (newDessertPhotoInput.value) {
    newDessertPhotoInput.value.value = ''
  }
}

const resetNewDessertForm = () => {
  newDessert.slug = ''
  newDessert.category = ''
  newDessert.name = ''
  newDessert.description = ''
  newDessert.inside = ''
  newDessert.decor = ''
  newDessert.price = ''
  newDessert.leadTimeHours = ''
  newDessert.proteins = ''
  newDessert.fats = ''
  newDessert.carbs = ''
  newDessert.kcal = ''
  newDessert.holidaySectionSlugs = []
  resetDessertPhoto()
}

const logout = async () => {
  await $fetch('/api/admin/logout', { method: 'POST' })
  await navigateTo('/admin/login')
}

const refreshAll = async () => {
  try {
    await loadDashboard()
    setStatus('Данные обновлены.')
  } catch (error: unknown) {
    setStatus(extractStatusMessage(error, 'Не удалось обновить данные.'), true)
  }
}

const saveHolidayTitle = async () => {
  try {
    await $fetch('/api/admin/holiday-catalog/settings', {
      method: 'PUT',
      body: {
        title: holidayTitle.value
      }
    })
    setStatus('Название праздничного каталога сохранено.')
  } catch (error: unknown) {
    setStatus(extractStatusMessage(error, 'Не удалось сохранить название праздничного каталога.'), true)
  }
}

const createHolidaySection = async () => {
  const generatedSlug = newHolidaySection.slug || slugify(newHolidaySection.name)

  try {
    await $fetch('/api/admin/holiday-catalog/sections', {
      method: 'POST',
      body: {
        name: newHolidaySection.name,
        slug: generatedSlug,
        active: newHolidaySection.active,
        sortOrder: newHolidaySection.sortOrder ? Number(newHolidaySection.sortOrder) : 100
      }
    })

    newHolidaySection.name = ''
    newHolidaySection.slug = ''
    newHolidaySection.sortOrder = '100'
    newHolidaySection.active = true

    await loadDashboard()
    setStatus('Праздничный раздел добавлен.')
  } catch (error: unknown) {
    setStatus(extractStatusMessage(error, 'Не удалось добавить праздничный раздел.'), true)
  }
}

const saveHolidaySection = async (section: AdminHolidaySection) => {
  try {
    await $fetch(`/api/admin/holiday-catalog/sections/${section.id}`, {
      method: 'PUT',
      body: {
        name: section.name,
        slug: section.slug,
        active: section.active,
        sortOrder: section.sortOrder
      }
    })
    await loadDashboard()
    setStatus(`Раздел ${section.name} сохранен.`)
  } catch (error: unknown) {
    setStatus(extractStatusMessage(error, `Не удалось сохранить раздел ${section.name}.`), true)
  }
}

const removeHolidaySection = async (section: AdminHolidaySection) => {
  if (!confirm(`Удалить раздел «${section.name}»?`)) {
    return
  }

  try {
    await $fetch(`/api/admin/holiday-catalog/sections/${section.id}`, {
      method: 'DELETE'
    })
    await loadDashboard()
    setStatus('Праздничный раздел удален.')
  } catch (error: unknown) {
    setStatus(extractStatusMessage(error, 'Не удалось удалить праздничный раздел.'), true)
  }
}

const createCurrentHolidaySection = async () => {
  try {
    await $fetch('/api/admin/holiday-catalog/sections', {
      method: 'POST',
      body: {
        name: 'Текущий праздник',
        slug: 'current-holiday',
        active: false,
        sortOrder: 30,
        isCurrentHoliday: true
      }
    })
    await loadDashboard()
    setStatus('Карточка текущего праздника создана.')
  } catch (error: unknown) {
    setStatus(extractStatusMessage(error, 'Не удалось создать карточку текущего праздника.'), true)
  }
}

const saveCurrentHoliday = async () => {
  const currentId = currentHolidayDraft.id || currentHolidaySection.value?.id || ''
  if (!currentId) {
    await createCurrentHolidaySection()
    return
  }

  try {
    await $fetch(`/api/admin/holiday-catalog/sections/${currentId}`, {
      method: 'PUT',
      body: {
        name: currentHolidayDraft.name,
        slug: currentHolidayDraft.slug || slugify(currentHolidayDraft.name),
        active: currentHolidayDraft.active,
        sortOrder: currentHolidayDraft.sortOrder ? Number(currentHolidayDraft.sortOrder) : 30,
        isCurrentHoliday: true,
        icon: currentHolidayDraft.icon || null,
        activeFrom: currentHolidayDraft.useDateWindow ? currentHolidayDraft.activeFrom || null : null,
        activeTo: currentHolidayDraft.useDateWindow ? currentHolidayDraft.activeTo || null : null
      }
    })
    await loadDashboard()
    setStatus('Текущий праздник сохранен.')
  } catch (error: unknown) {
    setStatus(extractStatusMessage(error, 'Не удалось сохранить текущий праздник.'), true)
  }
}

const saveDessert = async (item: AdminDessert) => {
  const body: Record<string, unknown> = {
    slug: item.slug,
    category: item.category,
    name: item.name,
    description: item.description,
    inside: item.inside,
    decor: item.decor,
    price: item.price,
    leadTimeHours: item.leadTimeHours,
    active: item.active,
    ttk: {
      kbju: {
        proteins: item.ttk.kbju.proteins,
        fats: item.ttk.kbju.fats,
        carbs: item.ttk.kbju.carbs,
        kcal: item.ttk.kbju.kcal
      }
    }
  }

  if (holidaySectionOptions.value.length) {
    body.holidaySectionSlugs = item.holidaySectionSlugs
  }

  try {
    await $fetch(`/api/admin/desserts/${item.id}`, {
      method: 'PUT',
      body
    })
    setStatus(`Десерт ${item.name} сохранен.`)
  } catch (error: unknown) {
    setStatus(extractStatusMessage(error, `Ошибка сохранения десерта ${item.name}.`), true)
  }
}

const createDessert = async () => {
  isCreatingDessert.value = true
  try {
    if (newDessertPhotoFile.value) {
      const formData = new FormData()
      formData.append('slug', newDessert.slug)
      formData.append('category', newDessert.category)
      formData.append('name', newDessert.name)
      formData.append('description', newDessert.description)
      formData.append('inside', newDessert.inside)
      formData.append('decor', newDessert.decor)
      formData.append('price', newDessert.price)
      formData.append('leadTimeHours', newDessert.leadTimeHours)
      formData.append('active', 'true')
      formData.append('ttkProteins', newDessert.proteins)
      formData.append('ttkFats', newDessert.fats)
      formData.append('ttkCarbs', newDessert.carbs)
      formData.append('ttkKcal', newDessert.kcal)
      if (holidaySectionOptions.value.length) {
        formData.append('holidaySectionSlugs', JSON.stringify(newDessert.holidaySectionSlugs))
      }
      formData.append('photoTitle', newDessertPhotoTitle.value)
      formData.append('photoInGallery', 'true')
      formData.append('file', newDessertPhotoFile.value)

      await $fetch('/api/admin/desserts', {
        method: 'POST',
        body: formData
      })
    } else {
      const body: Record<string, unknown> = {
        slug: newDessert.slug,
        category: newDessert.category,
        name: newDessert.name,
        description: newDessert.description,
        inside: newDessert.inside,
        decor: newDessert.decor,
        price: newDessert.price,
        leadTimeHours: newDessert.leadTimeHours ? Number(newDessert.leadTimeHours) : null,
        ttk: {
          kbju: {
            proteins: newDessert.proteins,
            fats: newDessert.fats,
            carbs: newDessert.carbs,
            kcal: newDessert.kcal
          }
        }
      }

      if (holidaySectionOptions.value.length) {
        body.holidaySectionSlugs = newDessert.holidaySectionSlugs
      }

      await $fetch('/api/admin/desserts', {
        method: 'POST',
        body
      })
    }

    resetNewDessertForm()

    await loadDashboard()
    setStatus('Новый десерт добавлен.')
  } catch (error: unknown) {
    setStatus(extractStatusMessage(error, 'Не удалось добавить десерт.'), true)
  } finally {
    isCreatingDessert.value = false
  }
}

const removeDessert = async (id: string) => {
  if (!confirm('Удалить десерт? Действие необратимо.')) {
    return
  }
  try {
    await $fetch(`/api/admin/desserts/${id}`, { method: 'DELETE' })
    await loadDashboard()
    setStatus('Десерт удален.')
  } catch (error: unknown) {
    setStatus(extractStatusMessage(error, 'Не удалось удалить десерт.'), true)
  }
}

const onUploadFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  uploadPhotoFile.value = target.files?.[0] || null

  if (uploadPreviewUrl.value) {
    URL.revokeObjectURL(uploadPreviewUrl.value)
    uploadPreviewUrl.value = ''
  }

  if (uploadPhotoFile.value) {
    uploadPreviewUrl.value = URL.createObjectURL(uploadPhotoFile.value)
  }
}

const resetUploadForm = () => {
  uploadPhotoFile.value = null
  uploadPhoto.title = ''
  uploadPhoto.dessertSlug = ''
  uploadPhoto.inGallery = true
  uploadPhoto.source = 'admin'

  if (uploadPreviewUrl.value) {
    URL.revokeObjectURL(uploadPreviewUrl.value)
    uploadPreviewUrl.value = ''
  }

  if (uploadFileInput.value) {
    uploadFileInput.value.value = ''
  }
}

const uploadPhotoByFile = async () => {
  if (!uploadPhotoFile.value) {
    setStatus('Выберите файл изображения для загрузки.', true)
    return
  }

  const maxBytes = 15 * 1024 * 1024
  if (uploadPhotoFile.value.size > maxBytes) {
    setStatus('Файл слишком большой. Максимум 15 МБ.', true)
    return
  }

  isUploadingPhoto.value = true
  try {
    const formData = new FormData()
    formData.append('file', uploadPhotoFile.value)
    formData.append('title', uploadPhoto.title)
    formData.append('dessertSlug', uploadPhoto.dessertSlug)
    formData.append('inGallery', String(uploadPhoto.inGallery))
    formData.append('source', uploadPhoto.source)

    await $fetch('/api/admin/photos/upload', {
      method: 'POST',
      body: formData
    })

    resetUploadForm()
    await loadDashboard()
    setStatus('Фото загружено файлом.')
  } catch (error: unknown) {
    setStatus(extractStatusMessage(error, 'Не удалось загрузить фото файлом.'), true)
  } finally {
    isUploadingPhoto.value = false
  }
}

const savePhoto = async (item: AdminPhoto) => {
  try {
    await $fetch(`/api/admin/photos/${item.id}`, {
      method: 'PUT',
      body: {
        path: item.path,
        title: item.title,
        dessertSlug: item.dessertSlug || null,
        inGallery: item.inGallery,
        source: item.source
      }
    })
    setStatus(`Фото ${item.id} сохранено.`)
  } catch (error: unknown) {
    setStatus(extractStatusMessage(error, `Ошибка сохранения фото ${item.id}.`), true)
  }
}

const removePhoto = async (id: string) => {
  if (!confirm('Удалить фото? Действие необратимо.')) {
    return
  }
  try {
    await $fetch(`/api/admin/photos/${id}`, { method: 'DELETE' })
    await loadDashboard()
    setStatus('Фото удалено.')
  } catch (error: unknown) {
    setStatus(extractStatusMessage(error, 'Не удалось удалить фото.'), true)
  }
}

const saveReview = async (item: AdminReview) => {
  try {
    await $fetch(`/api/admin/reviews/${item.id}`, {
      method: 'PUT',
      body: {
        name: item.name,
        phone: item.phone,
        text: item.text,
        rating: item.rating,
        approved: item.approved
      }
    })
    setStatus(`Отзыв ${item.id} сохранен.`)
  } catch (error: unknown) {
    setStatus(extractStatusMessage(error, `Ошибка сохранения отзыва ${item.id}.`), true)
  }
}

const approveReview = async (id: string) => {
  try {
    await $fetch(`/api/admin/reviews/${id}/approve`, { method: 'POST' })
    await loadDashboard()
    setStatus('Отзыв подтвержден.')
  } catch (error: unknown) {
    setStatus(extractStatusMessage(error, 'Не удалось подтвердить отзыв.'), true)
  }
}

const rejectReview = async (id: string) => {
  try {
    await $fetch(`/api/admin/reviews/${id}/reject`, { method: 'POST' })
    await loadDashboard()
    setStatus('Отзыв отклонен.')
  } catch (error: unknown) {
    setStatus(extractStatusMessage(error, 'Не удалось отклонить отзыв.'), true)
  }
}

const removeReview = async (id: string) => {
  if (!confirm('Удалить отзыв? Действие необратимо.')) {
    return
  }
  try {
    await $fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' })
    await loadDashboard()
    setStatus('Отзыв удален.')
  } catch (error: unknown) {
    setStatus(extractStatusMessage(error, 'Не удалось удалить отзыв.'), true)
  }
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))

onBeforeUnmount(() => {
  if (uploadPreviewUrl.value) {
    URL.revokeObjectURL(uploadPreviewUrl.value)
    uploadPreviewUrl.value = ''
  }
  if (newDessertPhotoPreviewUrl.value) {
    URL.revokeObjectURL(newDessertPhotoPreviewUrl.value)
    newDessertPhotoPreviewUrl.value = ''
  }
})
</script>

<template>
  <main class="site-main">
    <datalist id="dessert-categories">
      <option v-for="category in categoryOptions" :key="category" :value="category" />
    </datalist>

    <section class="section admin-toolbar reveal-up">
      <h1>Админ-панель</h1>
      <p>Полное редактирование каталога, галереи, отзывов и просмотр заявок.</p>
      <div class="admin-toolbar-actions">
        <NuxtLink class="btn btn-ghost" to="/">На главный экран</NuxtLink>
        <a class="btn btn-ghost" href="#holiday-catalog-admin">Праздничный каталог</a>
        <button class="btn btn-ghost" type="button" :disabled="isBusy" @click="refreshAll">Обновить</button>
        <button class="btn btn-primary" type="button" @click="logout">Выйти</button>
      </div>
      <p class="status" :class="status ? (statusIsError ? 'status--error' : 'status--success') : ''" role="status" aria-live="polite">
        {{ status }}
      </p>
    </section>

    <section class="section admin-section reveal-up">
      <h2>Разделы админки</h2>
      <div class="admin-tabs" role="tablist" aria-label="Разделы админки">
        <button class="admin-tab" :class="{ 'admin-tab--active': activeAdminTab === 'holiday' }" type="button" @click="activeAdminTab = 'holiday'">
          Праздничный каталог
        </button>
        <button class="admin-tab" :class="{ 'admin-tab--active': activeAdminTab === 'desserts' }" type="button" @click="activeAdminTab = 'desserts'">
          Десерты
        </button>
        <button class="admin-tab" :class="{ 'admin-tab--active': activeAdminTab === 'photos' }" type="button" @click="activeAdminTab = 'photos'">
          Фото
        </button>
        <button class="admin-tab" :class="{ 'admin-tab--active': activeAdminTab === 'reviews' }" type="button" @click="activeAdminTab = 'reviews'">
          Отзывы
        </button>
        <button class="admin-tab" :class="{ 'admin-tab--active': activeAdminTab === 'orders' }" type="button" @click="activeAdminTab = 'orders'">
          Заявки
        </button>
      </div>
    </section>

    <section id="holiday-catalog-admin" class="section admin-section reveal-up" v-show="activeAdminTab === 'holiday'">
      <h2>Праздничный каталог</h2>
      <div class="admin-grid admin-grid-2">
        <input v-model.trim="holidayTitle" type="text" placeholder="Название блока на главной" />
        <button class="btn btn-ghost" type="button" :disabled="isBusy" @click="saveHolidayTitle">Сохранить название</button>
      </div>
      <p class="admin-subhint">
        Разделы ниже используются как вкладки праздничного каталога на главной странице.
        Товары из активных праздничных вкладок не выводятся в основном каталоге.
      </p>

      <h3>Добавить раздел</h3>
      <div class="admin-grid admin-grid-3">
        <input v-model.trim="newHolidaySection.name" type="text" placeholder="Название (например, Новый год)" />
        <input v-model.trim="newHolidaySection.slug" type="text" placeholder="slug (авто, если пусто)" />
        <input v-model.trim="newHolidaySection.sortOrder" type="number" min="0" placeholder="Сортировка" />
        <label class="admin-checkbox"><input v-model="newHolidaySection.active" type="checkbox" /> Активен</label>
      </div>
      <div class="admin-actions">
        <button class="btn btn-primary" type="button" :disabled="isBusy" @click="createHolidaySection">Добавить раздел</button>
      </div>

      <h3>Разделы ({{ sortedHolidaySections.length }})</h3>
      <div class="admin-list">
        <article v-for="section in sortedHolidaySections" :key="section.id" class="admin-item glass-soft">
          <div class="admin-grid admin-grid-3">
            <input v-model.trim="section.name" type="text" placeholder="Название" />
            <input v-model.trim="section.slug" type="text" placeholder="slug" />
            <input v-model.number="section.sortOrder" type="number" min="0" placeholder="Сортировка" />
            <label class="admin-checkbox"><input v-model="section.active" type="checkbox" /> Активен</label>
            <span class="admin-inline-status">{{ section.isCurrentHoliday ? 'Текущий праздник' : 'Обычный раздел' }}</span>
            <p class="admin-note">Товаров: {{ section.dessertCount }}</p>
          </div>
          <div class="admin-actions">
            <button class="btn btn-ghost" type="button" :disabled="isBusy" @click="saveHolidaySection(section)">Сохранить</button>
            <button class="btn btn-primary" type="button" :disabled="isBusy" @click="removeHolidaySection(section)">Удалить</button>
          </div>
        </article>
      </div>
    </section>

    <section class="section admin-section reveal-up" v-show="activeAdminTab === 'holiday'">
      <h2>Текущий праздник</h2>
      <p class="admin-subhint">
        Это специальная вкладка. Можно отключить вручную или ограничить показ по полям «Дата и время».
      </p>

      <template v-if="currentHolidaySection || currentHolidayDraft.id">
        <div class="admin-grid admin-grid-3">
          <input v-model.trim="currentHolidayDraft.name" type="text" placeholder="Название праздника" />
          <input v-model.trim="currentHolidayDraft.slug" type="text" placeholder="slug" />
          <input v-model.trim="currentHolidayDraft.sortOrder" type="number" min="0" placeholder="Сортировка" />
          <label class="admin-checkbox"><input v-model="currentHolidayDraft.active" type="checkbox" /> Активен</label>
          <input v-model.trim="currentHolidayDraft.icon" type="text" placeholder="Иконка/подпись (опционально)" />
          <label class="admin-checkbox">
            <input v-model="currentHolidayDraft.useDateWindow" type="checkbox" />
            Ограничивать по дате и времени
          </label>
        </div>

        <div v-if="currentHolidayDraft.useDateWindow" class="admin-grid admin-grid-2">
          <input v-model="currentHolidayDraft.activeFrom" type="datetime-local" placeholder="Начало" />
          <input v-model="currentHolidayDraft.activeTo" type="datetime-local" placeholder="Окончание" />
        </div>

        <div class="admin-actions">
          <button class="btn btn-primary" type="button" :disabled="isBusy" @click="saveCurrentHoliday">Сохранить текущий праздник</button>
          <button class="btn btn-ghost" type="button" :disabled="isBusy" @click="syncCurrentHolidayDraft">Сбросить изменения</button>
        </div>
      </template>

      <div v-else class="admin-actions">
        <button class="btn btn-primary" type="button" :disabled="isBusy" @click="createCurrentHolidaySection">
          Создать карточку текущего праздника
        </button>
      </div>
    </section>

    <section class="section admin-section reveal-up" v-show="activeAdminTab === 'desserts'">
      <h2>Добавить десерт</h2>
      <div class="admin-grid admin-grid-2">
        <input v-model.trim="newDessert.slug" type="text" placeholder="slug" />
        <input v-model.trim="newDessert.name" type="text" placeholder="Название" />
        <input v-model.trim="newDessert.category" list="dessert-categories" type="text" placeholder="Категория" />
        <input v-model.trim="newDessert.price" type="text" placeholder="Цена" />
        <input v-model.trim="newDessert.leadTimeHours" type="number" min="0" placeholder="Срок (часы)" />
        <input v-model.trim="newDessert.proteins" type="text" placeholder="Белки" />
        <input v-model.trim="newDessert.fats" type="text" placeholder="Жиры" />
        <input v-model.trim="newDessert.carbs" type="text" placeholder="Углеводы" />
        <input v-model.trim="newDessert.kcal" type="text" placeholder="Ккал" />
      </div>
      <template v-if="holidaySectionOptions.length">
        <p class="admin-subhint">Показывать новый десерт в разделах праздничного каталога:</p>
        <div class="admin-checklist">
          <label v-for="section in holidaySectionOptions" :key="`new-dessert-${section.id}`" class="admin-checkbox">
            <input v-model="newDessert.holidaySectionSlugs" type="checkbox" :value="section.slug" />
            {{ section.name }}
          </label>
        </div>
      </template>
      <div class="admin-grid admin-grid-2 admin-upload-grid">
        <input ref="newDessertPhotoInput" type="file" accept="image/jpeg,image/png,image/webp" @change="onDessertPhotoChange" />
        <input v-model.trim="newDessertPhotoTitle" type="text" placeholder="Название фото (опционально)" />
      </div>
      <div v-if="newDessertPhotoPreviewUrl || newDessertPhotoFile" class="admin-upload-preview">
        <img v-if="newDessertPhotoPreviewUrl" :src="newDessertPhotoPreviewUrl" alt="Предпросмотр фото десерта" />
        <p v-if="newDessertPhotoFile">
          {{ newDessertPhotoFile.name }} · {{ Math.ceil(newDessertPhotoFile.size / 1024) }} KB
        </p>
      </div>
      <textarea v-model.trim="newDessert.description" rows="2" placeholder="Описание" />
      <textarea v-model.trim="newDessert.decor" rows="2" placeholder="Декор" />
      <div class="admin-actions">
        <button class="btn btn-primary" type="button" :disabled="isBusy || isCreatingDessert" @click="createDessert">
          {{ isCreatingDessert ? 'Сохранение...' : 'Добавить десерт' }}
        </button>
        <button class="btn btn-ghost" type="button" :disabled="isBusy || isCreatingDessert" @click="resetNewDessertForm">
          Очистить
        </button>
      </div>
    </section>

    <section class="section admin-section reveal-up" v-show="activeAdminTab === 'desserts'">
      <h2>Каталог десертов ({{ desserts.length }})</h2>
      <div class="admin-list">
        <article v-for="item in desserts" :key="item.id" class="admin-item glass-soft">
          <div class="admin-grid admin-grid-3">
            <input v-model.trim="item.slug" type="text" />
            <input v-model.trim="item.name" type="text" />
            <input v-model.trim="item.category" list="dessert-categories" type="text" />
            <input v-model.trim="item.price" type="text" />
            <input v-model.number="item.leadTimeHours" type="number" min="0" placeholder="Срок (часы)" />
            <label class="admin-checkbox"><input v-model="item.active" type="checkbox" /> Активен</label>
            <input v-model.trim="item.ttk.kbju.proteins" type="text" placeholder="Белки" />
            <input v-model.trim="item.ttk.kbju.fats" type="text" placeholder="Жиры" />
            <input v-model.trim="item.ttk.kbju.carbs" type="text" placeholder="Углеводы" />
            <input v-model.trim="item.ttk.kbju.kcal" type="text" placeholder="Ккал" />
          </div>
          <textarea v-model.trim="item.description" rows="2" />
          <textarea v-model.trim="item.decor" rows="2" />
          <template v-if="holidaySectionOptions.length">
            <p class="admin-subhint">Праздничные разделы для этого десерта:</p>
            <div class="admin-checklist">
              <label v-for="section in holidaySectionOptions" :key="`${item.id}-${section.id}`" class="admin-checkbox">
                <input v-model="item.holidaySectionSlugs" type="checkbox" :value="section.slug" />
                {{ section.name }}
              </label>
            </div>
          </template>
          <div class="admin-actions">
            <button class="btn btn-ghost" type="button" :disabled="isBusy" @click="saveDessert(item)">Сохранить</button>
            <button class="btn btn-primary" type="button" :disabled="isBusy" @click="removeDessert(item.id)">Удалить</button>
          </div>
        </article>
      </div>
    </section>

    <section class="section admin-section reveal-up" v-show="activeAdminTab === 'photos'">
      <h2>Добавить фото</h2>
      <p class="submit-hint">Загрузка новых фото доступна только через файл.</p>
      <div class="admin-grid admin-grid-2 admin-upload-grid">
        <input ref="uploadFileInput" type="file" accept="image/jpeg,image/png,image/webp" @change="onUploadFileChange" />
        <input v-model.trim="uploadPhoto.title" type="text" placeholder="Название фото (для файла)" />
        <select v-model="uploadPhoto.dessertSlug">
          <option value="">Без привязки к десерту</option>
          <option v-for="item in dessertSlugOptions" :key="item.slug" :value="item.slug">{{ item.label }}</option>
        </select>
        <select v-model="uploadPhoto.source">
          <option value="admin">admin</option>
          <option value="seed">seed</option>
          <option value="telegram">telegram</option>
        </select>
        <label class="admin-checkbox"><input v-model="uploadPhoto.inGallery" type="checkbox" /> В галерею (для файла)</label>
      </div>
      <div v-if="uploadPreviewUrl || uploadPhotoFile" class="admin-upload-preview">
        <img v-if="uploadPreviewUrl" :src="uploadPreviewUrl" alt="Предпросмотр загружаемого фото" />
        <p v-if="uploadPhotoFile">
          {{ uploadPhotoFile.name }} · {{ Math.ceil(uploadPhotoFile.size / 1024) }} KB
        </p>
      </div>
      <div class="admin-actions">
        <button class="btn btn-primary" type="button" :disabled="isBusy || isUploadingPhoto" @click="uploadPhotoByFile">
          {{ isUploadingPhoto ? 'Загрузка...' : 'Загрузить файлом' }}
        </button>
        <button class="btn btn-ghost" type="button" :disabled="isBusy || isUploadingPhoto" @click="resetUploadForm">Очистить</button>
      </div>

    </section>

    <section class="section admin-section reveal-up" v-show="activeAdminTab === 'photos'">
      <h2>Галерея и фото десертов ({{ photos.length }})</h2>
      <div class="admin-list">
        <article v-for="item in photos" :key="item.id" class="admin-item glass-soft">
          <div class="admin-grid admin-grid-3">
            <input v-model.trim="item.path" type="text" />
            <input v-model.trim="item.title" type="text" />
            <input v-model.trim="item.dessertSlug" type="text" :placeholder="item.dessertName || 'slug десерта'" />
            <select v-model="item.source">
              <option value="admin">admin</option>
              <option value="seed">seed</option>
              <option value="telegram">telegram</option>
            </select>
            <label class="admin-checkbox"><input v-model="item.inGallery" type="checkbox" /> В галерее</label>
          </div>
          <div class="admin-actions">
            <button class="btn btn-ghost" type="button" :disabled="isBusy" @click="savePhoto(item)">Сохранить</button>
            <button class="btn btn-primary" type="button" :disabled="isBusy" @click="removePhoto(item.id)">Удалить</button>
          </div>
        </article>
      </div>
    </section>

    <section class="section admin-section reveal-up" v-show="activeAdminTab === 'reviews'">
      <h2>Отзывы ({{ reviews.length }})</h2>
      <div class="admin-list">
        <article v-for="item in reviews" :key="item.id" class="admin-item glass-soft">
          <div class="admin-grid admin-grid-3">
            <input v-model.trim="item.name" type="text" />
            <input v-model.trim="item.phone" type="text" placeholder="Телефон" />
            <input v-model.number="item.rating" type="number" min="1" max="5" step="1" />
            <label class="admin-checkbox"><input v-model="item.approved" type="checkbox" /> Одобрен</label>
          </div>
          <textarea v-model.trim="item.text" rows="3" />
          <div class="admin-actions admin-actions-wide">
            <button class="btn btn-ghost" type="button" :disabled="isBusy" @click="saveReview(item)">Сохранить</button>
            <button class="btn btn-ghost" type="button" :disabled="isBusy" @click="approveReview(item.id)">Принять</button>
            <button class="btn btn-ghost" type="button" :disabled="isBusy" @click="rejectReview(item.id)">Отклонить</button>
            <button class="btn btn-primary" type="button" :disabled="isBusy" @click="removeReview(item.id)">Удалить</button>
          </div>
        </article>
      </div>
    </section>

    <section class="section admin-section reveal-up" v-show="activeAdminTab === 'orders'">
      <h2>Заявки ({{ orders.length }})</h2>
      <div class="admin-list">
        <article v-for="order in orders" :key="order.id" class="admin-item glass-soft">
          <p><strong>ID:</strong> {{ order.id }}</p>
          <p><strong>Имя:</strong> {{ order.name }}</p>
          <p><strong>Телефон:</strong> {{ order.phone }}</p>
          <p><strong>Десерт:</strong> {{ order.dessert }}</p>
          <p><strong>Дата заказа:</strong> {{ order.orderDate }}</p>
          <p><strong>Комментарий:</strong> {{ order.details || 'нет данных' }}</p>
          <p><strong>Создано:</strong> {{ formatDate(order.createdAt) }}</p>
        </article>
      </div>
    </section>
  </main>
</template>

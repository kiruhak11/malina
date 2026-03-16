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
}

const authFetch = process.server ? useRequestFetch() : $fetch

const session = await authFetch<{ authenticated: boolean }>('/api/admin/session').catch(() => ({ authenticated: false }))
if (!session.authenticated) {
  await navigateTo('/admin/login')
}

const desserts = ref<AdminDessert[]>([])
const photos = ref<AdminPhoto[]>([])
const reviews = ref<AdminReview[]>([])
const orders = ref<AdminOrder[]>([])
const categoryOptions = computed(() =>
  [...new Set(desserts.value.map((item) => item.category.trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'ru-RU'))
)

const status = ref('')
const statusIsError = ref(false)
const isBusy = ref(false)

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
  kcal: ''
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

const applyDashboard = (payload: DashboardResponse) => {
  desserts.value = payload.desserts.map((item) => ({
    ...item,
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

const saveDessert = async (item: AdminDessert) => {
  try {
    await $fetch(`/api/admin/desserts/${item.id}`, {
      method: 'PUT',
      body: {
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
      formData.append('photoTitle', newDessertPhotoTitle.value)
      formData.append('photoInGallery', 'true')
      formData.append('file', newDessertPhotoFile.value)

      await $fetch('/api/admin/desserts', {
        method: 'POST',
        body: formData
      })
    } else {
      await $fetch('/api/admin/desserts', {
        method: 'POST',
        body: {
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
        <button class="btn btn-ghost" type="button" :disabled="isBusy" @click="refreshAll">Обновить</button>
        <button class="btn btn-primary" type="button" @click="logout">Выйти</button>
      </div>
      <p class="status" :class="status ? (statusIsError ? 'status--error' : 'status--success') : ''" role="status" aria-live="polite">
        {{ status }}
      </p>
    </section>

    <section class="section admin-section reveal-up">
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

    <section class="section admin-section reveal-up">
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
          <div class="admin-actions">
            <button class="btn btn-ghost" type="button" :disabled="isBusy" @click="saveDessert(item)">Сохранить</button>
            <button class="btn btn-primary" type="button" :disabled="isBusy" @click="removeDessert(item.id)">Удалить</button>
          </div>
        </article>
      </div>
    </section>

    <section class="section admin-section reveal-up">
      <h2>Добавить фото</h2>
      <p class="submit-hint">Загрузка новых фото доступна только через файл.</p>
      <div class="admin-grid admin-grid-2 admin-upload-grid">
        <input ref="uploadFileInput" type="file" accept="image/jpeg,image/png,image/webp" @change="onUploadFileChange" />
        <input v-model.trim="uploadPhoto.title" type="text" placeholder="Название фото (для файла)" />
        <input v-model.trim="uploadPhoto.dessertSlug" type="text" placeholder="slug десерта или пусто (для файла)" />
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

    <section class="section admin-section reveal-up">
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

    <section class="section admin-section reveal-up">
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

    <section class="section admin-section reveal-up">
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

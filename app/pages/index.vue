<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import type { Product, Review } from '~/types/site'
import { maxGroup, phoneDisplay, phoneHref, telegramChannel } from '~/data/siteData'

useSiteSeo({
  title: 'МАЛИНА — десерты на заказ',
  description: 'МАЛИНА — десерты на заказ: меренговые рулеты, зефирные букеты, наборы и индивидуальные заявки.',
  path: '/',
  imagePath: '/logo-malina.png'
})

type SitePublicPayload = {
  desserts: Product[]
  reviews: Review[]
  gallery: Array<{ id: string; path: string; title: string | null }>
  holidayCatalog: {
    title: string
    sections: Array<{
      id: string
      name: string
      slug: string
      icon: string | null
      items: Product[]
    }>
  }
}

const { data: siteData, pending, error, refresh } = await useFetch<SitePublicPayload>('/api/site/public', {
  key: 'site-public'
})

const groupedProducts = computed(() => {
  const desserts: Product[] = siteData.value?.desserts || []
  const map = new Map<string, Product[]>()
  for (const dessert of desserts) {
    if (!map.has(dessert.category)) {
      map.set(dessert.category, [])
    }
    map.get(dessert.category)?.push(dessert)
  }
  return [...map.entries()].map(([category, items]) => ({ category, items }))
})

const reviews = computed<Review[]>(() => siteData.value?.reviews || [])
const holidayCatalog = computed(() => {
  const fallback = {
    title: 'Праздничный каталог',
    sections: [] as SitePublicPayload['holidayCatalog']['sections']
  }

  return siteData.value?.holidayCatalog || fallback
})

const orderForm = reactive({
  name: '',
  phone: '',
  dessert: '',
  orderDate: '',
  details: ''
})

const reviewForm = reactive({
  name: '',
  phone: '',
  review: '',
  rating: 5
})

const selectedDessert = ref<Product | null>(null)
const orderStatus = ref('')
const reviewStatus = ref('')
const isSubmittingOrder = ref(false)
const isSubmittingReview = ref(false)
const now = new Date()
const todayIso = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
const pageErrorMessage = computed(() => {
  const payloadMessage = (error.value as { data?: { statusMessage?: string } })?.data?.statusMessage
  return payloadMessage || (error.value ? 'Не удалось загрузить данные сайта. Попробуйте обновить страницу.' : '')
})

const openDessertModal = (dessert: Product) => {
  selectedDessert.value = dessert
}

const closeDessertModal = () => {
  selectedDessert.value = null
}

const selectDessert = async (dessertName: string) => {
  orderForm.dessert = dessertName
  const element = document.getElementById('request-form')
  element?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  await nextTick()
  const dessertInput = document.getElementById('order-dessert') as HTMLInputElement | null
  dessertInput?.focus()
}

const submitOrder = async () => {
  if (!orderForm.name || !orderForm.phone || !orderForm.dessert || !orderForm.orderDate) {
    orderStatus.value = 'Заполните обязательные поля: имя, телефон, десерт и дата заказа.'
    return
  }
  if (orderForm.orderDate < todayIso) {
    orderStatus.value = 'Дата заказа не может быть в прошлом.'
    return
  }

  isSubmittingOrder.value = true
  orderStatus.value = ''

  try {
    const response = await $fetch<{ warning?: string }>('/api/site/order', {
      method: 'POST',
      body: {
        ...orderForm
      }
    })

    orderStatus.value = response.warning
      ? `Заявка сохранена. ${response.warning}`
      : 'Заявка отправлена. Мы свяжемся с вами в ближайшее время.'
    orderForm.name = ''
    orderForm.phone = ''
    orderForm.dessert = ''
    orderForm.orderDate = ''
    orderForm.details = ''
  } catch (error: unknown) {
    const statusMessage =
      (error as { data?: { statusMessage?: string }; statusMessage?: string })?.data?.statusMessage ||
      (error as { statusMessage?: string })?.statusMessage
    orderStatus.value = statusMessage
      ? `Ошибка отправки: ${statusMessage}`
      : 'Не удалось отправить заявку. Напишите нам в Telegram или позвоните.'
  } finally {
    isSubmittingOrder.value = false
  }
}

const submitReview = async () => {
  if (!reviewForm.name || !reviewForm.phone || !reviewForm.review || !reviewForm.rating) {
    reviewStatus.value = 'Заполните имя, телефон, рейтинг и текст отзыва.'
    return
  }

  isSubmittingReview.value = true
  reviewStatus.value = ''

  try {
    const response = await $fetch<{ warning?: string }>('/api/site/review', {
      method: 'POST',
      body: {
        ...reviewForm
      }
    })

    reviewStatus.value = response.warning
      ? `Отзыв сохранен. ${response.warning}`
      : 'Отзыв отправлен на модерацию. После подтверждения он добавляется на сайт.'
    reviewForm.name = ''
    reviewForm.phone = ''
    reviewForm.review = ''
    reviewForm.rating = 5
  } catch (error: unknown) {
    const statusMessage =
      (error as { data?: { statusMessage?: string }; statusMessage?: string })?.data?.statusMessage ||
      (error as { statusMessage?: string })?.statusMessage
    reviewStatus.value = statusMessage
      ? `Ошибка отправки: ${statusMessage}`
      : 'Не удалось отправить отзыв. Попробуйте позже или напишите в Telegram.'
  } finally {
    isSubmittingReview.value = false
  }
}
</script>

<template>
  <main class="site-main">
    <section v-if="pending && !siteData" class="section reveal-up">
      <h2>Загрузка данных</h2>
      <p>Получаем каталог, праздничные подборки, отзывы и галерею.</p>
    </section>

    <section v-else-if="pageErrorMessage" class="section reveal-up">
      <h2>Ошибка загрузки</h2>
      <p>{{ pageErrorMessage }}</p>
      <button class="btn btn-primary" type="button" @click="refresh">Повторить</button>
    </section>

    <template v-else>
      <SiteAbout />
      <SiteCatalog
        :grouped-products="groupedProducts"
        @select-dessert="selectDessert"
        @open-dessert="openDessertModal"
      />
      <SiteHolidayCatalog
        :title="holidayCatalog.title"
        :sections="holidayCatalog.sections"
        @select-dessert="selectDessert"
        @open-dessert="openDessertModal"
      />
      <SiteConditions />
      <SiteOrderForm
        :form="orderForm"
        :status="orderStatus"
        :is-submitting="isSubmittingOrder"
        :min-order-date="todayIso"
        @submit="submitOrder"
      />
      <SiteReviews
        :reviews="reviews"
        :form="reviewForm"
        :status="reviewStatus"
        :is-submitting="isSubmittingReview"
        @submit="submitReview"
      />
      <SiteContacts
        :phone-display="phoneDisplay"
        :phone-href="phoneHref"
        :telegram-channel="telegramChannel"
        :max-group="maxGroup"
      />
    </template>
  </main>

  <SiteDessertModal :dessert="selectedDessert" @close="closeDessertModal" />
</template>

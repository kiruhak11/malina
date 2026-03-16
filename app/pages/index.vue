<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { Product, Review } from '~/types/site'
import { phoneDisplay, phoneHref, telegramChannel } from '~/data/siteData'

useHead({
  title: 'МАЛИНА — десерты на заказ',
  meta: [
    {
      name: 'description',
      content: 'МАЛИНА — десерты на заказ: меренговые рулеты, зефирные букеты, наборы и индивидуальные заявки.'
    }
  ]
})

const { data: siteData, refresh } = await useFetch<{ desserts: Product[]; reviews: Review[]; gallery: unknown[] }>(
  '/api/site/public'
)

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

const openDessertModal = (dessert: Product) => {
  selectedDessert.value = dessert
}

const closeDessertModal = () => {
  selectedDessert.value = null
}

const selectDessert = (dessertName: string) => {
  orderForm.dessert = dessertName
  const element = document.getElementById('request-form')
  element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const submitOrder = async () => {
  if (!orderForm.name || !orderForm.phone || !orderForm.dessert || !orderForm.orderDate) {
    orderStatus.value = 'Заполните обязательные поля: имя, телефон, десерт и дата заказа.'
    return
  }

  isSubmittingOrder.value = true
  orderStatus.value = ''

  try {
    await $fetch('/api/site/order', {
      method: 'POST',
      body: {
        ...orderForm
      }
    })

    orderStatus.value = 'Заявка отправлена. Мы свяжемся с вами в ближайшее время.'
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
    await $fetch('/api/site/review', {
      method: 'POST',
      body: {
        ...reviewForm
      }
    })

    reviewStatus.value = 'Отзыв отправлен на модерацию. После подтверждения он добавляется на сайт.'
    reviewForm.name = ''
    reviewForm.phone = ''
    reviewForm.review = ''
    reviewForm.rating = 5
    await refresh()
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
    <SiteAbout />
    <SiteCatalog
      :grouped-products="groupedProducts"
      @select-dessert="selectDessert"
      @open-dessert="openDessertModal"
    />
    <SiteConditions />
    <SiteOrderForm :form="orderForm" :status="orderStatus" :is-submitting="isSubmittingOrder" @submit="submitOrder" />
    <SiteReviews :reviews="reviews" :form="reviewForm" :status="reviewStatus" :is-submitting="isSubmittingReview" @submit="submitReview" />
    <SiteContacts
      :phone-display="phoneDisplay"
      :phone-href="phoneHref"
      :telegram-channel="telegramChannel"
    />
  </main>

  <SiteDessertModal :dessert="selectedDessert" @close="closeDessertModal" />
</template>

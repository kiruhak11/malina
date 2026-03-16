<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Review } from '~/types/site'

const props = defineProps<{
  reviews: Review[]
  form: {
    name: string
    phone: string
    review: string
    rating: number
  }
  status: string
  isSubmitting: boolean
}>()

const emit = defineEmits<{
  submit: []
}>()

const statusClass = computed(() => {
  if (!props.status) {
    return ''
  }
  const text = props.status.toLowerCase()
  return text.includes('не удалось') || text.includes('заполните') ? 'status--error' : 'status--success'
})

const stars = [1, 2, 3, 4, 5]
const reviewsTrackRef = ref<HTMLElement | null>(null)
const canScrollPrev = ref(false)
const canScrollNext = ref(false)

const updateScrollState = () => {
  const element = reviewsTrackRef.value
  if (!element) {
    canScrollPrev.value = false
    canScrollNext.value = false
    return
  }

  const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth)
  canScrollPrev.value = element.scrollLeft > 4
  canScrollNext.value = element.scrollLeft < maxScrollLeft - 4
}

const onReviewsScroll = () => {
  updateScrollState()
}

const scrollReviews = (direction: 'prev' | 'next') => {
  const element = reviewsTrackRef.value
  if (!element) {
    return
  }

  const shift = Math.max(240, Math.round(element.clientWidth * 0.82))
  element.scrollBy({
    left: direction === 'next' ? shift : -shift,
    behavior: 'smooth'
  })
}

const onWindowResize = () => {
  updateScrollState()
}

onMounted(async () => {
  await nextTick()
  updateScrollState()
  window.addEventListener('resize', onWindowResize, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
})

watch(
  () => props.reviews.length,
  async () => {
    await nextTick()
    updateScrollState()
  }
)
</script>

<template>
  <section class="section reveal-up" id="reviews">
    <h2>Отзывы</h2>
    <div v-if="reviews.length" class="reviews-strip">
      <div class="reviews-list-shell">
        <div ref="reviewsTrackRef" class="reviews-list" @scroll.passive="onReviewsScroll">
          <article v-for="(item, index) in reviews" :key="item.id" class="review-item glass-soft" :style="{ '--review-index': `${index}` }">
            <div class="review-stars" :aria-label="`Оценка ${item.rating} из 5`">
              <span v-for="star in 5" :key="`display-${item.name}-${star}`" :class="{ active: star <= item.rating }">★</span>
            </div>
            <h3>{{ item.name }}</h3>
            <p>{{ item.text }}</p>
          </article>
        </div>
      </div>
      <div class="reviews-scroll-controls" aria-label="Управление лентой отзывов">
        <button
          class="reviews-scroll-btn"
          type="button"
          aria-label="Прокрутить отзывы влево"
          :disabled="!canScrollPrev"
          @click="scrollReviews('prev')"
        >
          ←
        </button>
        <button
          class="reviews-scroll-btn"
          type="button"
          aria-label="Прокрутить отзывы вправо"
          :disabled="!canScrollNext"
          @click="scrollReviews('next')"
        >
          →
        </button>
      </div>
    </div>
    <p v-else>Пока нет опубликованных отзывов. Вы можете оставить первый.</p>

    <h3>Оставить отзыв</h3>
    <p>Отзыв отправляется в Telegram на модерацию. После подтверждения он добавляется на сайт.</p>
    <form class="form form-shell" @submit.prevent="emit('submit')">
      <label class="field">
        <span class="field-label">Имя</span>
        <input v-model.trim="form.name" type="text" placeholder="Ваше имя" autocomplete="name" maxlength="80" required />
      </label>
      <label class="field">
        <span class="field-label">Телефон</span>
        <input
          v-model.trim="form.phone"
          type="tel"
          placeholder="Контактный телефон"
          autocomplete="tel"
          inputmode="tel"
          maxlength="32"
          required
        />
      </label>

      <fieldset class="field field-full rating-field">
        <legend class="field-label">Оценка</legend>
        <div class="rating-stars" role="radiogroup" aria-label="Выберите оценку">
          <label v-for="star in stars" :key="`rate-${star}`" class="rating-star" :class="{ active: form.rating >= star }">
            <input v-model.number="form.rating" type="radio" name="rating" :value="star" :aria-label="`Оценка ${star}`" required />
            <span>★</span>
          </label>
        </div>
      </fieldset>

      <label class="field field-full">
        <span class="field-label">Текст отзыва</span>
        <textarea v-model.trim="form.review" rows="4" maxlength="1500" placeholder="Ваш отзыв" required />
      </label>

      <div class="submit-row">
        <p class="submit-hint">После модерации отзыв появится в блоке отзывов.</p>
        <button class="btn btn-primary" type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Отправка...' : 'Отправить отзыв' }}
        </button>
      </div>
      <p class="status" :class="statusClass" role="status" aria-live="polite">{{ status }}</p>
    </form>
  </section>
</template>

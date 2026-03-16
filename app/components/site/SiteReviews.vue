<script setup lang="ts">
import { computed } from 'vue'
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
</script>

<template>
  <section class="section reveal-up" id="reviews">
    <h2>Отзывы</h2>
    <div class="reviews-list">
      <article v-for="item in reviews" :key="item.id" class="review-item glass-soft">
        <div class="review-stars" :aria-label="`Оценка ${item.rating} из 5`">
          <span v-for="star in 5" :key="`display-${item.name}-${star}`" :class="{ active: star <= item.rating }">★</span>
        </div>
        <h3>{{ item.name }}</h3>
        <p>{{ item.text }}</p>
      </article>
    </div>

    <h3>Оставить отзыв</h3>
    <p>Отзыв отправляется в Telegram на модерацию. После подтверждения он добавляется на сайт.</p>
    <form class="form form-shell" @submit.prevent="emit('submit')">
      <label class="field">
        <span class="field-label">Имя</span>
        <input v-model.trim="form.name" type="text" placeholder="Ваше имя" required />
      </label>
      <label class="field">
        <span class="field-label">Телефон</span>
        <input v-model.trim="form.phone" type="tel" placeholder="Контактный телефон" required />
      </label>

      <fieldset class="field field-full rating-field">
        <legend class="field-label">Оценка</legend>
        <div class="rating-stars" role="radiogroup" aria-label="Выберите оценку">
          <label v-for="star in stars" :key="`rate-${star}`" class="rating-star" :class="{ active: form.rating >= star }">
            <input v-model.number="form.rating" type="radio" name="rating" :value="star" required />
            <span>★</span>
          </label>
        </div>
      </fieldset>

      <label class="field field-full">
        <span class="field-label">Текст отзыва</span>
        <textarea v-model.trim="form.review" rows="4" placeholder="Ваш отзыв" required />
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

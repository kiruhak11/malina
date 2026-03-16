<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  form: {
    name: string
    phone: string
    dessert: string
    orderDate: string
    details: string
  }
  status: string
  isSubmitting: boolean
  minOrderDate: string
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
</script>

<template>
  <section class="section request reveal-up" id="request-form">
    <h2>Форма заявки</h2>
    <p>Заявка отправляется в Telegram через бота.</p>

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
          placeholder="8 (___) ___-__-__"
          autocomplete="tel"
          inputmode="tel"
          maxlength="32"
          required
        />
      </label>
      <label class="field">
        <span class="field-label">Выбранный десерт</span>
        <input
          id="order-dessert"
          v-model.trim="form.dessert"
          type="text"
          placeholder="Например, Фисташка и малина"
          maxlength="120"
          required
        />
      </label>
      <label class="field">
        <span class="field-label">Дата заказа</span>
        <input v-model="form.orderDate" type="date" :min="minOrderDate" required />
      </label>
      <label class="field field-full">
        <span class="field-label">Дополнительная информация</span>
        <textarea
          v-model.trim="form.details"
          rows="4"
          maxlength="1000"
          placeholder="Пожелания по декору, дате и упаковке"
        />
      </label>

      <div class="submit-row">
        <p class="submit-hint">Ответим в ближайшее время и уточним детали заказа.</p>
        <button class="btn btn-primary" type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Отправка...' : 'Отправить заявку' }}
        </button>
      </div>
      <p class="status" :class="statusClass" role="status" aria-live="polite">{{ status }}</p>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Product } from '~/types/site'

const props = defineProps<{
  dessert: Product | null
}>()

const emit = defineEmits<{
  close: []
}>()

const allPhotos = computed(() => props.dessert?.photos || [])
const activePhotoIndex = ref(0)

const activePhoto = computed(() => allPhotos.value[activePhotoIndex.value] || null)
const extraPhotos = computed(() => allPhotos.value.filter((_, index) => index !== activePhotoIndex.value))

const backdropBackground = computed(() =>
  activePhoto.value
    ? {
        backgroundImage: `url('${activePhoto.value.path}')`
      }
    : {}
)

const selectPhoto = (index: number) => {
  activePhotoIndex.value = index
}

const onEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    emit('close')
  }
}

watch(
  () => props.dessert,
  (current) => {
    if (!process.client) {
      return
    }

    if (current) {
      activePhotoIndex.value = 0
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', onEscape)
    } else {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onEscape)
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (!process.client) {
    return
  }

  document.body.style.overflow = ''
  window.removeEventListener('keydown', onEscape)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="dessert" class="modal-overlay" @click="emit('close')">
      <article class="product-modal product-modal-v2" @click.stop>
        <div class="product-modal-backdrop" :style="backdropBackground" aria-hidden="true" />

        <button class="product-modal-close" type="button" @click="emit('close')" aria-label="Закрыть карточку десерта">
          <span aria-hidden="true">×</span>
        </button>

        <header class="product-modal-head">
          <p class="product-modal-category">{{ dessert.category }}</p>
          <h3>{{ dessert.name }}</h3>
          <p class="product-modal-price">{{ dessert.price }}</p>
        </header>

        <div class="product-modal-grid">
          <section class="product-modal-media">
            <div class="product-modal-cover-wrap">
              <div class="product-modal-cover-bg" :style="backdropBackground" aria-hidden="true" />
              <div class="product-modal-cover" v-if="activePhoto">
                <img :src="activePhoto.path" :alt="activePhoto.title || dessert.name" />
              </div>
              <div v-else class="product-modal-empty">нет данных</div>
            </div>

            <div class="product-modal-thumbs" v-if="allPhotos.length > 1">
              <button
                v-for="(photo, index) in allPhotos"
                :key="photo.id"
                class="product-modal-thumb"
                :class="{ 'is-active': index === activePhotoIndex }"
                type="button"
                :aria-label="`Открыть фото ${index + 1}`"
                @click="selectPhoto(index)"
              >
                <img :src="photo.path" :alt="photo.title || dessert.name" />
              </button>
            </div>
            <div v-else class="product-modal-empty product-modal-empty--small">Дополнительных фото пока нет</div>

            <p v-if="activePhoto?.title" class="product-modal-caption">{{ activePhoto.title }}</p>
          </section>

          <section class="product-modal-info">
            <div class="product-modal-pills">
              <span>
                {{ dessert.leadTimeHours ? `Готовность: ${dessert.leadTimeHours} ч` : 'Готовность: нет данных' }}
              </span>
              <span>{{ allPhotos.length ? `Фото: ${allPhotos.length}` : 'Фото: нет данных' }}</span>
              <span>Ручная работа</span>
            </div>

            <div class="product-modal-text">
              <h4>Описание</h4>
              <p>{{ dessert.description || 'нет данных' }}</p>
            </div>

            <div class="product-modal-text">
              <h4>Состав</h4>
              <p>{{ dessert.inside || 'нет данных' }}</p>
            </div>

            <div class="product-modal-text">
              <h4>Декор</h4>
              <p>{{ dessert.decor || 'нет данных' }}</p>
            </div>

            <div class="product-modal-kbju">
              <h4>КБЖУ</h4>
              <div class="product-kbju-grid">
                <div class="product-kbju-item">
                  <span>Белки</span>
                  <strong>{{ dessert.ttk?.kbju?.proteins || 'нет данных' }}</strong>
                </div>
                <div class="product-kbju-item">
                  <span>Жиры</span>
                  <strong>{{ dessert.ttk?.kbju?.fats || 'нет данных' }}</strong>
                </div>
                <div class="product-kbju-item">
                  <span>Углеводы</span>
                  <strong>{{ dessert.ttk?.kbju?.carbs || 'нет данных' }}</strong>
                </div>
                <div class="product-kbju-item">
                  <span>Ккал</span>
                  <strong>{{ dessert.ttk?.kbju?.kcal || 'нет данных' }}</strong>
                </div>
              </div>
            </div>

            <div v-if="extraPhotos.length" class="product-modal-meta">
              <span>В подборке еще {{ extraPhotos.length }} фото</span>
            </div>
          </section>
        </div>
      </article>
    </div>
  </Teleport>
</template>

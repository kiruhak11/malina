<script setup lang="ts">
useSiteSeo({
  title: 'Галерея десертов — МАЛИНА',
  description: 'Галерея десертов МАЛИНА: фото рулетов, зефира и наборов, выполненных на заказ.',
  path: '/gallery',
  imagePath: '/logo-malina.png'
})

type GalleryPayload = {
  gallery: Array<{
    id: string
    path: string
    title: string | null
  }>
}

const { data, pending, error, refresh } = await useFetch<GalleryPayload>('/api/site/public', { key: 'site-gallery' })

const gallery = computed(() => data.value?.gallery || [])
</script>

<template>
  <main class="site-main">
    <section class="section reveal-up" v-if="pending && !data">
      <h1>Галерея</h1>
      <p>Загрузка фотографий...</p>
    </section>

    <section v-else-if="error" class="section reveal-up">
      <h1>Галерея</h1>
      <p>Не удалось загрузить фотографии.</p>
      <button class="btn btn-primary" type="button" @click="refresh">Повторить</button>
    </section>

    <section v-else class="section reveal-up">
      <h1>Галерея</h1>
      <p>Все фотографии десертов с сайта.</p>
      <div v-if="gallery.length" class="gallery-grid">
        <figure v-for="photo in gallery" :key="photo.id" class="gallery-item">
          <img :src="photo.path" :alt="photo.title || 'Фото десерта'" loading="lazy" />
          <figcaption>{{ photo.title || 'Без названия' }}</figcaption>
        </figure>
      </div>
      <p v-else>Фотографии пока не добавлены.</p>
    </section>
  </main>
</template>

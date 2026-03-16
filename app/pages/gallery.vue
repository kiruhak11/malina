<script setup lang="ts">
const { data } = await useFetch('/api/site/public')

const gallery = computed(() => data.value?.gallery || [])
</script>

<template>
  <main class="site-main">
    <section class="section reveal-up">
      <h1>Галерея</h1>
      <p>Все фотографии десертов с сайта.</p>
      <div class="gallery-grid">
        <figure v-for="photo in gallery" :key="photo.id" class="gallery-item">
          <img :src="photo.path" :alt="photo.title || 'Фото десерта'" loading="lazy" />
          <figcaption>{{ photo.title || 'Без названия' }}</figcaption>
        </figure>
      </div>
    </section>
  </main>
</template>

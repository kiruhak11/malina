<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Product } from '~/types/site'

type HolidaySection = {
  id: string
  name: string
  slug: string
  icon: string | null
  items: Product[]
}

const props = defineProps<{
  title: string
  sections: HolidaySection[]
}>()

const emit = defineEmits<{
  selectDessert: [dessertName: string]
  openDessert: [dessert: Product]
}>()

const activeSectionSlug = ref('')

const sectionCards = computed(() =>
  props.sections.map((section) => ({
    id: section.id,
    name: section.name,
    slug: section.slug,
    icon: section.icon,
    itemsCount: section.items.length,
    coverPhotoPath: section.items[0]?.photos?.[0]?.path || '/images/roll-classic.svg'
  }))
)

const activeSection = computed(() => {
  if (!activeSectionSlug.value) {
    return null
  }

  return props.sections.find((section) => section.slug === activeSectionSlug.value) || null
})

watch(
  () => props.sections,
  (sections) => {
    if (!sections.length) {
      activeSectionSlug.value = ''
      return
    }

    if (!sections.some((section) => section.slug === activeSectionSlug.value)) {
      activeSectionSlug.value = sections[0].slug
    }
  },
  { immediate: true }
)

const selectSection = (slug: string) => {
  activeSectionSlug.value = slug
}
</script>

<template>
  <section class="section reveal-up" id="holiday-catalog">
    <h2>{{ props.title || 'Праздничный каталог' }}</h2>

    <div v-if="props.sections.length" class="catalog-groups">
      <div class="catalog-categories holiday-categories" role="tablist" aria-label="Разделы праздничного каталога">
        <button
          v-for="(section, index) in sectionCards"
          :key="section.id"
          class="catalog-category-card holiday-category-card"
          :class="{ 'holiday-category-card--active': activeSectionSlug === section.slug }"
          :style="{ '--catalog-index': index }"
          type="button"
          role="tab"
          :aria-selected="activeSectionSlug === section.slug"
          @click="selectSection(section.slug)"
        >
          <span
            class="catalog-category-cover"
            :style="{
              backgroundImage: `linear-gradient(130deg, rgba(36, 15, 24, 0.16), rgba(32, 45, 24, 0.2)), url('${section.coverPhotoPath}')`
            }"
          />
          <span class="catalog-category-body">
            <strong>{{ section.name }}</strong>
            <small>
              <template v-if="section.icon">{{ section.icon }} · </template>
              Позиций: {{ section.itemsCount }}
            </small>
          </span>
          <span class="catalog-category-arrow" aria-hidden="true">›</span>
        </button>
      </div>

      <Transition name="holiday-tab-swap" mode="out-in">
        <div v-if="activeSection" :key="activeSection.id" class="catalog-group catalog-surface">
          <div class="catalog-group-head">
            <h3>{{ activeSection.name }}</h3>
            <p>Позиций: {{ activeSection.items.length }}</p>
          </div>

          <div v-if="activeSection.items.length" class="cards">
            <article
              v-for="(item, index) in activeSection.items"
              :key="`${activeSection.slug}-${item.slug}`"
              class="card tilt-hover"
              :style="{ '--catalog-index': index }"
            >
              <div class="card-media">
                <div
                  class="card-image"
                  :style="{
                    backgroundImage: `linear-gradient(130deg, rgba(36, 15, 24, 0.12), rgba(32, 45, 24, 0.16)), url('${item.photos?.[0]?.path || '/images/roll-classic.svg'}')`
                  }"
                />
                <div class="card-image-fade" />
                <p class="card-media-category">{{ item.category }}</p>
                <h4 class="card-media-title">{{ item.name }}</h4>
              </div>
              <div class="card-body">
                <p class="card-description">{{ item.description }}</p>
                <p class="card-line"><strong>Декор:</strong> <span>{{ item.decor }}</span></p>
                <div class="card-footer">
                  <span class="price">{{ item.price }}</span>
                  <div class="card-actions">
                    <button class="btn btn-ghost" type="button" @click="emit('openDessert', item)">Подробнее</button>
                    <button class="btn btn-primary" type="button" @click="emit('selectDessert', item.name)">
                      Оставить заявку
                    </button>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <p v-else class="holiday-empty">В этом разделе пока нет десертов, но скоро появятся</p>
        </div>
      </Transition>
    </div>

    <p v-else>В праздничном каталоге пока нет активных разделов.</p>
  </section>
</template>

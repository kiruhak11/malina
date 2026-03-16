<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Product } from '~/types/site'

type GroupedProducts = {
  category: string
  items: Product[]
}

const props = defineProps<{
  groupedProducts: GroupedProducts[]
}>()

const emit = defineEmits<{
  selectDessert: [dessertName: string]
  openDessert: [dessert: Product]
}>()

const selectedCategory = ref<string | null>(null)

const selectedGroup = computed(() => {
  if (!selectedCategory.value) {
    return null
  }
  return props.groupedProducts.find((group) => group.category === selectedCategory.value) || null
})

const categoryBlocks = computed(() =>
  props.groupedProducts.map((group) => ({
    category: group.category,
    itemsCount: group.items.length,
    coverPhotoPath: group.items[0]?.photos?.[0]?.path || '/images/roll-classic.svg'
  }))
)

const openCategory = (category: string) => {
  selectedCategory.value = category
}

const resetSelectedCategory = () => {
  selectedCategory.value = null
}

watch(
  () => props.groupedProducts,
  (groups) => {
    if (!selectedCategory.value) {
      return
    }
    if (!groups.some((group) => group.category === selectedCategory.value)) {
      selectedCategory.value = null
    }
  }
)
</script>

<template>
  <section class="section reveal-up" id="catalog">
    <h2>Каталог десертов</h2>

    <div v-if="props.groupedProducts.length" class="catalog-groups">
      <div v-if="!selectedCategory" class="catalog-categories">
        <button
          v-for="group in categoryBlocks"
          :key="group.category"
          class="catalog-category-card"
          type="button"
          @click="openCategory(group.category)"
        >
          <span
            class="catalog-category-cover"
            :style="{
              backgroundImage: `linear-gradient(130deg, rgba(36, 15, 24, 0.16), rgba(32, 45, 24, 0.2)), url('${group.coverPhotoPath}')`
            }"
          />
          <span class="catalog-category-body">
            <strong>{{ group.category }}</strong>
            <small>Позиций: {{ group.itemsCount }}</small>
          </span>
          <span class="catalog-category-arrow" aria-hidden="true">›</span>
        </button>
      </div>

      <div v-else-if="selectedGroup" class="catalog-group">
        <div class="catalog-group-head">
          <button class="btn btn-ghost" type="button" @click="resetSelectedCategory">← Все разделы</button>
          <h3>{{ selectedGroup.category }}</h3>
          <p>Позиций: {{ selectedGroup.items.length }}</p>
        </div>

        <div class="cards">
          <article v-for="item in selectedGroup.items" :key="item.slug" class="card tilt-hover">
            <div class="card-media">
              <div
                class="card-image"
                :style="{
                  backgroundImage: `linear-gradient(130deg, rgba(36, 15, 24, 0.12), rgba(32, 45, 24, 0.16)), url('${item.photos?.[0]?.path || '/images/roll-classic.svg'}')`
                }"
              />
              <div class="card-image-fade" />
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
      </div>
    </div>
    <p v-else>В каталоге пока нет активных десертов.</p>
  </section>
</template>

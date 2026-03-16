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
const transitionName = ref<'catalog-swap-forward' | 'catalog-swap-back'>('catalog-swap-forward')

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
  transitionName.value = 'catalog-swap-forward'
  selectedCategory.value = category
}

const resetSelectedCategory = () => {
  transitionName.value = 'catalog-swap-back'
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
      <Transition :name="transitionName" mode="out-in">
        <div v-if="!selectedCategory" key="catalog-categories" class="catalog-categories catalog-surface">
          <button
            v-for="(group, index) in categoryBlocks"
            :key="group.category"
            class="catalog-category-card"
            :style="{ '--catalog-index': index }"
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

        <div v-else-if="selectedGroup" :key="`catalog-group-${selectedGroup.category}`" class="catalog-group catalog-surface">
          <div class="catalog-group-head">
            <button class="btn btn-ghost" type="button" @click="resetSelectedCategory">← Все разделы</button>
            <h3>{{ selectedGroup.category }}</h3>
            <p>Позиций: {{ selectedGroup.items.length }}</p>
          </div>

          <div class="cards">
            <article
              v-for="(item, index) in selectedGroup.items"
              :key="item.slug"
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
        </div>
      </Transition>
    </div>
    <p v-else>В каталоге пока нет активных десертов.</p>
  </section>
</template>

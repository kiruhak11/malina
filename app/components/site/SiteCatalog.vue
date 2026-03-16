<script setup lang="ts">
import type { Product } from '~/types/site'

defineProps<{
  groupedProducts: Array<{ category: string; items: Product[] }>
}>()

const emit = defineEmits<{
  selectDessert: [dessertName: string]
  openDessert: [dessert: Product]
}>()
</script>

<template>
  <section class="section reveal-up" id="catalog">
    <h2>Каталог десертов</h2>

    <div v-if="groupedProducts.length" class="catalog-groups">
      <div
        v-for="group in groupedProducts"
        :key="group.category"
        class="catalog-group"
      >
        <h3>{{ group.category }}</h3>
        <div class="cards">
          <article v-for="item in group.items" :key="item.slug" class="card tilt-hover">
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
              <p class="card-line"><strong>Состав:</strong> <span>{{ item.inside }}</span></p>
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

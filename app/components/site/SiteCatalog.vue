<script setup lang="ts">
import type { Product } from "~/types/site";

defineProps<{
  groupedProducts: Array<{ category: string; items: Product[] }>;
}>();

const emit = defineEmits<{
  selectDessert: [dessertName: string];
  openDessert: [dessert: Product];
}>();
</script>

<template>
  <section class="section reveal-up" id="catalog">
    <h2>Каталог десертов</h2>

    <div class="catalog-groups">
      <div
        v-for="group in groupedProducts"
        :key="group.category"
        class="catalog-group"
      >
        <h3>{{ group.category }}</h3>
        <div class="cards">
          <article
            v-for="item in group.items"
            :key="item.slug"
            class="card tilt-hover"
            role="button"
            tabindex="0"
            @click="emit('openDessert', item)"
            @keydown.enter.prevent="emit('openDessert', item)"
          >
            <div
              class="card-image"
              :style="{
                backgroundImage: `linear-gradient(135deg, rgba(93, 28, 52, 0.22), rgba(133, 45, 78, 0.14)), url('${item.photos?.[0]?.path || '/images/roll-classic.svg'}')`,
              }"
            ></div>
            <div class="card-body">
              <h4>{{ item.name }}</h4>
              <p>{{ item.description }}</p>
              <p><strong>Состав:</strong> {{ item.inside }}</p>
              <p><strong>Декор:</strong> {{ item.decor }}</p>
              <div class="card-footer">
                <span class="price">{{ item.price }}</span>
                <div class="card-actions">
                  <button
                    class="btn btn-primary"
                    type="button"
                    @click.stop="emit('selectDessert', item.name)"
                  >
                    Оставить заявку
                  </button>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

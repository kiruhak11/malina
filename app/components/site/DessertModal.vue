<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import type { Product } from "~/types/site";

const props = defineProps<{
  dessert: Product | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

const allPhotos = computed(() => props.dessert?.photos || []);
const activePhotoIndex = ref(0);
const closeButtonRef = ref<HTMLButtonElement | null>(null);
let previousFocusedElement: HTMLElement | null = null;

const activePhoto = computed(
  () => allPhotos.value[activePhotoIndex.value] || null,
);
const hasKbju = computed(() => Boolean(props.dessert?.ttk?.kbju));

const selectPhoto = (index: number) => {
  activePhotoIndex.value = index;
};

const nextPhoto = () => {
  if (allPhotos.value.length < 2) {
    return;
  }
  activePhotoIndex.value =
    (activePhotoIndex.value + 1) % allPhotos.value.length;
};

const prevPhoto = () => {
  if (allPhotos.value.length < 2) {
    return;
  }
  activePhotoIndex.value =
    (activePhotoIndex.value - 1 + allPhotos.value.length) %
    allPhotos.value.length;
};

const onEscape = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    emit("close");
    return;
  }

  if (event.key === "ArrowRight" && allPhotos.value.length > 1) {
    nextPhoto();
  }

  if (event.key === "ArrowLeft" && allPhotos.value.length > 1) {
    prevPhoto();
  }
};

watch(
  () => props.dessert,
  (current) => {
    if (!process.client) {
      return;
    }

    if (current) {
      activePhotoIndex.value = 0;
      previousFocusedElement =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onEscape);
      nextTick(() => {
        closeButtonRef.value?.focus();
      });
    } else {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onEscape);
      previousFocusedElement?.focus();
      previousFocusedElement = null;
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (!process.client) {
    return;
  }

  document.body.style.overflow = "";
  window.removeEventListener("keydown", onEscape);
  previousFocusedElement = null;
});
</script>

<template>
  <Teleport to="body">
    <div v-if="dessert" class="modal-overlay" @click="emit('close')">
      <article
        class="product-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="dessert.name"
        @click.stop
      >
        <header class="product-modal-head">
          <button
            ref="closeButtonRef"
            class="product-modal-close"
            type="button"
            @click="emit('close')"
            aria-label="Закрыть карточку десерта"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div class="product-modal-grid">
          <section class="product-modal-media">
            <div class="product-modal-cover-wrap">
              <div class="product-modal-cover" v-if="activePhoto">
                <img
                  :src="activePhoto.path"
                  :alt="activePhoto.title || dessert.name"
                />
                <button
                  v-if="allPhotos.length > 1"
                  class="product-modal-nav product-modal-nav--prev"
                  type="button"
                  aria-label="Предыдущее фото"
                  @click="prevPhoto"
                >
                  ‹
                </button>
                <button
                  v-if="allPhotos.length > 1"
                  class="product-modal-nav product-modal-nav--next"
                  type="button"
                  aria-label="Следующее фото"
                  @click="nextPhoto"
                >
                  ›
                </button>
                <p v-if="allPhotos.length > 1" class="product-modal-counter">
                  {{ activePhotoIndex + 1 }} / {{ allPhotos.length }}
                </p>
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

            <p v-if="activePhoto?.title" class="product-modal-caption">
              {{ activePhoto.title }}
            </p>
          </section>

          <section class="product-modal-info">
            <div class="product-modal-info-head">
              <p class="product-modal-category">{{ dessert.category }}</p>
              <h3>{{ dessert.name }}</h3>
              <p class="product-modal-price">{{ dessert.price }}</p>
            </div>

            <div class="product-modal-pills">
              <span>
                {{
                  dessert.leadTimeHours
                    ? `Готовность: ${dessert.leadTimeHours} ч`
                    : "Готовность: нет данных"
                }}
              </span>
              <span>{{
                allPhotos.length
                  ? `Фото: ${allPhotos.length}`
                  : "Фото: нет данных"
              }}</span>
              <span>Ручная работа</span>
            </div>

            <div class="product-modal-text">
              <h4>Описание</h4>
              <p>{{ dessert.description || "нет данных" }}</p>
            </div>

            <div class="product-modal-text">
              <h4>Декор</h4>
              <p>{{ dessert.decor || "нет данных" }}</p>
            </div>

            <div v-if="hasKbju" class="product-modal-kbju">
              <h4>КБЖУ</h4>
              <div class="product-kbju-grid">
                <div class="product-kbju-item">
                  <span>Белки</span>
                  <strong>{{ dessert.ttk?.kbju?.proteins || "—" }}</strong>
                </div>
                <div class="product-kbju-item">
                  <span>Жиры</span>
                  <strong>{{ dessert.ttk?.kbju?.fats || "—" }}</strong>
                </div>
                <div class="product-kbju-item">
                  <span>Углеводы</span>
                  <strong>{{ dessert.ttk?.kbju?.carbs || "—" }}</strong>
                </div>
                <div class="product-kbju-item">
                  <span>Ккал</span>
                  <strong>{{ dessert.ttk?.kbju?.kcal || "—" }}</strong>
                </div>
              </div>
            </div>
          </section>
        </div>
      </article>
    </div>
  </Teleport>
</template>

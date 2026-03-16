<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const props = defineProps<{
  phoneDisplay: string;
  phoneHref: string;
  telegramChannel: string;
  showHero?: boolean;
}>();

const isMobileMenuOpen = ref(false);

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false;
};

const fallbackSlides = [
  {
    path: "/uploads/seed/Merengovyj_rulet_fistashka-malina.png",
    name: "Фисташка и малина",
  },
  {
    path: "/uploads/seed/MERENGOVYJ_RULET_MRAMOR-CHYORNAYA_SMORODINA.png",
    name: "Мрамор — черная смородина",
  },
  {
    path: "/uploads/seed/Kartoshka_v_shokolade.png",
    name: "Картошка в шоколаде",
  },
  {
    path: "/uploads/seed/Zefir_kruglaya_korobka.png",
    name: "Зефир в коробках",
  },
];

const { data: heroData } = await useFetch<{
  desserts: Array<{
    name: string;
    photos: Array<{ path: string }>;
  }>;
}>("/api/site/public", {
  default: () => ({ desserts: [] }),
});

const heroSlides = computed(() => {
  const flattened =
    heroData.value?.desserts?.flatMap((dessert) =>
      (dessert.photos || []).map((photo) => ({
        path: photo.path,
        name: dessert.name,
      })),
    ) || [];

  const unique = flattened.filter(
    (slide, index, array) =>
      array.findIndex((item) => item.path === slide.path) === index,
  );
  return unique.length ? unique.slice(0, 8) : fallbackSlides;
});

const floatingNames = computed(() =>
  [...new Set(heroSlides.value.map((item) => item.name))].slice(0, 6),
);

const activeSlide = ref(0);
let slideTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  if (props.showHero === false || heroSlides.value.length < 2) {
    return;
  }

  slideTimer = setInterval(() => {
    activeSlide.value = (activeSlide.value + 1) % heroSlides.value.length;
  }, 3400);
});

onBeforeUnmount(() => {
  if (slideTimer) {
    clearInterval(slideTimer);
    slideTimer = null;
  }
});
</script>

<template>
  <header class="hero" id="top">
    <nav
      class="top-nav glass-panel reveal-up delay-1"
      :class="{ 'is-open': isMobileMenuOpen }"
    >
      <div class="top-nav-head">
        <NuxtLink to="/" class="brand-block">
          <img class="logo" src="/logo-malina.svg" alt="Логотип МАЛИНА" />
        </NuxtLink>

        <button
          class="nav-toggle"
          type="button"
          :aria-expanded="isMobileMenuOpen"
          aria-controls="mobile-nav-dropdown"
          @click="toggleMobileMenu"
        >
          <span>Меню</span>
          <span class="nav-arrow" aria-hidden="true">▾</span>
        </button>
      </div>

      <div id="mobile-nav-dropdown" class="top-nav-dropdown">
        <div class="nav-links">
          <NuxtLink to="/#about" @click="closeMobileMenu">О нас</NuxtLink>
          <NuxtLink to="/#catalog" @click="closeMobileMenu">Каталог</NuxtLink>
          <NuxtLink to="/gallery" @click="closeMobileMenu">Галерея</NuxtLink>
          <NuxtLink to="/#reviews" @click="closeMobileMenu">Отзывы</NuxtLink>
          <NuxtLink to="/#contacts" @click="closeMobileMenu">Контакты</NuxtLink>
        </div>
        <div class="mobile-actions">
          <NuxtLink
            class="btn btn-primary"
            to="/#request-form"
            @click="closeMobileMenu"
            >Заявка</NuxtLink
          >
          <a
            class="btn btn-ghost"
            :href="telegramChannel"
            target="_blank"
            rel="noopener noreferrer"
            @click="closeMobileMenu"
            >Telegram</a
          >
        </div>
        <a class="mobile-phone" :href="phoneHref" @click="closeMobileMenu">{{
          phoneDisplay
        }}</a>
      </div>
    </nav>

    <div v-if="showHero !== false" class="hero-grid">
      <div class="hero-content reveal-up delay-2">
        <p class="badge">Десерты ручной работы</p>
        <h1>МАЛИНА — десерты на заказ</h1>
        <p class="hero-text">
          Нежные рулеты, зефирные букеты и подарочные наборы из натуральных
          ингредиентов. Изготавливаем десерты под ваш запрос и дату.
        </p>
        <div class="hero-actions">
          <NuxtLink class="btn btn-primary" to="/#request-form"
            >Оставить заявку</NuxtLink
          >
          <a
            class="btn btn-ghost"
            :href="telegramChannel"
            target="_blank"
            rel="noopener noreferrer"
            >Telegram канал</a
          >
        </div>
        <div class="hero-contacts">
          <a :href="phoneHref">{{ phoneDisplay }}</a>
          <span>Срок заказа: рулеты 48 часов, зефир 72 часа</span>
        </div>
      </div>

      <div
        class="hero-visual hero-visual-slider reveal-up delay-3"
        aria-hidden="true"
      >
        <div class="hero-slides">
          <div
            v-for="(slide, index) in heroSlides"
            :key="`${slide.path}-${index}`"
            class="hero-slide"
            :class="{ 'is-active': index === activeSlide }"
            :style="{ backgroundImage: `url('${slide.path}')` }"
          />
          <div class="hero-slide-tint" />
        </div>

        <div class="hero-float-labels">
          <span
            v-for="(name, index) in floatingNames"
            :key="`${name}-${index}`"
            :style="{ animationDelay: `${index * 0.35}s` }"
          >
            {{ name }}
          </span>
        </div>
      </div>
    </div>
  </header>
</template>

<style>
.logo {
  object-fit: cover;
  width: 200px;
  height: 60px;
}
</style>

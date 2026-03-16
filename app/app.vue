<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { maxGroup, phoneDisplay, phoneHref, telegramChannel } from '~/data/siteData'

const route = useRoute()
const showHero = computed(() => route.path === '/')
const isAdminRoute = computed(() => route.path.startsWith('/admin'))
const isScrollTopVisible = ref(false)

const updateScrollTopVisibility = () => {
  if (!process.client) {
    return
  }
  isScrollTopVisible.value = window.scrollY > 580
}

const scrollToTop = () => {
  if (!process.client) {
    return
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const showScrollTopButton = computed(() => !isAdminRoute.value && isScrollTopVisible.value)

onMounted(() => {
  updateScrollTopVisibility()
  window.addEventListener('scroll', updateScrollTopVisibility, { passive: true })
})

onBeforeUnmount(() => {
  if (!process.client) {
    return
  }
  window.removeEventListener('scroll', updateScrollTopVisibility)
})

watch(
  () => route.fullPath,
  () => {
    if (!process.client) {
      return
    }
    requestAnimationFrame(updateScrollTopVisibility)
  }
)
</script>

<template>
  <div class="site-shell">
    <NuxtRouteAnnouncer />
    <SiteBackdrop v-if="!isAdminRoute" />

    <SiteHeader
      v-if="!isAdminRoute"
      :phone-display="phoneDisplay"
      :phone-href="phoneHref"
      :telegram-channel="telegramChannel"
      :max-group="maxGroup"
      :show-hero="showHero"
    />

    <NuxtPage />

    <button
      v-if="showScrollTopButton"
      class="scroll-top-btn"
      type="button"
      aria-label="Подняться вверх"
      @click="scrollToTop"
    >
      ↑
    </button>
  </div>
</template>

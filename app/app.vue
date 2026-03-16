<script setup lang="ts">
import { computed } from 'vue'
import { phoneDisplay, phoneHref, telegramChannel } from '~/data/siteData'

const route = useRoute()
const showHero = computed(() => route.path === '/')
const isAdminRoute = computed(() => route.path.startsWith('/admin'))
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
      :show-hero="showHero"
    />

    <NuxtPage />
  </div>
</template>

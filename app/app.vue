<script setup lang="ts">
import { computed } from 'vue'
import { phoneDisplay, phoneHref, telegramChannel } from '~/data/siteData'

const route = useRoute()
const showHero = computed(() => route.path === '/')
</script>

<template>
  <div class="site-shell">
    <NuxtRouteAnnouncer />
    <SiteBackdrop />

    <SiteHeader
      :phone-display="phoneDisplay"
      :phone-href="phoneHref"
      :telegram-channel="telegramChannel"
      :show-hero="showHero"
    />

    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  phoneDisplay: string
  phoneHref: string
  telegramChannel: string
}>()
</script>

<template>
  <section class="section contacts reveal-up" id="contacts">
    <h2>Контакты</h2>
    <p>
      Телефон:
      <a :href="phoneHref">{{ phoneDisplay }}</a>
    </p>
    <p>
      Telegram канал:
      <a :href="telegramChannel" target="_blank" rel="noopener noreferrer">Перейти в канал</a>
    </p>
  </section>
</template>

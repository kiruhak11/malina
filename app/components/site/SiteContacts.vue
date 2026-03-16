<script setup lang="ts">
defineProps<{
  phoneDisplay: string
  phoneHref: string
  telegramChannel: string
  maxGroup: string
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
    <p>
      MAX группа:
      <a :href="maxGroup" target="_blank" rel="noopener noreferrer">Перейти в группу</a>
    </p>
  </section>
</template>

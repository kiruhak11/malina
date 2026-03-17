<script setup lang="ts">
import { computed } from 'vue'
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const statusCode = computed(() => {
  const parsed = Number(props.error?.statusCode || 500)
  return Number.isFinite(parsed) ? parsed : 500
})

const details = computed(() => {
  if (statusCode.value === 404) {
    return {
      title: 'Страница не найдена',
      description: 'Похоже, ссылка устарела или адрес введен с ошибкой. Вернитесь на главную и выберите нужный раздел.'
    }
  }

  if (statusCode.value === 401 || statusCode.value === 403) {
    return {
      title: 'Доступ ограничен',
      description: 'У вас нет прав для просмотра этой страницы. Проверьте доступ или перейдите в другой раздел.'
    }
  }

  return {
    title: 'Временный сбой на сервере',
    description: 'Мы уже получили сигнал об ошибке. Попробуйте обновить страницу через несколько секунд.'
  }
})

const technicalMessage = computed(() => {
  const raw = String(props.error?.statusMessage || props.error?.message || '').trim()
  if (!raw || raw === details.value.title) {
    return ''
  }
  return raw
})

useHead(() => ({
  title: `${statusCode.value} — ${details.value.title}`
}))

useSeoMeta({
  robots: 'noindex, nofollow, noarchive, nosnippet, noimageindex',
  googlebot: 'noindex, nofollow, noarchive, nosnippet, noimageindex'
})

const goHome = () => clearError({ redirect: '/' })
const retry = () => clearError()
const goBack = async () => {
  if (process.client && window.history.length > 1) {
    window.history.back()
    return
  }
  await clearError({ redirect: '/' })
}
</script>

<template>
  <main class="error-stage">
    <div class="error-bg" aria-hidden="true">
      <span class="error-orb orb-a" />
      <span class="error-orb orb-b" />
      <span class="error-orb orb-c" />
      <span class="error-grid" />
    </div>

    <section class="error-shell">
      <p class="error-kicker">МАЛИНА</p>

      <div class="error-code-wrap" aria-hidden="true">
        <span class="error-code-shadow">{{ statusCode }}</span>
        <h1 class="error-code">{{ statusCode }}</h1>
        <span class="error-orbit orbit-1" />
        <span class="error-orbit orbit-2" />
      </div>

      <h2>{{ details.title }}</h2>
      <p class="error-description">{{ details.description }}</p>
      <p v-if="technicalMessage" class="error-technical">Технические детали: {{ technicalMessage }}</p>

      <div class="error-actions">
        <button class="error-btn error-btn-primary" type="button" @click="goHome">На главную</button>
        <button class="error-btn error-btn-soft" type="button" @click="goBack">Назад</button>
        <button class="error-btn error-btn-ghost" type="button" @click="retry">Повторить</button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.error-stage {
  min-height: 100vh;
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: 1.25rem;
  background:
    radial-gradient(circle at 14% 18%, rgba(159, 191, 115, 0.16), transparent 35%),
    radial-gradient(circle at 85% 85%, rgba(232, 106, 154, 0.22), transparent 36%),
    linear-gradient(160deg, #fff9fb 0%, #fff2f7 48%, #f8fcef 100%);
}

.error-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.error-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(16px);
  opacity: 0.44;
}

.orb-a {
  width: 320px;
  height: 320px;
  left: -90px;
  top: -110px;
  background: radial-gradient(circle at 35% 35%, #ffbdd8, #dd5e90 74%);
  animation: orbFloatA 16s ease-in-out infinite;
}

.orb-b {
  width: 280px;
  height: 280px;
  right: -70px;
  top: 28%;
  background: radial-gradient(circle at 60% 35%, #e9f3d9, #9fbe74 78%);
  animation: orbFloatB 18s ease-in-out infinite;
}

.orb-c {
  width: 260px;
  height: 260px;
  left: 44%;
  bottom: -120px;
  background: radial-gradient(circle at 50% 40%, #ffcde1, #ee8ab1 74%);
  animation: orbFloatC 14s ease-in-out infinite;
}

.error-grid {
  position: absolute;
  inset: 0;
  opacity: 0.28;
  background:
    linear-gradient(transparent 96%, rgba(198, 58, 107, 0.1) 100%),
    linear-gradient(90deg, transparent 96%, rgba(198, 58, 107, 0.1) 100%);
  background-size: 34px 34px;
  mask-image: radial-gradient(circle at center, black 28%, transparent 78%);
}

.error-shell {
  width: min(760px, 100%);
  position: relative;
  z-index: 1;
  text-align: center;
  border-radius: 26px;
  padding: clamp(1.2rem, 3.2vw, 2.2rem);
  border: 1px solid rgba(198, 58, 107, 0.2);
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(10px);
  box-shadow:
    0 22px 42px rgba(141, 32, 73, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.65);
  animation: cardReveal 0.6s cubic-bezier(0.18, 0.78, 0.25, 1) both;
}

.error-kicker {
  margin: 0;
  color: #6f8f47;
  font-size: 0.74rem;
  letter-spacing: 0.18em;
  font-weight: 800;
}

.error-code-wrap {
  margin: 0.55rem auto 0.45rem;
  width: min(410px, 100%);
  position: relative;
  padding-block: 0.45rem;
}

.error-code-shadow {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: clamp(4rem, 16vw, 8rem);
  font-weight: 900;
  color: rgba(166, 41, 86, 0.08);
  transform: translate(7px, 6px);
  user-select: none;
}

.error-code {
  margin: 0;
  position: relative;
  line-height: 0.9;
  font-size: clamp(4rem, 16vw, 8rem);
  font-weight: 900;
  letter-spacing: 0.03em;
  background: linear-gradient(130deg, #a92353 10%, #cc4f80 48%, #6f8f47 96%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 10px 24px rgba(135, 31, 70, 0.14);
}

.error-orbit {
  position: absolute;
  inset: 50% auto auto 50%;
  width: clamp(210px, 45vw, 320px);
  height: clamp(210px, 45vw, 320px);
  border-radius: 50%;
  pointer-events: none;
}

.orbit-1 {
  border: 1px solid rgba(166, 35, 83, 0.24);
  transform: translate(-50%, -50%);
  animation: spin 10s linear infinite;
}

.orbit-2 {
  border: 1px dashed rgba(111, 143, 71, 0.4);
  transform: translate(-50%, -50%) scale(1.12);
  animation: spinReverse 14s linear infinite;
}

h2 {
  margin: 0.25rem 0 0;
  font-family: "Cormorant Infant", Georgia, serif;
  font-size: clamp(1.95rem, 3.4vw, 2.6rem);
  color: #2f1c26;
}

.error-description {
  margin: 0.65rem auto 0;
  max-width: 57ch;
  line-height: 1.66;
  color: #5b4652;
}

.error-technical {
  margin: 0.6rem auto 0;
  max-width: 62ch;
  padding: 0.56rem 0.72rem;
  border-radius: 12px;
  border: 1px solid rgba(198, 58, 107, 0.2);
  background: rgba(255, 245, 250, 0.72);
  color: #815a6a;
  font-size: 0.92rem;
  line-height: 1.55;
}

.error-actions {
  margin-top: 1.05rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.6rem;
}

.error-btn {
  border: 0;
  border-radius: 999px;
  min-height: 42px;
  padding: 0.62rem 1rem;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease;
}

.error-btn:hover {
  transform: translateY(-1px);
}

.error-btn-primary {
  color: #fff;
  background: linear-gradient(120deg, #b52f61, #de5f8f);
  box-shadow: 0 12px 24px rgba(149, 34, 79, 0.22);
}

.error-btn-primary:hover {
  box-shadow: 0 14px 28px rgba(149, 34, 79, 0.28);
}

.error-btn-soft {
  color: #4d6b2b;
  background: linear-gradient(130deg, rgba(233, 245, 212, 0.95), rgba(247, 252, 239, 0.98));
  border: 1px solid rgba(111, 143, 71, 0.35);
}

.error-btn-ghost {
  color: #8d2e5b;
  background: rgba(255, 255, 255, 0.84);
  border: 1px solid rgba(198, 58, 107, 0.22);
}

@keyframes cardReveal {
  from {
    opacity: 0;
    transform: translateY(22px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes spin {
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@keyframes spinReverse {
  to {
    transform: translate(-50%, -50%) scale(1.12) rotate(-360deg);
  }
}

@keyframes orbFloatA {
  0%,
  100% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(18px, 22px);
  }
}

@keyframes orbFloatB {
  0%,
  100% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(-20px, 26px);
  }
}

@keyframes orbFloatC {
  0%,
  100% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(14px, -18px);
  }
}

@media (max-width: 760px) {
  .error-shell {
    border-radius: 20px;
    padding: 1.1rem 0.95rem;
  }

  .error-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .error-btn {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
</style>

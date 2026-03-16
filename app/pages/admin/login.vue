<script setup lang="ts">
useHead({
  title: 'Вход в админ-панель — МАЛИНА'
})

const form = reactive({
  login: '',
  password: ''
})

const status = ref('')
const isSubmitting = ref(false)

const authFetch = process.server ? useRequestFetch() : $fetch
const session = await authFetch<{ authenticated: boolean }>('/api/admin/session').catch(() => ({ authenticated: false }))
if (session.authenticated) {
  await navigateTo('/admin')
}

const submit = async () => {
  status.value = ''
  isSubmitting.value = true

  try {
    await $fetch('/api/admin/login', {
      method: 'POST',
      body: {
        login: form.login,
        password: form.password
      }
    })

    await navigateTo('/admin')
  } catch (error: unknown) {
    const statusMessage =
      (error as { data?: { statusMessage?: string }; statusMessage?: string })?.data?.statusMessage ||
      (error as { statusMessage?: string })?.statusMessage
    status.value = statusMessage || 'Неверный логин или пароль.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="site-main">
    <section class="section admin-login reveal-up">
      <h1>Админ-панель</h1>
      <p>Введите логин и пароль администратора.</p>

      <form class="form form-shell" @submit.prevent="submit">
        <label class="field">
          <span class="field-label">Логин</span>
          <input v-model.trim="form.login" type="text" placeholder="malinaAdminP" required />
        </label>
        <label class="field">
          <span class="field-label">Пароль</span>
          <input v-model.trim="form.password" type="password" placeholder="malinaAdminP" required />
        </label>

        <div class="submit-row">
          <p class="submit-hint">Доступ только для администратора.</p>
          <button class="btn btn-primary" type="submit" :disabled="isSubmitting">
            {{ isSubmitting ? 'Проверка...' : 'Войти' }}
          </button>
        </div>

        <p class="status" :class="status ? 'status--error' : ''">{{ status }}</p>
      </form>
    </section>
  </main>
</template>

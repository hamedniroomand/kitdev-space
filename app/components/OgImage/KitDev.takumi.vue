<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  description?: string
  eyebrow?: string
  siteName?: string
}>(), {
  title: 'KitDev Space',
  description: 'Developer tools for people who build things.',
  eyebrow: 'KitDev Space',
  siteName: 'kitdev.space'
})
</script>

<template>
  <div
    class="w-full h-full flex flex-col justify-between relative overflow-hidden"
    style="background-color: #020617; color: #ffffff; padding: 64px;"
  >
    <div
      class="absolute inset-0"
      style="background-image: radial-gradient(at 100% 0%, rgba(96, 165, 250, 0.22), transparent 55%), radial-gradient(at 0% 100%, rgba(30, 58, 138, 0.35), transparent 50%);"
    />

    <div
      class="relative flex flex-col gap-6"
      style="max-width: 980px;"
    >
      <p
        class="m-0 font-mono uppercase"
        style="font-size: 22px; font-weight: 600; letter-spacing: 0.18em; color: #60a5fa;"
      >
        {{ eyebrow }}
      </p>
      <h1
        class="m-0"
        style="font-size: 72px; font-weight: 500; line-height: 1.04; letter-spacing: -0.02em; color: #ffffff;"
      >
        {{ title }}
      </h1>
      <p
        v-if="description"
        class="m-0"
        style="font-size: 28px; font-weight: 400; line-height: 1.45; color: #a1a1aa; max-width: 900px;"
      >
        {{ description }}
      </p>
    </div>

    <div
      class="relative flex items-center justify-between"
      style="margin-top: 48px;"
    >
      <p
        class="m-0"
        style="font-size: 28px; font-weight: 500; color: #ffffff;"
      >
        KitDev <span style="color: #60a5fa;">Space</span>
      </p>
      <p
        class="m-0 font-mono"
        style="font-size: 20px; font-weight: 600; letter-spacing: 0.08em; color: #a1a1aa;"
      >
        {{ siteName }}
      </p>
    </div>
  </div>
</template>

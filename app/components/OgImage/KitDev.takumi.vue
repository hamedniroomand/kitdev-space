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
    style="background-color: #111827; color: #fdfbf7; padding: 64px;"
  >
    <div
      class="absolute inset-0"
      style="background-image: radial-gradient(at 100% 0%, rgba(230, 92, 0, 0.28), transparent 55%), radial-gradient(at 0% 100%, rgba(255, 179, 128, 0.18), transparent 50%);"
    />

    <div
      class="relative flex flex-col gap-6"
      style="max-width: 980px;"
    >
      <p
        class="m-0 font-mono uppercase"
        style="font-size: 22px; font-weight: 600; letter-spacing: 0.18em; color: #e65c00;"
      >
        {{ eyebrow }}
      </p>
      <h1
        class="m-0"
        style="font-size: 72px; font-weight: 500; line-height: 1.04; letter-spacing: -0.02em; color: #fdfbf7;"
      >
        {{ title }}
      </h1>
      <p
        v-if="description"
        class="m-0"
        style="font-size: 28px; font-weight: 400; line-height: 1.45; color: #9ca3af; max-width: 900px;"
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
        style="font-size: 28px; font-weight: 500; color: #fdfbf7;"
      >
        KitDev <span style="color: #e65c00;">Space</span>
      </p>
      <p
        class="m-0 font-mono"
        style="font-size: 20px; font-weight: 600; letter-spacing: 0.08em; color: #9ca3af;"
      >
        {{ siteName }}
      </p>
    </div>
  </div>
</template>

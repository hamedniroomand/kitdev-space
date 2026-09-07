<script setup lang="ts">
const props = withDefaults(defineProps<{
  title?: string
  description?: string
  eyebrow?: string
  siteName?: string
}>(), {
  title: 'Small tasks. Useful tools.',
  description: 'Inspect, convert, and prepare data for your next step.',
  eyebrow: 'Developer tools',
  siteName: 'kitdev.space',
})

const titleSize = computed(() => props.title.length > 48 ? 56 : 72)
</script>

<template>
  <div
    class="relative flex h-full w-full flex-col overflow-hidden"
    style="background-color: #0a0a0e; color: #fafafa; padding: 56px 64px;"
  >
    <div
      v-for="line in 9"
      :key="`v${line}`"
      class="absolute"
      :style="{ left: `${640 + line * 64}px`, top: '0px', width: '1px', height: '630px', backgroundColor: '#202027' }"
    />
    <div
      v-for="line in 10"
      :key="`h${line}`"
      class="absolute"
      :style="{ left: '704px', top: `${line * 64}px`, width: '496px', height: '1px', backgroundColor: '#202027' }"
    />
    <div class="absolute" style="right: 112px; top: 128px; width: 128px; height: 128px; border: 1px solid #818cf8; background-color: #141421;" />
    <div class="absolute" style="right: 176px; top: 192px; width: 128px; height: 128px; border: 1px solid #3f3f52; background-color: #111116;" />

    <div class="relative flex items-center justify-between" style="border-bottom: 1px solid #303038; padding-bottom: 24px;">
      <div style="font-size: 26px; font-weight: 600; letter-spacing: -0.8px;">
        KitDev <span style="color: #818cf8;">Space</span>
      </div>
      <span style="font-size: 17px; color: #a1a1aa;">{{ siteName }}</span>
    </div>

    <div class="relative flex flex-1 flex-col justify-center" style="max-width: 960px; padding: 28px 0;">
      <p class="m-0" style="font-size: 17px; color: #a5a5b5; margin-bottom: 20px;">
        {{ eyebrow }}
      </p>
      <h1
        class="m-0"
        :style="{ fontSize: `${titleSize}px`, fontWeight: 500, lineHeight: 1.08, letterSpacing: '-2px', maxWidth: '930px' }"
      >
        {{ title }}
      </h1>
      <p v-if="description" class="m-0" style="font-size: 24px; line-height: 1.45; color: #b0b0ba; max-width: 860px; margin-top: 24px;">
        {{ description }}
      </p>
    </div>

    <div class="relative flex items-center justify-between" style="border-top: 1px solid #303038; padding-top: 22px;">
      <span style="font-size: 17px; color: #a1a1aa;">Free developer tools</span>
      <div class="flex" style="gap: 8px;">
        <div style="width: 28px; height: 4px; background-color: #818cf8;" />
        <div style="width: 28px; height: 4px; background-color: #3f3f52;" />
        <div style="width: 28px; height: 4px; background-color: #3f3f52;" />
      </div>
    </div>
  </div>
</template>

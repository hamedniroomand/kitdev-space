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
  siteName: 'kitdev.space',
})
</script>

<template>
  <div
    class="w-full h-full flex flex-col justify-between relative overflow-hidden"
    style="background-color: #0a0a0e; color: #ffffff; padding: 48px;"
  >
    <!-- Forge ambient glow background -->
    <div
      class="absolute inset-0"
      style="background-image: radial-gradient(at 100% 0%, rgba(129, 140, 248, 0.20), transparent 45%), radial-gradient(at 0% 100%, rgba(6, 182, 212, 0.14), transparent 50%);"
    />

    <!-- Forge Surface Card container -->
    <div
      class="relative flex flex-col justify-between h-full w-full"
      style="background-color: #18181b; border: 1px solid #27272a; border-radius: 20px; padding: 52px 56px;"
    >
      <div class="flex flex-col gap-5">
        <!-- Forge Label Badge -->
        <div class="flex items-center">
          <span
            class="font-mono uppercase"
            style="font-size: 15px; font-weight: 600; letter-spacing: 0.12em; color: #818cf8; background-color: rgba(129, 140, 248, 0.10); border: 1px solid rgba(129, 140, 248, 0.28); border-radius: 9999px; padding: 6px 16px;"
          >
            {{ eyebrow }}
          </span>
        </div>

        <!-- Forge Display Heading -->
        <h1
          class="m-0"
          style="font-size: 60px; font-weight: 500; line-height: 1.06; letter-spacing: -0.02em; color: #ffffff; max-width: 950px;"
        >
          {{ title }}
        </h1>

        <!-- Forge Body Description -->
        <p
          v-if="description"
          class="m-0"
          style="font-size: 24px; font-weight: 400; line-height: 1.5; color: #a1a1aa; max-width: 900px;"
        >
          {{ description }}
        </p>
      </div>

      <!-- Forge Footer -->
      <div
        class="flex items-center justify-between"
        style="border-top: 1px solid #27272a; padding-top: 28px; margin-top: 24px;"
      >
        <p
          class="m-0"
          style="font-size: 26px; font-weight: 600; color: #ffffff;"
        >
          KitDev <span style="color: #818cf8;">Space</span>
        </p>

        <div class="flex items-center gap-3">
          <span
            class="font-mono"
            style="font-size: 14px; font-weight: 500; color: #a1a1aa; background-color: #0a0a0e; border: 1px solid #27272a; border-radius: 9999px; padding: 4px 12px;"
          >
            Sub-10ms Native Speed
          </span>
          <span
            class="font-mono"
            style="font-size: 18px; font-weight: 600; letter-spacing: 0.05em; color: #a1a1aa;"
          >
            {{ siteName }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

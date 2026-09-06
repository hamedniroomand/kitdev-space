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
    style="background-color: #fdfbf7; color: #111827; padding: 48px;"
  >
    <!-- PaperFlow ambient glow background -->
    <div
      class="absolute inset-0"
      style="background-image: radial-gradient(at 100% 0%, rgba(230, 92, 0, 0.12), transparent 45%), radial-gradient(at 0% 100%, rgba(255, 179, 128, 0.20), transparent 50%);"
    />

    <!-- PaperFlow Surface Card container -->
    <div
      class="relative flex flex-col justify-between h-full w-full"
      style="background-color: #f7f4eb; border: 1px solid #e5e7eb; border-radius: 20px; padding: 52px 56px;"
    >
      <div class="flex flex-col gap-5">
        <!-- PaperFlow Label Badge -->
        <div class="flex items-center">
          <span
            class="font-mono uppercase"
            style="font-size: 15px; font-weight: 600; letter-spacing: 0.12em; color: #e65c00; background-color: rgba(230, 92, 0, 0.08); border: 1px solid rgba(230, 92, 0, 0.22); border-radius: 9999px; padding: 6px 16px;"
          >
            {{ eyebrow }}
          </span>
        </div>

        <!-- PaperFlow Display Heading -->
        <h1
          class="m-0"
          style="font-size: 60px; font-weight: 500; line-height: 1.06; letter-spacing: -0.02em; color: #111827; max-width: 950px;"
        >
          {{ title }}
        </h1>

        <!-- PaperFlow Body Description -->
        <p
          v-if="description"
          class="m-0"
          style="font-size: 24px; font-weight: 400; line-height: 1.5; color: #4b5563; max-width: 900px;"
        >
          {{ description }}
        </p>
      </div>

      <!-- PaperFlow Footer -->
      <div
        class="flex items-center justify-between"
        style="border-top: 1px solid #e5e7eb; padding-top: 28px; margin-top: 24px;"
      >
        <p
          class="m-0"
          style="font-size: 26px; font-weight: 600; color: #111827;"
        >
          KitDev <span style="color: #e65c00;">Space</span>
        </p>

        <div class="flex items-center gap-3">
          <span
            class="font-mono"
            style="font-size: 14px; font-weight: 500; color: #4b5563; background-color: #fdfbf7; border: 1px solid #e5e7eb; border-radius: 9999px; padding: 4px 12px;"
          >
            Sub-10ms Native Speed
          </span>
          <span
            class="font-mono"
            style="font-size: 18px; font-weight: 600; letter-spacing: 0.05em; color: #4b5563;"
          >
            {{ siteName }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

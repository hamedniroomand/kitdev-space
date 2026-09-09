<template>
  <ShadesTool tool-id="tailwind-shades">
    <template #docs>
      <ToolDocs title="About shade scales">
        <div class="space-y-4 text-muted">
          <p>
            This tool builds a full 50 to 950 scale from one color. Tailwind CSS uses these steps, so the result drops into a theme with no change.
          </p>
          <p>
            A scale keeps the character of the color at every step. A hand-picked set of shades often drifts in hue, which makes an interface look inconsistent.
          </p>
          <p>
            The generator works in OKLCH, so each step moves in equal perceptual steps. Select the base shade to hold your color at another step, such as 700 for a dark brand color.
          </p>
          <p>
            Use a light step for a background, a middle step for a border, and a dark step for text. Each swatch shows if white text or black text passes WCAG AA on it.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Contrast Checker', to: '/hub/color/contrast-checker' },
            { label: 'Palette Generator', to: '/hub/color/palette-generator' },
            { label: 'Color Converter', to: '/hub/color/converter' },
          ]"
        />
      </ToolDocs>
    </template>
  </ShadesTool>
</template>

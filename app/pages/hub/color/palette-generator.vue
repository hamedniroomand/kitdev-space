<template>
  <ShadesTool
    tool-id="palette"
    base-color="#7c3aed"
    format="css"
  >
    <template #docs>
      <ToolDocs title="About palettes">
        <div class="space-y-4 text-muted">
          <p>
            This tool builds a palette of 11 stops from one base color. The stops go from 50, which is almost white, to 950, which is almost black.
          </p>
          <p>
            Give the tool your brand color. The tool keeps that color and calculates the other stops around it in OKLCH, so each stop moves in an equal perceptual step.
          </p>
          <p>
            Select a swatch to copy its HEX value. Select "Copy all as CSS variables" for a full set of custom properties, or "Copy all as JSON" for a design token file.
          </p>
          <p>
            Select the pencil on a swatch to set an exact value for one stop. The other stops do not change.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Tailwind Shade Generator', to: '/hub/color/tailwind-shades' },
            { label: 'Color Converter', to: '/hub/color/converter' },
            { label: 'Contrast Checker', to: '/hub/color/contrast-checker' },
          ]"
        />
      </ToolDocs>
    </template>
  </ShadesTool>
</template>

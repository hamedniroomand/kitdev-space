<template>
  <ImageStudioTool tool-id="image-studio">
    <template #docs>
      <ToolDocs title="About the image studio">
        <div class="space-y-4 text-muted">
          <p>
            This tool resizes, rotates, mirrors, and converts an image in one operation. Each setting
            runs in the same pass, so the image is encoded one time. Two separate tools encode twice,
            and the second encode loses quality for no gain.
          </p>
          <p>
            The order is rotate, mirror, resize, grayscale, then encode. Rotation comes first, so the
            width and the height apply to the final image.
          </p>
          <p>
            Choose a file. Set the size, the transform, and the output format. Then select Process.
            WebP and AVIF give the smallest file for the web. PNG has no quality setting, because it
            has no loss.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'EXIF & Metadata Inspector', to: '/hub/image/metadata' },
            { label: 'SVG to PNG / WebP', to: '/hub/image/svg-converter' },
            { label: 'Favicon Set Generator', to: '/hub/image/favicon-generator' }
          ]"
        />
      </ToolDocs>
    </template>
  </ImageStudioTool>
</template>

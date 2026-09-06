<template>
  <ImageStudioTool
    tool-id="image-converter"
    format="webp"
  >
    <template #docs>
      <ToolDocs title="About image conversion">
        <div class="space-y-4 text-muted">
          <p>
            This tool converts an image to WebP, AVIF, JPEG, or PNG. WebP and AVIF give the smallest file for the web. AVIF is smaller than WebP at the same quality, but the encode is slower and an old browser does not open it. JPEG is the safe choice for a photo that must open everywhere. PNG has no loss and keeps transparency.
          </p>
          <p>
            The quality setting applies to WebP, AVIF, and JPEG. A value of 80 is a good start for a photo. PNG ignores the quality setting, because it has no loss.
          </p>
          <p>
            Choose a file and a format, then select Process. The result shows the input size and the output size, so you can compare them.
          </p>
          <p>
            The conversion runs on the server with Bun. The file is processed in memory and is not stored. To resize the image in the same pass, set an output size.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Image Studio', to: '/hub/image/studio' },
            { label: 'Image Resizer', to: '/hub/image/resizer' },
            { label: 'SVG to PNG / WebP', to: '/hub/image/svg-converter' },
          ]"
        />
      </ToolDocs>
    </template>
  </ImageStudioTool>
</template>

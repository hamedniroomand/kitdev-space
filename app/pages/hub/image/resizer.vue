<template>
  <ImageStudioTool
    tool-id="image-resizer"
    size-mode="open-graph"
  >
    <template #docs>
      <ToolDocs title="About image resizing">
        <div class="space-y-4 text-muted">
          <p>
            This tool resizes an image to an exact width and height. Choose a social media preset, such as OpenGraph at 1200 by 630 or Twitter Banner at 1500 by 500, or enter a custom size.
          </p>
          <p>
            The Inside fit keeps the aspect ratio and fits the image in the box. The Fill fit stretches the image to the exact size. Lanczos3 gives the sharpest result for a photo. Nearest keeps hard pixel edges for pixel art. The tool does not enlarge a small image by default, so the result does not get blurry.
          </p>
          <p>
            Choose a file. Set the size and the output format, then select Process. WebP gives a small file for the web. PNG keeps every pixel.
          </p>
          <p>
            The resize runs in your browser for a WebP, JPEG, or PNG output, so no image data leaves your device. An AVIF output, or a file that your browser cannot decode, runs on the server with Bun. The server holds the file in memory and does not store it.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Image Studio', to: '/hub/image/studio' },
            { label: 'Image Converter', to: '/hub/image/converter' },
            { label: 'Favicon Set Generator', to: '/hub/image/favicon-generator' },
          ]"
        />
      </ToolDocs>
    </template>
  </ImageStudioTool>
</template>

<template>
  <ImageStudioTool tool-id="image-studio">
    <template #docs>
      <ToolDocs title="About the image studio">
        <div class="space-y-4 text-muted">
          <p>
            This tool crops, resizes, rotates, mirrors, and converts an image in one operation. Each setting
            runs in the same pass, so the image is encoded one time. Two separate tools encode twice,
            and the second encode loses quality for no gain.
          </p>
          <p>
            The order is crop, rotate, mirror, resize, grayscale, and encode. Rotation comes before
            the resize, so the width and the height apply to the final image. A WebP, JPEG, or PNG
            output runs in your browser. An AVIF output, or a file that your browser cannot decode,
            runs on the server with Bun, and then only the cropped pixels leave your device.
          </p>
          <p>
            Choose a file. Set the size, the transform, and the output format. Then select Process.
            WebP and AVIF give the smallest file for the web. PNG has no quality setting, because it
            has no loss.
          </p>
          <p>
            Drop up to 50 files to run one set of settings over each file. The tool then shows the
            size of each result and gives one zip file.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'EXIF & Metadata Inspector', to: '/hub/image/metadata' },
            { label: 'SVG to PNG / WebP', to: '/hub/image/svg-converter' },
            { label: 'Favicon Set Generator', to: '/hub/image/favicon-generator' },
          ]"
        />
      </ToolDocs>
    </template>
  </ImageStudioTool>
</template>

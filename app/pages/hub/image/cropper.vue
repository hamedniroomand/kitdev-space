<template>
  <ImageStudioTool
    tool-id="image-cropper"
    crop
  >
    <template #docs>
      <ToolDocs title="About image cropping">
        <div class="space-y-4 text-muted">
          <p>
            A crop removes the part of an image that you do not need. Drag the box to choose the part
            that stays. Drag a corner to change the size. The box keeps the ratio that you choose, so
            the result fits the place where you will use it.
          </p>
          <p>
            Choose a ratio. Free lets you set any shape. Match the output size locks the box to the
            output width and height, so a crop for an OpenGraph image is 1200 by 630 with no stretch.
            Square makes a 1:1 crop for an avatar or an Instagram post.
          </p>
          <p>
            Use the arrow keys to move the box by one pixel. Hold Shift to move by ten pixels. The
            size under the image shows the crop in pixels of the original image.
          </p>
          <p>
            The crop runs in your browser. Only the cropped pixels go to the server, where Bun resizes
            and encodes them in one pass. The file is processed in memory and is not stored.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Image Studio', to: '/hub/image/studio' },
            { label: 'Image Resizer', to: '/hub/image/resizer' },
            { label: 'Image Converter', to: '/hub/image/converter' }
          ]"
        />
      </ToolDocs>
    </template>
  </ImageStudioTool>
</template>

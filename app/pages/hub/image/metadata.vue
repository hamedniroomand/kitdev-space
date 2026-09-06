<template>
  <ImageMetadataTool tool-id="image-metadata">
    <template #docs>
      <ToolDocs title="About image metadata">
        <div class="space-y-4 text-muted">
          <p>
            A camera writes EXIF data into a photo. That data can hold the GPS position, the camera model,
            the serial number, and the date. A photo that you share can give your home address.
          </p>
          <p>
            This tool reads the metadata blocks of a JPEG, a PNG, a WebP, or an AVIF file. It shows each
            tag, and it marks the tags that can identify you. Download the report to keep a record of
            what the file held.
          </p>
          <p>
            Two options remove the metadata. Remove in the browser edits the file on your device and keeps
            the pixel data byte for byte, so the quality does not change. Remove on the server sends the
            file to Bun, which re-encodes the image and writes no metadata. Use the server option for a
            format that the browser cannot edit in place. The file is processed in memory and is not stored.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'EXIF Remover', to: '/hub/image/exif-remover' },
            { label: 'Image Studio', to: '/hub/image/studio' },
            { label: 'Image Converter', to: '/hub/image/converter' },
          ]"
        />
      </ToolDocs>
    </template>
  </ImageMetadataTool>
</template>

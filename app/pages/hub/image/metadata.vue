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
            This tool reads the metadata of a JPEG, a PNG, a WebP, an AVIF, or a TIFF file. It reads the
            EXIF, the IPTC, the XMP, and the text segments. It shows each tag, and it marks the tags that
            can identify you. Download the report to keep a record of what the file held. A file that a
            tool already stripped shows "No supported metadata found".
          </p>
          <p>
            Drop up to 50 photos to clean a batch. The tool strips every file in your browser and gives
            one zip archive with the clean images and an audit report. The report names the segments that
            the tool removed from each file and the color profile that each clean file still holds.
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

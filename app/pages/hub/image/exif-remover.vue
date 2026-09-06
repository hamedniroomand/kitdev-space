<template>
  <ImageMetadataTool tool-id="exif-remover">
    <template #docs>
      <ToolDocs title="About EXIF removal">
        <div class="space-y-4 text-muted">
          <p>
            A phone or a camera writes EXIF data into every photo. The data can hold the GPS position,
            the date and the time, the camera model, and the serial number. A photo that you post can
            give your home address and your daily route. This tool removes that data before you share
            the file.
          </p>
          <p>
            Choose a photo. The tool lists the tags and marks the ones that can identify you. Then choose
            one of two options. Remove in the browser cuts the EXIF, the XMP, the IPTC, and the text
            blocks out of a JPEG, a PNG, or a WebP file on your device. The pixels stay byte for byte, so
            the quality does not change and the file never leaves your browser.
          </p>
          <p>
            Remove on the server covers every format, such as AVIF, HEIC, TIFF, and GIF. The file goes
            to Bun, which re-encodes the image and writes no metadata. The file is processed in memory
            and is not stored. A JPEG loses a little quality in a re-encode. A PNG and a WebP do not.
            After the server answers, your browser reads the result again and reports how many tags
            remain, so you do not have to trust the server.
          </p>
          <p>
            Download the clean image and share that copy. Download the report if you want a record of
            the data that the original file held.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'EXIF & Metadata Inspector', to: '/hub/image/metadata' },
            { label: 'Image Converter', to: '/hub/image/converter' },
            { label: 'Image Resizer', to: '/hub/image/resizer' }
          ]"
        />
      </ToolDocs>
    </template>
  </ImageMetadataTool>
</template>

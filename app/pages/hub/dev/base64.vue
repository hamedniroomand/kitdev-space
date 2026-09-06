<template>
  <EncoderTool
    tool-id="base64"
    format="base64"
  >
    <template #docs>
      <ToolDocs title="About Base64">
        <div class="space-y-4 text-muted">
          <p>
            Base64 writes binary data with 64 safe characters: A to Z, a to z, 0 to 9, plus, and slash. Every 3 bytes become 4 characters, so the output is about 33 percent larger than the input. The equals sign pads the end to a multiple of 4 characters.
          </p>
          <p>
            Use standard Base64 for a data URL, an email attachment, or a basic authentication header. Use Base64 URL for a JWT, a query value, or a file name. Base64 URL replaces plus with minus and slash with underscore, and it drops the padding. Change the format in the Format list to switch between the two.
          </p>
          <p>
            Paste text, then select Encode or Decode. Select Swap to send the result back to the input. The tool reads and writes UTF-8, so an emoji or an accented letter encodes correctly. Every operation runs in your browser.
          </p>
          <p>
            Base64 is not encryption. Anyone can decode the value. Use it to move bytes through a text channel, not to hide data.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Encoder & Escaper', to: '/hub/dev/encoder' },
            { label: 'URL Encoder & Decoder', to: '/hub/dev/url-encoder' },
            { label: 'JWT Decoder', to: '/hub/crypto/jwt' }
          ]"
        />
      </ToolDocs>
    </template>
  </EncoderTool>
</template>

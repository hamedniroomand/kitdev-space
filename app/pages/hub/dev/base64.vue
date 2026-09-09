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
            Paste text, then select Encode or Decode. Select Swap to send the result back to the input. The tool reads and writes UTF-8, so an emoji or an accented letter encodes correctly. If the input has a character that Base64 does not hold, the tool names the character and its exact offset. Every operation runs in your browser.
          </p>
          <p>
            The tool also reads a file. Drop a file, or click the drop area to choose one. The tool writes a data URL in the form <code>data:image/png;base64,...</code>, and it takes the MIME type from the file. Use a data URL to put a small image in CSS or in HTML without a second request. The limit is 2 MB, because a data URL is about 33 percent larger than the file.
          </p>
          <p>
            To go back to a file, paste the data URL, select Decode, then select Download file. The tool keeps the bytes binary, and it reads the MIME type to name the file. It does not decode a file as text.
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
            { label: 'JWT Decoder', to: '/hub/crypto/jwt' },
          ]"
        />
      </ToolDocs>
    </template>
  </EncoderTool>
</template>

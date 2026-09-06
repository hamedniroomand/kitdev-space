<template>
  <EncoderTool tool-id="encoder">
    <template #docs>
      <ToolDocs title="About encoding and escaping">
        <div class="space-y-4 text-muted">
          <p>
            Encoding makes text safe for another place. A URL, an HTML page, a JSON document, and a
            shell command each have characters with a special meaning. This tool covers all of them
            in one place.
          </p>
          <p>
            Base64 turns bytes into 64 safe characters. Use Base64 URL for a token or a query value,
            because it removes the characters that a URL cannot hold. Hex writes two digits for each
            byte. The escape formats add a backslash or an entity, and they keep the text readable.
          </p>
          <p>
            Choose a format, then Encode or Decode. Select Swap to send the result back to the input,
            which lets you chain two steps. Every operation runs in your browser.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'JWT Decoder', to: '/hub/crypto/jwt' },
            { label: 'Hash Generator', to: '/hub/crypto/hash-generator' },
            { label: 'URL Inspector', to: '/hub/network/url-inspector' }
          ]"
        />
      </ToolDocs>
    </template>
  </EncoderTool>
</template>

<template>
  <EncoderTool
    tool-id="url-encoder"
    format="url"
  >
    <template #docs>
      <ToolDocs title="About URL encoding">
        <div class="space-y-4 text-muted">
          <p>
            A URL can hold only a small set of characters. A space, an ampersand, a question mark, and a letter with an accent each have a special meaning or are not allowed. Percent encoding writes each byte of such a character as a percent sign and two hex digits. A space becomes %20.
          </p>
          <p>
            Use this tool to encode a value before you put it in a query string. Use it to decode a URL that you copy from a log or from a browser. The tool follows the rules of encodeURIComponent, so it also encodes the characters that separate a query, such as & and =.
          </p>
          <p>
            Paste text, then select Encode or Decode. Select Swap to send the result back to the input. Every operation runs in your browser.
          </p>
          <p>
            To see the parts of a full URL, such as the host, the path, and each query parameter, use the URL Inspector.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Encoder & Escaper', to: '/hub/dev/encoder' },
            { label: 'URL Inspector', to: '/hub/network/url-inspector' },
            { label: 'Base64 Encoder & Decoder', to: '/hub/dev/base64' },
          ]"
        />
      </ToolDocs>
    </template>
  </EncoderTool>
</template>

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
            The URL scope toggle selects the rule. Component follows encodeURIComponent. Full URL follows encodeURI. The two rules keep a different set of characters.
          </p>
          <p>
            Component encodes the characters that give a URL its structure: the question mark, the ampersand, the slash, and the number sign. Use Component for one value, such as a query parameter or a path segment. The value cannot break out of its place.
          </p>
          <p>
            Full URL keeps the question mark, the ampersand, the slash, and the number sign as they are. It encodes only the characters that a URL cannot hold, such as a space or a letter with an accent. Use Full URL for a complete address that must stay usable. Component is the default, so the tool does not change the encoded characters until you select Full URL.
          </p>
          <p>
            Paste text, then select Encode or Decode. Select Swap to send the result back to the input. If a percent escape is not valid, the tool names the character and its exact offset in the input. Every operation runs in your browser.
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

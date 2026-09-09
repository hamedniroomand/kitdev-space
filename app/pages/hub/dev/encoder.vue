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
            The URL format has a scope toggle. Component follows encodeURIComponent, and it encodes
            the question mark, the ampersand, the slash, and the number sign. Full URL follows
            encodeURI, and it keeps those four characters as they are. Component is the default.
          </p>
          <p>
            The Base64 format also reads a file. Drop a file on the tool to get a data URL with the
            MIME type of the file. Paste a data URL, select Decode, then select Download file to save
            the bytes again. The tool does not read a file as text.
          </p>
          <p>
            Choose a format, then Encode or Decode. Select Swap to send the result back to the input,
            which lets you chain two steps. If the input has a character that the format does not
            hold, the tool names the character and its exact offset. Every operation runs in your
            browser.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'JWT Decoder', to: '/hub/crypto/jwt' },
            { label: 'Hash Generator', to: '/hub/crypto/hash-generator' },
            { label: 'URL Inspector', to: '/hub/network/url-inspector' },
          ]"
        />
      </ToolDocs>
    </template>
  </EncoderTool>
</template>

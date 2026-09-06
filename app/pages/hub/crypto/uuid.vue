<template>
  <IdGeneratorTool
    tool-id="uuid"
    kind="id"
    id-type="uuidv4"
  >
    <template #docs>
      <ToolDocs title="About UUIDs">
        <div class="space-y-4 text-muted">
          <p>
            A UUID is a 128-bit value that names a record. The chance that two values are equal is so small that a system can treat every value as unique. A UUID has 36 characters: 32 hex digits and 4 hyphens.
          </p>
          <p>
            UUID v4 is fully random. It holds 122 random bits, so it is safe for a public ID and for a secret token. UUID v7 starts with a millisecond timestamp. A database sorts v7 values in the order of creation, so an index on a v7 column stays small and fast. Use v7 for a primary key. Use v4 when the creation time must stay private.
          </p>
          <p>
            Set the format and the count, then select Generate. Select the copy button next to a value to copy one value, or select Copy all. Every value comes from crypto.getRandomValues in your browser. Nothing is sent to a server.
          </p>
          <p>
            The same generator makes ULID and NanoID values. A ULID is a time-ordered ID with 26 characters. A NanoID is shorter than a UUID and is safe in a URL.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'ID & Secret Generator', to: '/hub/crypto/generator' },
            { label: 'Passphrase Generator', to: '/hub/crypto/passphrase' },
            { label: 'Hash Generator', to: '/hub/crypto/hash-generator' }
          ]"
        />
      </ToolDocs>
    </template>
  </IdGeneratorTool>
</template>

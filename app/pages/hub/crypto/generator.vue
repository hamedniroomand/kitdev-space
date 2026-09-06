<template>
  <IdGeneratorTool tool-id="generator">
    <template #docs>
      <ToolDocs title="About random values">
        <div class="space-y-4 text-muted">
          <p>
            This tool makes three kinds of random value. An ID names a record. A random string makes
            a token or an API key. A passphrase makes a password that a person can remember.
          </p>
          <p>
            UUID v4 is fully random. UUID v7 and ULID start with a timestamp, so a database sorts
            them in the order of creation, which keeps an index small. NanoID is shorter than a UUID
            and is safe in a URL.
          </p>
          <p>
            The strength value counts the random bits. Aim for 128 bits or more for a secret. A
            six-word passphrase gives about 77 bits, which is strong for a login but weak for a key.
            Every value comes from crypto.getRandomValues, which is a cryptographic generator.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Password Benchmark', to: '/hub/crypto/password-benchmark' },
            { label: 'Hash Generator', to: '/hub/crypto/hash-generator' },
            { label: 'Encoder & Escaper', to: '/hub/dev/encoder' }
          ]"
        />
      </ToolDocs>
    </template>
  </IdGeneratorTool>
</template>

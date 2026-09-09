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
            Select UUID v7 or ULID for a database key. Both formats start with a millisecond
            timestamp, so the database writes each new row at the end of the index. The index stays
            small. Select ULID when the key must be short, because a ULID has 26 characters and it
            sorts as text.
          </p>
          <p>
            Select UUID v4 or NanoID for a distributed ID. Each value is fully random, so two hosts
            cannot make the same value without a shared counter. The creation time also stays
            private. NanoID is shorter than a UUID and it is safe in a URL.
          </p>
          <p>
            Select a passphrase for a secret that a person types or says. Words of the same strength
            are easier to type than random characters. Select a random string for a secret that only
            a machine reads, such as an API key.
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
            { label: 'Encoder & Escaper', to: '/hub/dev/encoder' },
          ]"
        />
      </ToolDocs>
    </template>
  </IdGeneratorTool>
</template>

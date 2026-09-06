<template>
  <IdGeneratorTool
    tool-id="passphrase"
    kind="passphrase"
  >
    <template #docs>
      <ToolDocs title="About passphrases">
        <div class="space-y-4 text-muted">
          <p>
            A passphrase is a password made of words. Six random words from a diceware list give about 77 bits of strength. A person can remember six words. A person cannot remember a random string with the same strength.
          </p>
          <p>
            The tool picks each word with crypto.getRandomValues from a list of 7776 words. Each word adds about 12.9 bits. Use six words for a login. Use eight words or more for a disk encryption key or for the master password of a password manager.
          </p>
          <p>
            Set the word count, the separator, and the capitals. A capital letter and a separator add little strength. The word count adds strength. Do not change a word after generation, because a change that a person makes is not random.
          </p>
          <p>
            Every passphrase is made in your browser. Nothing is sent to a server. Use the Password Benchmark tool to see how long an attack on the result takes.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'ID & Secret Generator', to: '/hub/crypto/generator' },
            { label: 'Password Benchmark', to: '/hub/crypto/password-benchmark' },
            { label: 'Hash Generator', to: '/hub/crypto/hash-generator' },
          ]"
        />
      </ToolDocs>
    </template>
  </IdGeneratorTool>
</template>

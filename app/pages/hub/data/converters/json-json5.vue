<template>
  <DataConverterPage
    tool-id="json-json5"
    title="JSON ↔ JSON5"
    description="Convert between JSON and JSON5."
    :formats="[
      { label: 'JSON', value: 'json' },
      { label: 'JSON5', value: 'json5' }
    ]"
    default-from="json"
    default-to="json5"
    sample="{&quot;name&quot;:&quot;KitDev&quot;,&quot;ready&quot;:true}"
    download-name="converted.json5"
    download-mime="application/json5"
    docs-title="About JSON and JSON5"
    :docs="[
      'JSON5 allows comments and trailing commas in many cases.',
      'Use this tool to convert between strict JSON and JSON5 text.'
    ]"
    :related="[
      { label: 'JSON Formatter', to: '/hub/data/json-formatter' },
      { label: 'JSON Validator', to: '/hub/data/json-validator' }
    ]"
  />
</template>

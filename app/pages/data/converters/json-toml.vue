<template>
  <DataConverterPage
    tool-id="json-toml"
    title="JSON ↔ TOML"
    description="Convert between JSON and TOML."
    :formats="[
      { label: 'JSON', value: 'json' },
      { label: 'TOML', value: 'toml' }
    ]"
    default-from="json"
    default-to="toml"
    sample="{&quot;name&quot;:&quot;DevKit&quot;,&quot;ready&quot;:true}"
    download-name="converted.toml"
    download-mime="application/toml"
    docs-title="About JSON and TOML"
    :docs="[
      'TOML is a clear format for configuration files.',
      'Use this tool to convert data between JSON and TOML.'
    ]"
    :related="[
      { label: 'JSON ↔ YAML', to: '/data/converters/json-yaml' },
      { label: 'JSON Formatter', to: '/data/json-formatter' }
    ]"
  />
</template>

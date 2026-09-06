<template>
  <ConverterPage
    tool-id="json-toml"
    :formats="[
      { label: 'JSON', value: 'json' },
      { label: 'TOML', value: 'toml' },
    ]"
    default-from="json"
    default-to="toml"
    sample="{&quot;name&quot;:&quot;KitDev&quot;,&quot;ready&quot;:true}"
    download-name="converted.toml"
    download-mime="application/toml"
    docs-title="About JSON and TOML"
    :docs="[
      'TOML is a clear format for configuration files.',
      'Use this tool to convert data between JSON and TOML.',
    ]"
    :related="[
      { label: 'JSON ↔ YAML', to: '/hub/data/converters/json-yaml' },
      { label: 'JSON Formatter', to: '/hub/data/json-formatter' },
    ]"
  />
</template>

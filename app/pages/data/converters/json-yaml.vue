<template>
  <DataConverterPage
    title="JSON ↔ YAML"
    description="Convert between JSON and YAML."
    :formats="[
      { label: 'JSON', value: 'json' },
      { label: 'YAML', value: 'yaml' }
    ]"
    default-from="json"
    default-to="yaml"
    sample="{&quot;name&quot;:&quot;DevKit&quot;,&quot;ready&quot;:true}"
    download-name="converted.yaml"
    download-mime="text/yaml"
    docs-title="About JSON and YAML"
    :docs="[
      'YAML is a readable format that maps well to JSON data.',
      'Use this tool to convert config files between JSON and YAML.'
    ]"
    :related="[
      { label: 'JSON ↔ TOML', to: '/data/converters/json-toml' },
      { label: 'JSON Formatter', to: '/data/json-formatter' }
    ]"
  />
</template>

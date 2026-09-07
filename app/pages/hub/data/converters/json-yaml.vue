<template>
  <ConverterPage
    tool-id="json-yaml"
    :formats="[
      { label: 'JSON', value: 'json' },
      { label: 'YAML', value: 'yaml' },
    ]"
    default-from="json"
    default-to="yaml"
    sample="{&quot;name&quot;:&quot;KitDev&quot;,&quot;ready&quot;:true}"
    download-name="converted.yaml"
    download-mime="text/yaml"
    docs-title="About JSON and YAML"
    :docs="[
      'YAML is a readable format that maps well to JSON data. It uses indentation instead of braces, and it supports comments.',
      'Use this tool to convert config files between JSON and YAML. The data stays in your browser.',
      'YAML comments and anchors do not exist in JSON. When you convert from YAML to JSON, the tool removes comments and resolves anchors. When you convert from JSON to YAML, the tool writes block style.',
    ]"
    :related="[
      { label: 'JSON ↔ TOML', to: '/hub/data/converters/json-toml' },
      { label: 'JSON Formatter', to: '/hub/data/json-formatter' },
    ]"
  />
</template>

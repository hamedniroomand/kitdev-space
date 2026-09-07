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
      'TOML is a clear format for configuration files. It has typed values: strings, integers, floats, booleans, dates, and arrays.',
      'Use this tool to convert data between JSON and TOML. The data stays in your browser.',
      'TOML does not have a null value. A null in JSON becomes an empty string in TOML. Nested arrays of mixed types are not valid in TOML, so the tool rejects them with an error.',
    ]"
    :related="[
      { label: 'JSON ↔ YAML', to: '/hub/data/converters/json-yaml' },
      { label: 'JSON Formatter', to: '/hub/data/json-formatter' },
    ]"
  />
</template>

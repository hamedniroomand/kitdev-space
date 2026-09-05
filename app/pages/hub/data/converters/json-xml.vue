<template>
  <DataConverterPage
    tool-id="json-xml"
    title="JSON ↔ XML"
    description="Convert between JSON and XML."
    :formats="[
      { label: 'JSON', value: 'json' },
      { label: 'XML', value: 'xml' }
    ]"
    default-from="json"
    default-to="xml"
    sample="{&quot;name&quot;:&quot;KitDev&quot;,&quot;ready&quot;:true}"
    download-name="converted.xml"
    download-mime="application/xml"
    docs-title="About JSON and XML"
    :docs="[
      'XML uses tags to describe structured data.',
      'If the JSON value is not an object, or the object has more than one top-level key, the tool wraps it under a root element.',
      'Keys that are not valid XML names are written as item elements with a key attribute, for example item key=\'@nuxt/ui\'.'
    ]"
    :related="[
      { label: 'JSON ↔ YAML', to: '/hub/data/converters/json-yaml' },
      { label: 'JSON Formatter', to: '/hub/data/json-formatter' }
    ]"
  />
</template>

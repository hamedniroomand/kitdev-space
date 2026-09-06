<template>
  <ConverterPage
    tool-id="json-xml"
    :formats="[
      { label: 'JSON', value: 'json' },
      { label: 'XML', value: 'xml' },
    ]"
    default-from="json"
    default-to="xml"
    sample="{&quot;name&quot;:&quot;KitDev&quot;,&quot;ready&quot;:true}"
    download-name="converted.xml"
    download-mime="application/xml"
    docs-title="About JSON and XML"
    :docs="[
      'XML uses tags to describe structured data. It has no types, so every value comes back as text: true becomes the string true.',
      'An attribute becomes a key with an @ prefix, such as @lang. Text next to attributes or child elements becomes #text. Repeated elements become an array.',
      'If the JSON value is not an object, or the object has more than one top-level key, the tool wraps it under a root element.',
      'Keys that are not valid XML names are written as item elements with a key attribute, for example item key=@nuxt/ui.',
    ]"
    :related="[
      { label: 'JSON ↔ YAML', to: '/hub/data/converters/json-yaml' },
      { label: 'JSON Formatter', to: '/hub/data/json-formatter' },
    ]"
  />
</template>

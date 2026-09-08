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
    :docs="[]"
    :related="[
      { label: 'JSON ↔ YAML', to: '/hub/data/converters/json-yaml' },
      { label: 'JSON Formatter', to: '/hub/data/json-formatter' },
    ]"
  >
    <template #docs>
      <div class="space-y-6 text-muted">
        <p>
          This tool converts data between JSON objects and XML elements. All conversions run locally in your browser.
        </p>

        <div class="space-y-2">
          <h3 class="text-sm font-semibold text-foreground">
            Attribute Prefixes
          </h3>
          <p>
            An XML attribute maps to a JSON key with an <code>@</code> prefix. The tool writes an <code>@</code> key as an XML attribute on its parent element.
          </p>
          <pre class="rounded-md bg-muted/20 p-3 text-xs font-mono text-foreground"><code>// JSON:
{ "user": { "@id": "42", "name": "Alice" } }

&lt;!-- XML: --&gt;
&lt;user id="42"&gt;
  &lt;name&gt;Alice&lt;/name&gt;
&lt;/user&gt;</code></pre>
        </div>

        <div class="space-y-2">
          <h3 class="text-sm font-semibold text-foreground">
            Text Node Mapping
          </h3>
          <p>
            Text content next to attributes or child elements maps to the <code>#text</code> key. Pure text elements map directly to string values without the key.
          </p>
          <pre class="rounded-md bg-muted/20 p-3 text-xs font-mono text-foreground"><code>// JSON:
{ "link": { "@href": "https://kitdev.space", "#text": "KitDev Hub" } }

&lt;!-- XML: --&gt;
&lt;link href="https://kitdev.space"&gt;KitDev Hub&lt;/link&gt;</code></pre>
        </div>

        <div class="space-y-2">
          <h3 class="text-sm font-semibold text-foreground">
            Array Serialization
          </h3>
          <p>
            A JSON array maps to repeated XML elements with the same tag name. Repeated child elements in XML parse into a JSON array.
          </p>
          <pre class="rounded-md bg-muted/20 p-3 text-xs font-mono text-foreground"><code>// JSON:
{ "tags": { "tag": ["tools", "developer", "privacy"] } }

&lt;!-- XML: --&gt;
&lt;tags&gt;
  &lt;tag&gt;tools&lt;/tag&gt;
  &lt;tag&gt;developer&lt;/tag&gt;
  &lt;tag&gt;privacy&lt;/tag&gt;
&lt;/tags&gt;</code></pre>
        </div>

        <p>
          XML values are text. Booleans and numbers in XML become strings in JSON. Top-level values without an object key get wrapped in a <code>&lt;root&gt;</code> element.
        </p>
      </div>
    </template>
  </ConverterPage>
</template>

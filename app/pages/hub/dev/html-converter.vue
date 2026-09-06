<template>
  <HtmlConverterTool tool-id="html-converter">
    <template #docs>
      <ToolDocs title="About HTML and SVG conversion">
        <div class="space-y-4 text-muted">
          <p>
            This tool converts HTML or SVG markup into a React JSX component or a Vue template. It renames the attributes that JSX needs, such as class to className and stroke-width to strokeWidth, turns an inline style into an object, and closes the void tags.
          </p>
          <p>
            For an SVG icon, turn on Wrap in component function and Spread props. The result takes props and spreads them on the root tag, so a caller can pass a class name, a size, or a click handler.
          </p>
          <p>
            Paste markup from a design export, an icon set, or an old template. Check the result: an inline event handler such as onclick needs a real function in your code.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Encoder & Escaper', to: '/hub/dev/encoder' },
            { label: 'Case Converter', to: '/hub/dev/case-converter' },
            { label: 'Code Transpiler', to: '/hub/dev/transpiler' }
          ]"
        />
      </ToolDocs>
    </template>
  </HtmlConverterTool>
</template>

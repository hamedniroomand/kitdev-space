<template>
  <HtmlConverterTool tool-id="html-converter">
    <template #docs>
      <ToolDocs title="About HTML and SVG conversion">
        <div class="space-y-4 text-muted">
          <p>
            This tool converts HTML or SVG markup into a React JSX component or a Vue template. It reads the markup with the HTML parser of your browser, so a greater-than sign in an attribute, an unclosed tag, or several root elements cannot break the result. It renames the attributes that JSX needs, such as class to className and stroke-width to strokeWidth, turns an inline style into an object, and closes the void tags.
          </p>
          <p>
            For an SVG icon, turn on Wrap in component function and Spread props. The result takes props and spreads them on the root tag, so a caller can pass a class name, a size, or a click handler. Turn on Title prop to get the SVG title from a prop. The tool also gives a duplicate SVG id a new unique name and updates each reference to it, so two icons in one input keep their gradients and their clip paths.
          </p>
          <p>
            Paste markup from a design export, an icon set, or an old template. The tool names each construct that the target cannot hold under the output. It removes a script block and, for JSX, an inline event handler such as onclick, because JSX needs a function. A Vue template keeps onclick as @click.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Encoder & Escaper', to: '/hub/dev/encoder' },
            { label: 'Case Converter', to: '/hub/dev/case-converter' },
            { label: 'Code Transpiler', to: '/hub/dev/transpiler' },
          ]"
        />
      </ToolDocs>
    </template>
  </HtmlConverterTool>
</template>

<template>
  <HtmlConverterTool
    tool-id="html-to-jsx"
    sample="card"
  >
    <template #docs>
      <ToolDocs title="About HTML to JSX">
        <div class="space-y-4 text-muted">
          <p>
            JSX looks like HTML, but it is JavaScript. Some attributes have a different name, and every tag must close. This tool makes those changes. It renames class to className, for to htmlFor, and tabindex to tabIndex. It turns an inline style into an object with camelCase keys. It adds a closing slash to a void tag such as img or br. It turns an HTML comment into a JSX comment. It escapes a curly brace in text, because a brace opens an expression in JSX.
          </p>
          <p>
            The tool reads the markup with the HTML parser of your browser. A greater-than sign in an attribute value, an unclosed tag, or a doctype cannot break the result. Several root elements go into one fragment.
          </p>
          <p>
            Turn on Wrap in component function to get a complete function component with the name that you enter. Turn it off to get only the markup, so you can paste it into an existing component.
          </p>
          <p>
            Paste markup from a design export, a CMS, or an old template. The tool names each construct that JSX cannot hold under the output. It removes a script block and an inline event handler such as onclick, because JSX needs a function. Write that function in your code and pass it as onClick.
          </p>
          <p>
            Every conversion runs in your browser. To convert an SVG icon, use the SVG to React Component tool, which turns on the props spread for you.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'HTML & SVG to JSX / Vue', to: '/hub/dev/html-converter' },
            { label: 'SVG to React Component', to: '/hub/dev/svg-component' },
            { label: 'Code Transpiler', to: '/hub/dev/transpiler' },
          ]"
        />
      </ToolDocs>
    </template>
  </HtmlConverterTool>
</template>

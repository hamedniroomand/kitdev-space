<template>
  <HtmlConverterTool
    tool-id="html-to-jsx"
    sample="card"
  >
    <template #docs>
      <ToolDocs title="About HTML to JSX">
        <div class="space-y-4 text-muted">
          <p>
            JSX looks like HTML, but it is JavaScript. Some attributes have a different name, and every tag must close. This tool makes those changes. It renames class to className, for to htmlFor, and tabindex to tabIndex. It turns an inline style into an object with camelCase keys. It adds a closing slash to a void tag such as img or br. It turns an HTML comment into a JSX comment.
          </p>
          <p>
            Turn on Wrap in component function to get a complete function component with the name that you enter. Turn it off to get only the markup, so you can paste it into an existing component.
          </p>
          <p>
            Paste markup from a design export, a CMS, or an old template. Check the result. An inline event handler such as onclick needs a real function in your code.
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
            { label: 'Code Transpiler', to: '/hub/dev/transpiler' }
          ]"
        />
      </ToolDocs>
    </template>
  </HtmlConverterTool>
</template>

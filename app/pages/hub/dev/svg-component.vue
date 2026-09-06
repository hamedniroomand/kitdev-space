<template>
  <HtmlConverterTool
    tool-id="svg-component"
    sample="svg"
  >
    <template #docs>
      <ToolDocs title="About SVG to React">
        <div class="space-y-4 text-muted">
          <p>
            An SVG icon in a React project works best as a component. A component takes props, so a caller can set the size, the color, and a click handler. This tool converts SVG markup into such a component.
          </p>
          <p>
            The tool renames each attribute for JSX. stroke-width becomes strokeWidth, fill-rule becomes fillRule, and viewbox keeps the name viewBox. It turns an inline style into an object. With Spread props on, the component takes props and spreads them on the root svg tag.
          </p>
          <p>
            Paste an SVG from an icon set or from a design export, then set the component name. Copy the result into a .jsx or .tsx file. Set fill or stroke to currentColor in the SVG, so the icon takes the text color of its parent.
          </p>
          <p>
            Every conversion runs in your browser. To get a Vue template or a Vue SFC, change the target in the HTML & SVG to JSX / Vue tool.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'HTML & SVG to JSX / Vue', to: '/hub/dev/html-converter' },
            { label: 'HTML to JSX Converter', to: '/hub/dev/html-to-jsx' },
            { label: 'SVG to PNG / WebP', to: '/hub/image/svg-converter' },
          ]"
        />
      </ToolDocs>
    </template>
  </HtmlConverterTool>
</template>

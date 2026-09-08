export const namespaceXml = `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <title>KitDev Updates</title>
  <entry>
    <title>Version 2.0</title>
    <dc:creator>Hamed</dc:creator>
    <dc:date>2026-09-08</dc:date>
  </entry>
</feed>`

export const repeatedChildrenXml = `<store name="Bookstore">
  <book category="fiction">
    <title>Great Novel</title>
    <author>Author One</author>
    <author>Author Two</author>
  </book>
  <book category="tech">
    <title>TypeScript Guide</title>
    <author>Tech Writer</author>
  </book>
</store>`

export const mixedContentXml = `<article>
  <title>Getting Started</title>
  <content>
    Welcome to <b>KitDev</b>, the <i>fast</i> and <u>private</u> tool suite.
  </content>
  <footer>
    Copyright 2026 <strong>KitDev</strong> Inc.
  </footer>
</article>`

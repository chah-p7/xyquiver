# XyQuiver

A visual editor for categorical diagrams, higher cells, and Typora-ready
Xy-pic output.

**[Open the public editor](https://chah-p7.github.io/xyquiver/)**

## Features

- Draw and edit objects, arrows, curved arrows, labels, and native 2-cells.
- Anchor higher cells to vertices or arrows, including quasi-category-style
  composition diagrams.
- Export editable Xy-pic code or standalone vector SVG.
- Save and reopen diagram documents locally in the browser.
- Start from examples including the snake lemma, homotopies, and parallel
  2-cells.

## Development

XyQuiver requires Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Useful checks:

```bash
npm exec tsc -- --noEmit
npm run test:smoke
npm run build:pages
```

Pushes to `main` are deployed automatically to GitHub Pages.

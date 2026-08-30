import {
  exampleDocuments,
  generateSvg,
  generateXyPic,
  validateDocument,
} from '../lib/diagram.ts';

for (const [id, document] of Object.entries(exampleDocuments)) {
  const svg = generateSvg(document);
  const xy = generateXyPic(document, 'typora');
  if (!svg.startsWith('<svg') || /\bNaN\b|undefined|<image\b/.test(svg)) {
    throw new Error(`${id}: invalid SVG output`);
  }
  const references = [...svg.matchAll(/url\(#([^)]+)\)/g)].map(
    (match) => match[1],
  );
  for (const reference of references) {
    if (!svg.includes(`id="${reference}"`)) {
      throw new Error(`${id}: missing SVG definition ${reference}`);
    }
  }
  if (!xy.text.includes('\\begin{xy}') || !xy.text.includes('\\end{xy}')) {
    throw new Error(`${id}: invalid Xy-pic wrapper`);
  }
  if (!validateDocument(JSON.parse(JSON.stringify(document)))) {
    throw new Error(`${id}: JSON round-trip failed`);
  }
  console.log(
    `${id}: ok; svg=${svg.length} xy=${xy.text.length} warnings=${xy.warnings.length}`,
  );
}

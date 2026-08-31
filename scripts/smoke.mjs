import {
  cellCreationConflict,
  constrainArrowCurve,
  deleteSelections,
  exampleDocuments,
  getArrowGeometry,
  getCellGeometry,
  generateSvg,
  generateXyPic,
  isNativeParallelCell,
  matrixCellEdges,
  normalizeMathTex,
  resolveConnectionLevel,
  validateDocument,
} from '../lib/diagram.ts';
import { localizedDocumentTitle } from '../lib/i18n.ts';

if (
  localizedDocumentTitle('Homotopy stabilization', 'zh') !== '同伦稳定化' ||
  localizedDocumentTitle('Homotopy stabilization', 'en') !==
    'Homotopy stabilization'
) {
  throw new Error('i18n: document titles did not follow the UI language');
}

if (
  normalizeMathTex('$$\\mathbf{F}$$') !== '\\mathbf{F}' ||
  normalizeMathTex('\\(\\alpha_1\\)') !== '\\alpha_1' ||
  normalizeMathTex('\\[A \\to B\\]') !== 'A \\to B'
) {
  throw new Error('latex labels: native math delimiters were not normalized');
}

const cellEdges = matrixCellEdges([100, 200, 300], 0, 400);
if (
  JSON.stringify(cellEdges) !== JSON.stringify([50, 150, 250, 350]) ||
  ![100, 200, 300].every(
    (center, index) =>
      cellEdges[index] < center && center < cellEdges[index + 1],
  )
) {
  throw new Error('grid: snap points were not centered inside visible cells');
}

if (
  resolveConnectionLevel('cell', 'node', 'node') !== 'cell' ||
  resolveConnectionLevel('arrow', 'node', 'node') !== 'arrow' ||
  resolveConnectionLevel('auto', 'node', 'arrow') !== 'cell'
) {
  throw new Error(
    'connection level: explicit 1-cell/2-cell choice was ignored',
  );
}

const homotopy = exampleDocuments.homotopy;
const topArrow = getArrowGeometry(homotopy, homotopy.arrows[0]);
const attachedCell = getCellGeometry(homotopy, {
  id: 'alignment-check',
  sourceAnchor: { kind: 'arrow', id: 'a-auto', t: 0.5 },
  targetAnchor: { kind: 'node', id: 'n-bp' },
  label: '\\alpha',
  color: '#5b4bc4',
});
if (
  !topArrow ||
  Math.abs(topArrow.midpoint.x - 500) > 0.001 ||
  !attachedCell ||
  Math.abs(attachedCell.start.x - attachedCell.end.x) > 0.001
) {
  throw new Error('alignment: straight arrow and attached 2-cell were skewed');
}

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

const quasi = exampleDocuments.quasicategory;
const quasiXy = generateXyPic(quasi, 'snippet').text;
if (
  !quasiXy.includes('\\ar@{=>}') ||
  !quasiXy.includes('^{\\alpha}') ||
  !quasiXy.includes('|(0.5)*{}="xyq-a1"') ||
  !quasiXy.includes('\\POS "xyq-n2"')
) {
  throw new Error(
    'quasicategory: vertex-to-edge 2-cell was not attached to a named path position',
  );
}
if (
  quasi.cells[0].sourcePath?.length !== 2 ||
  quasi.cells[0].targetPath?.length !== 1
) {
  throw new Error('quasicategory: composite boundary paths were not preserved');
}
const withoutMiddle = deleteSelections(quasi, [{ kind: 'node', id: 'q-x1' }]);
if (
  withoutMiddle.cells.length !== 0 ||
  withoutMiddle.arrows.some(
    (arrow) => arrow.id === 'q-f' || arrow.id === 'q-g',
  ) ||
  !withoutMiddle.arrows.some((arrow) => arrow.id === 'q-h')
) {
  throw new Error(
    'quasicategory: deleting a composite vertex did not cascade atomically',
  );
}

const legacy = JSON.parse(JSON.stringify(exampleDocuments.twocell));
legacy.version = 1;
const migrated = validateDocument(legacy);
if (
  !migrated ||
  migrated.version !== 2 ||
  migrated.cells[0].sourceAnchor?.kind !== 'arrow' ||
  migrated.cells[0].sourcePath?.[0] !== 'a-f' ||
  migrated.cells[0].head !== 'arrow'
) {
  throw new Error('validator: legacy native cells were not normalized to v2');
}

const nullAnchor = JSON.parse(JSON.stringify(exampleDocuments.quasicategory));
nullAnchor.cells[0].sourceAnchor = null;
if (validateDocument(nullAnchor) !== null) {
  throw new Error('validator: null anchor was accepted');
}
const dangling = JSON.parse(JSON.stringify(exampleDocuments.quasicategory));
dangling.cells[0].sourceAnchor = { kind: 'node', id: 'missing' };
if (validateDocument(dangling) !== null) {
  throw new Error('validator: dangling anchor was accepted');
}
const reversedPath = JSON.parse(JSON.stringify(exampleDocuments.quasicategory));
reversedPath.cells[0].sourcePath.reverse();
if (validateDocument(reversedPath) !== null) {
  throw new Error('validator: non-composable boundary path was accepted');
}

const nonMidpoint = JSON.parse(JSON.stringify(exampleDocuments.twocell));
nonMidpoint.cells[0].sourceAnchor = { kind: 'arrow', id: 'a-f', t: 0.1 };
nonMidpoint.cells[0].targetAnchor = { kind: 'arrow', id: 'a-g', t: 0.9 };
nonMidpoint.cells[0].sourcePath = ['a-f'];
nonMidpoint.cells[0].targetPath = ['a-g'];
if (isNativeParallelCell(nonMidpoint, nonMidpoint.cells[0])) {
  throw new Error('native predicate: off-center anchors were downgraded');
}

const nativeCurves = JSON.parse(JSON.stringify(exampleDocuments.twocell));
nativeCurves.arrows.find((arrow) => arrow.id === 'a-g').curve = 220;
if (constrainArrowCurve(nativeCurves, 'a-f', 220) !== 192) {
  throw new Error('curve constraint: failed at the positive boundary');
}
if (
  cellCreationConflict(
    exampleDocuments.twocell,
    { kind: 'arrow', id: 'a-g', t: 0.5 },
    { kind: 'arrow', id: 'a-f', t: 0.5 },
  ) !== 'duplicate'
) {
  throw new Error('cell conflict: reversed duplicate pair was not rejected');
}

const fullLatex = generateXyPic(quasi, 'latex').text;
if (!fullLatex.includes('\\documentclass') || fullLatex.includes('\\[\n')) {
  throw new Error('latex export: invalid nested display wrapper');
}

const styled = JSON.parse(JSON.stringify(exampleDocuments.quasicategory));
Object.assign(
  styled.arrows.find((arrow) => arrow.id === 'q-f'),
  { stroke: 'dashed', head: 'twohead', tail: 'hook' },
);
Object.assign(
  styled.arrows.find((arrow) => arrow.id === 'q-h'),
  { stroke: 'double', head: 'none', tail: 'mapsto' },
);
Object.assign(styled.cells[0], { stroke: 'dashed', head: 'arrow' });
const styledSvg = generateSvg(styled);
const styledXy = generateXyPic(styled, 'snippet').text;
if (
  !styledSvg.includes('marker-start="url(#xyq-export-hook)"') ||
  !styledSvg.includes('marker-start="url(#xyq-export-mapsto)"') ||
  !styledSvg.includes('stroke-dasharray="11 7"') ||
  !styledSvg.includes('stroke-dasharray="9 6"') ||
  !styledXy.includes('@{^{(}-->>}') ||
  !styledXy.includes('@{|=}') ||
  !styledXy.includes('\\ar@{-->}')
) {
  throw new Error(
    'cell styles: combined dimension, body, tail, and head were not exported',
  );
}

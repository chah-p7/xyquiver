import {
  alignDocumentToSceneGrid,
  arrowGridAnchors,
  cellCreationConflict,
  constrainArrowCurve,
  deleteSelections,
  exampleDocuments,
  firstNodeTexAtom,
  getArrowGeometry,
  getCellGeometry,
  generateSvg,
  generateXyPic,
  isNativeParallelCell,
  matrixCellEdges,
  nodeLabelWidth,
  nodeMetrics,
  normalizeMathTex,
  resolveConnectionLevel,
  sceneGridEdges,
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

const fixedGridEdges = sceneGridEdges(200);
if (
  JSON.stringify(fixedGridEdges) !== JSON.stringify([20, 60, 100, 140, 180]) ||
  fixedGridEdges.some(
    (edge, index) => index > 0 && edge - fixedGridEdges[index - 1] !== 40,
  )
) {
  throw new Error('grid: editor cells did not keep their fixed 40-unit size');
}

if (
  resolveConnectionLevel('cell', 'node', 'node') !== 'cell' ||
  resolveConnectionLevel('arrow', 'node', 'node') !== 'arrow' ||
  resolveConnectionLevel('auto', 'node', 'arrow') !== 'cell' ||
  resolveConnectionLevel('auto', 'cell', 'cell') !== 'three'
) {
  throw new Error(
    'connection level: explicit 1-cell/2-cell choice was ignored',
  );
}

const homotopy = exampleDocuments.homotopy;
const topArrow = getArrowGeometry(homotopy, homotopy.arrows[0]);
const attachedCell = getCellGeometry(homotopy, {
  id: 'alignment-check',
  sourceAnchor: { kind: 'arrow', id: 'a-auto', t: 0.64 },
  targetAnchor: { kind: 'node', id: 'n-bp' },
  label: '\\alpha',
  color: '#5b4bc4',
});
if (
  !topArrow ||
  Math.abs(topArrow.midpoint.x - 480) > 0.001 ||
  !attachedCell ||
  attachedCell.start.x <= attachedCell.end.x
) {
  throw new Error(
    'homotopy: the attached 2-cell did not slope down-left from the top arrow',
  );
}

const topGridAnchors = arrowGridAnchors(homotopy, homotopy.arrows[0]);
if (
  ![280, 480, 680].every((x) =>
    topGridAnchors.some((anchor) => anchor.x === x && anchor.y === 80),
  )
) {
  throw new Error(
    'arrow anchors: long arrows missed traversed matrix-centre anchors',
  );
}

const curvedHomotopy = JSON.parse(JSON.stringify(homotopy));
curvedHomotopy.cells[0].curve = 80;
const curvedCellGeometry = getCellGeometry(
  curvedHomotopy,
  curvedHomotopy.cells[0],
);
const curvedCellSvg = generateSvg(curvedHomotopy);
const curvedCellXy = generateXyPic(curvedHomotopy, 'snippet');
const curvedRoundTrip = validateDocument(
  JSON.parse(JSON.stringify(curvedHomotopy)),
);
if (
  !curvedCellGeometry ||
  !curvedCellGeometry.path.includes(' Q ') ||
  Math.abs(curvedCellGeometry.midpoint.x - curvedCellGeometry.baseMidpoint.x) <
    10 ||
  !curvedCellSvg.includes(' Q ') ||
  !curvedCellXy.text.includes('\\ar@/^') ||
  curvedRoundTrip?.cells[0].curve !== 80
) {
  throw new Error('2-cell curvature: canvas, SVG, Xy-pic, or JSON regressed');
}

const parallel = exampleDocuments.parallel;
const longTarget = parallel.nodes.find((node) => node.id === 'n-cp');
if (!longTarget) throw new Error('label clearance: fixture target is missing');
const targetMetrics = nodeMetrics(longTarget);
const incomingEndpoints = parallel.arrows
  .filter((arrow) => arrow.target === longTarget.id)
  .map((arrow) => getArrowGeometry(parallel, arrow)?.end)
  .filter(Boolean);
const outgoingEndpoints = parallel.arrows
  .filter((arrow) => arrow.source === longTarget.id)
  .map((arrow) => getArrowGeometry(parallel, arrow)?.start)
  .filter(Boolean);
if (
  firstNodeTexAtom(longTarget.label) !== 'C' ||
  targetMetrics.width !== nodeMetrics(parallel.nodes[0]).width ||
  nodeLabelWidth(longTarget) <= targetMetrics.width ||
  incomingEndpoints.length !== 2 ||
  outgoingEndpoints.length !== 2 ||
  new Set(
    incomingEndpoints.map(
      (point) => `${Math.round(point.x)}:${Math.round(point.y)}`,
    ),
  ).size !== 1 ||
  new Set(
    outgoingEndpoints.map(
      (point) => `${Math.round(point.x)}:${Math.round(point.y)}`,
    ),
  ).size !== 1 ||
  incomingEndpoints[0].x >= longTarget.x ||
  outgoingEndpoints[0].x >= longTarget.x
) {
  throw new Error(
    'label clearance: arrows did not stop at the nearest glyph edge',
  );
}

const rightApproach = JSON.parse(JSON.stringify(parallel));
rightApproach.nodes.find((node) => node.id === 'n-c').x = 920;
const fromRight = getArrowGeometry(
  rightApproach,
  rightApproach.arrows.find((arrow) => arrow.id === 'a-rho2'),
);
const toRight = getArrowGeometry(
  rightApproach,
  rightApproach.arrows.find((arrow) => arrow.id === 'a-rho1'),
);
if (
  !fromRight ||
  !toRight ||
  fromRight.end.x <= longTarget.x + targetMetrics.width / 2 ||
  toRight.start.x <= longTarget.x + targetMetrics.width / 2
) {
  throw new Error(
    'label clearance: right-side arrows ignored the nearest final glyph',
  );
}

const anchoredParallelXy = generateXyPic(parallel, 'snippet').text;
if (
  parallel.arrows.length !== 4 ||
  parallel.arrows.some((arrow) => arrow.id === 'a-rho0') ||
  parallel.arrows.find((arrow) => arrow.id === 'a-rho1')?.source !== 'n-cp' ||
  parallel.arrows.find((arrow) => arrow.id === 'a-rho1p')?.source !== 'n-cp' ||
  parallel.cells.filter((cell) => (cell.level ?? 2) === 2).length !== 2 ||
  parallel.cells.filter((cell) => cell.level === 3).length !== 1 ||
  !isNativeParallelCell(parallel, parallel.cells[0]) ||
  !isNativeParallelCell(parallel, parallel.cells[1]) ||
  !anchoredParallelXy.includes("\\rlap{C'_i=C+d\\rho_2") ||
  !anchoredParallelXy.includes("=C+d\\rho'_2}\\phantom{C}") ||
  anchoredParallelXy.includes('\\hbox{\\rlap') ||
  anchoredParallelXy.includes('\\xtwocell') ||
  (anchoredParallelXy.match(/\\ar@\/[\^_]0\.53pc\/@\{=>\}/g) ?? [])
    .length !== 2 ||
  !anchoredParallelXy.includes('\\ar@{<==}') ||
  !anchoredParallelXy.includes('{\\rho_0}')
) {
  throw new Error(
    'parallel example: native boundaries or first-glyph anchoring regressed',
  );
}

const nativeExample = exampleDocuments.twocell;
if (
  nativeExample.arrows.find((arrow) => arrow.id === 'a-g')?.labelSide !==
  'right'
) {
  throw new Error('native 2-cell: lower boundary label G was not below');
}

const stabilization = exampleDocuments.homotopy;
const stabilizationCell = stabilization.cells.find(
  (cell) => cell.id === 'c-stab',
);
const stabilizationXy = generateXyPic(stabilization, 'snippet').text;
if (
  !stabilizationCell ||
  stabilizationCell.sourceAnchor?.kind !== 'arrow' ||
  stabilizationCell.targetAnchor?.kind !== 'node' ||
  stabilization.arrows.some((arrow) => arrow.stroke === 'double') ||
  !stabilizationXy.includes('\\ar@{=>}')
) {
  throw new Error(
    'homotopy example: stabilization was not exported as a native attached 2-cell',
  );
}

const snake = exampleDocuments.snake;
const connectingMap = snake.arrows.find((arrow) => arrow.id === 's-delta');
const cokerHorizontal = getArrowGeometry(
  snake,
  snake.arrows.find((arrow) => arrow.id === 's-coker-f-g'),
);
const homotopyXy = generateXyPic(homotopy, 'snippet').text;
if (
  snake.nodes.length !== 24 ||
  snake.arrows.length !== 30 ||
  !snake.nodes.some((node) => node.label === '\\ker h') ||
  !snake.nodes.some((node) => node.label === '\\operatorname{coker} f') ||
  connectingMap?.source !== 's-ker-h' ||
  connectingMap.target !== 's-coker-f' ||
  !cokerHorizontal ||
  cokerHorizontal.start.x > 372 ||
  !homotopyXy.includes('@C=0.3pc @R=0.3pc') ||
  !homotopyXy.includes(
    `\\ar[${'r'.repeat(20)}]^{\\overset`,
  ) ||
  !homotopyXy.includes(
    `\\ar@{}[${'r'.repeat(20)}]|(0.64)*{}="xyq-a1"`,
  )
) {
  throw new Error('snake lemma or logical Xy-pic alignment regressed');
}

const movedHomotopy = JSON.parse(JSON.stringify(homotopy));
movedHomotopy.nodes.find((node) => node.id === 'n-xr').x -= 40;
const movedHomotopyXy = generateXyPic(movedHomotopy, 'snippet').text;
if (
  movedHomotopyXy === homotopyXy ||
  !movedHomotopyXy.includes(`\\ar[${'r'.repeat(19)}]^{\\overset`)
) {
  throw new Error(
    'canvas/source mapping: moving one visual grid cell did not change one Xy-pic hop',
  );
}

const parallelRoundTrip = validateDocument(
  JSON.parse(JSON.stringify(parallel)),
);
if (
  !parallelRoundTrip ||
  parallelRoundTrip.cells.filter((cell) => (cell.level ?? 2) === 2).length !==
    2 ||
  parallelRoundTrip.cells.filter((cell) => cell.level === 3).length !== 1
) {
  throw new Error('parallel higher cells: duplicate 2-cells or 3-cell were lost');
}

const oldDraft = JSON.parse(JSON.stringify(homotopy));
oldDraft.nodes[0].x = 151;
oldDraft.nodes[0].y = 105;
oldDraft.nodes[1].x = 153;
oldDraft.nodes[1].y = 106;
const alignedDraft = alignDocumentToSceneGrid(oldDraft);
const alignedPositions = alignedDraft.nodes.map(
  (node) => `${node.x}:${node.y}`,
);
if (
  alignedDraft.nodes.some((node) => node.x % 40 !== 0 || node.y % 40 !== 0) ||
  new Set(alignedPositions).size !== alignedPositions.length
) {
  throw new Error('fixed grid migration did not centre or separate objects');
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
  !quasiXy.includes('^(.35){\\alpha}') ||
  !quasiXy.includes('|(0.5)*{}="xyq-a1"') ||
  !quasiXy.includes('\\POS "1,11"')
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
if (constrainArrowCurve(nativeCurves, 'a-f', 220) !== 180) {
  throw new Error('curve constraint: failed at the positive boundary');
}
if (
  cellCreationConflict(
    exampleDocuments.twocell,
    { kind: 'arrow', id: 'a-g', t: 0.5 },
    { kind: 'arrow', id: 'a-f', t: 0.5 },
  ) !== null
) {
  throw new Error('cell conflict: a parallel duplicate pair was rejected');
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

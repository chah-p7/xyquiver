import {
  alignDocumentToSceneGrid,
  arrowGridAnchors,
  cellLabelPoint,
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
  migrateLegacyHomotopyLayout,
  migrateLegacyParallelDeformation,
  nodeLabelWidth,
  nodeMetrics,
  normalizeMathTex,
  resolveConnectionLevel,
  sceneGridEdges,
  snapCurveLevel,
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
  resolveConnectionLevel('cell', 'node', 'node') !== 'arrow' ||
  resolveConnectionLevel('arrow', 'node', 'node') !== 'arrow' ||
  resolveConnectionLevel('auto', 'node', 'arrow') !== 'cell' ||
  resolveConnectionLevel('auto', 'cell', 'cell') !== 'cell'
) {
  throw new Error(
    'connection form: endpoint kinds did not choose the arrow form',
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
  ![360, 480, 600].every((x) =>
    topGridAnchors.some((anchor) => anchor.x === x && anchor.y === 160),
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
  !curvedCellXy.text.includes('\\ar@2{->}@/^') ||
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
if (
  firstNodeTexAtom(longTarget.label) !== 'C' ||
  targetMetrics.width !== nodeMetrics(parallel.nodes[0]).width ||
  nodeLabelWidth(longTarget) <= targetMetrics.width ||
  incomingEndpoints.length !== 2 ||
  new Set(
    incomingEndpoints.map(
      (point) => `${Math.round(point.x)}:${Math.round(point.y)}`,
    ),
  ).size !== 1 ||
  incomingEndpoints[0].x >= longTarget.x
) {
  throw new Error(
    'label clearance: arrows did not stop at the nearest glyph edge',
  );
}

const rightApproach = JSON.parse(JSON.stringify(parallel));
rightApproach.nodes.find((node) => node.id === 'n-c').x = 920;
rightApproach.arrows.push({
  ...rightApproach.arrows[0],
  id: 'a-source-clearance',
  source: 'n-cp',
  target: 'n-c',
  curve: 0,
});
const fromRight = getArrowGeometry(
  rightApproach,
  rightApproach.arrows.find((arrow) => arrow.id === 'a-rho2'),
);
const toRight = getArrowGeometry(
  rightApproach,
  rightApproach.arrows.find((arrow) => arrow.id === 'a-source-clearance'),
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
  parallel.arrows.length !== 2 ||
  parallel.arrows.some((arrow) => arrow.id === 'a-rho0') ||
  parallel.cells.length !== 3 ||
  parallel.cells.some((cell) => cell.shaft && cell.shaft !== 'double') ||
  parallel.cells[0].sourceAnchor?.kind !== 'arrow' ||
  parallel.cells[0].sourceAnchor.t !== 0.27 ||
  parallel.cells[1].sourceAnchor?.kind !== 'arrow' ||
  parallel.cells[1].sourceAnchor.t !== 0.73 ||
  parallel.cells[2].sourceAnchor?.kind !== 'cell' ||
  parallel.cells[2].targetAnchor?.kind !== 'cell' ||
  !anchoredParallelXy.includes('@!0 @C=1.45em @R=1.45em') ||
  !anchoredParallelXy.includes("*![r]{C'_i=C+d\\rho_2=C+d\\rho'_2}") ||
  anchoredParallelXy.includes('\\rlap') ||
  anchoredParallelXy.includes('\\phantom') ||
  anchoredParallelXy.includes('\\xtwocell') ||
  !anchoredParallelXy.includes('\\ar@2{->}@/_0.82em/') ||
  !anchoredParallelXy.includes('\\ar@2{->}@/^0.82em/') ||
  !anchoredParallelXy.includes("{\\rho'_1}") ||
  !anchoredParallelXy.includes('{\\rho_1}') ||
  !anchoredParallelXy.includes('\\ar@2{<-}') ||
  !anchoredParallelXy.includes('{\\rho_0}')
) {
  throw new Error(
    'parallel example: native boundaries or first-glyph anchoring regressed',
  );
}

const fourWayArrowLabels = JSON.parse(JSON.stringify(exampleDocuments.twocell));
fourWayArrowLabels.arrows[0].labelPlacement = 'left';
fourWayArrowLabels.arrows[1].labelPlacement = 'right';
const fourWayXy = generateXyPic(fourWayArrowLabels, 'snippet').text;
const fourWayRoundTrip = validateDocument(fourWayArrowLabels);
if (
  fourWayRoundTrip?.arrows[0].labelPlacement !== 'left' ||
  fourWayRoundTrip?.arrows[1].labelPlacement !== 'right' ||
  !fourWayXy.includes('@/^1.31em/@{}[rrrrrrrrrrrrrrr]|(.5)*+<-1.2em,0pt>{F}') ||
  !fourWayXy.includes('@/_1.31em/@{}[rrrrrrrrrrrrrrr]|(.5)*+<1.2em,0pt>{G}')
) {
  throw new Error('arrow labels: Xy-pic four-way label placement regressed');
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
  !stabilizationXy.includes('\\ar@2{->}')
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
  connectingMap.curve !== 180 ||
  !cokerHorizontal ||
  cokerHorizontal.start.x > 372 ||
  !homotopyXy.includes('@!0 @C=1.45em @R=1.45em') ||
  !homotopyXy.includes(`\\ar[${'r'.repeat(10)}]^{\\overset`) ||
  !homotopyXy.includes(`\\ar@{}[${'r'.repeat(10)}]|(0.64)*i{A}="xyq-a1"`)
) {
  throw new Error('snake lemma or logical Xy-pic alignment regressed');
}

const movedHomotopy = JSON.parse(JSON.stringify(homotopy));
movedHomotopy.nodes.find((node) => node.id === 'n-xr').x -= 40;
const movedHomotopyXy = generateXyPic(movedHomotopy, 'snippet').text;
if (
  movedHomotopyXy === homotopyXy ||
  !movedHomotopyXy.includes(`\\ar[${'r'.repeat(9)}]^{\\overset`)
) {
  throw new Error(
    'canvas/source mapping: moving one visual grid cell did not change one Xy-pic hop',
  );
}

const legacyWideHomotopy = JSON.parse(JSON.stringify(homotopy));
for (const [id, x, y] of [
  ['n-xl', 80, 80],
  ['n-xr', 880, 80],
  ['n-bp', 480, 320],
  ['n-omega', 480, 560],
]) {
  Object.assign(
    legacyWideHomotopy.nodes.find((node) => node.id === id),
    { x, y },
  );
}
const migratedHomotopy = migrateLegacyHomotopyLayout(legacyWideHomotopy);
if (
  migratedHomotopy.nodes.some((node) => {
    const expected = homotopy.nodes.find(
      (candidate) => candidate.id === node.id,
    );
    return !expected || node.x !== expected.x || node.y !== expected.y;
  })
) {
  throw new Error('homotopy layout migration did not compact a saved example');
}

const parallelRoundTrip = validateDocument(
  JSON.parse(JSON.stringify(parallel)),
);
if (
  !parallelRoundTrip ||
  parallelRoundTrip.cells.length !== 3 ||
  parallelRoundTrip.cells.some((cell) => cell.shaft !== 'double')
) {
  throw new Error('parallel attached arrows were lost');
}

const legacyParallel = JSON.parse(JSON.stringify(parallel));
legacyParallel.arrows.splice(
  1,
  0,
  {
    ...legacyParallel.arrows[0],
    id: 'a-rho1',
    source: 'n-cp',
    target: 'n-c',
    label: '\\rho_1',
    curve: -82,
  },
  {
    ...legacyParallel.arrows[0],
    id: 'a-rho1p',
    source: 'n-cp',
    target: 'n-c',
    label: "\\rho'_1",
    curve: 82,
  },
);
legacyParallel.cells[0] = {
  ...legacyParallel.cells[0],
  sourceArrow: 'a-rho1',
  targetArrow: 'a-rho1p',
  sourceAnchor: undefined,
  targetAnchor: undefined,
  label: '',
};
legacyParallel.cells[1] = {
  ...legacyParallel.cells[1],
  sourceArrow: 'a-rho1',
  targetArrow: 'a-rho1p',
  sourceAnchor: undefined,
  targetAnchor: undefined,
  label: '',
};
const migratedParallel = migrateLegacyParallelDeformation(legacyParallel);
if (
  migratedParallel.arrows.length !== 2 ||
  migratedParallel.arrows.some((arrow) =>
    ['a-rho1', 'a-rho1p'].includes(arrow.id),
  ) ||
  migratedParallel.cells[0].label !== "\\rho'_1" ||
  migratedParallel.cells[0].sourceAnchor?.kind !== 'arrow' ||
  migratedParallel.cells[2].sourceAnchor?.kind !== 'cell'
) {
  throw new Error('parallel migration did not restore higher-arrow anchors');
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
  !quasiXy.includes('\\ar@2{->}') ||
  !quasiXy.includes('|(.5)*+<0pt,-1.2em>{\\alpha}') ||
  !quasiXy.includes('|(0.5)*i{A}="xyq-a1"') ||
  !quasiXy.includes('\\POS "1,11"')
) {
  throw new Error(
    'quasicategory: vertex-to-edge 2-cell was not attached to a named path position',
  );
}
const placedLabels = ['top', 'bottom', 'left', 'right'].map((position) => {
  const placed = JSON.parse(JSON.stringify(quasi));
  placed.cells[0].labelPosition = position;
  return generateXyPic(placed, 'snippet').text;
});
if (
  !placedLabels[0].includes('*+<0pt,-1.2em>{\\alpha}') ||
  !placedLabels[1].includes('*+<0pt,1.2em>{\\alpha}') ||
  !placedLabels[2].includes('*+<-1.2em,0pt>{\\alpha}') ||
  !placedLabels[3].includes('*+<1.2em,0pt>{\\alpha}')
) {
  throw new Error('attached-arrow labels: four-way Xy-pic placement regressed');
}
const singleAttached = JSON.parse(JSON.stringify(quasi));
singleAttached.cells[0].shaft = 'single';
const singleAttachedXy = generateXyPic(singleAttached, 'snippet').text;
const singleAttachedRoundTrip = validateDocument(singleAttached);
if (
  !singleAttachedXy.includes('\\ar@{->}') ||
  singleAttachedXy.includes('\\ar@2{->}') ||
  singleAttachedRoundTrip?.cells[0].shaft !== 'single'
) {
  throw new Error('attached-arrow style: single/double override regressed');
}
const quasiGeometry = getCellGeometry(quasi, quasi.cells[0]);
if (
  !quasiGeometry ||
  cellLabelPoint(quasiGeometry, 'top').y >= quasiGeometry.midpoint.y ||
  cellLabelPoint(quasiGeometry, 'bottom').y <= quasiGeometry.midpoint.y ||
  cellLabelPoint(quasiGeometry, 'left').x >= quasiGeometry.midpoint.x ||
  cellLabelPoint(quasiGeometry, 'right').x <= quasiGeometry.midpoint.x
) {
  throw new Error('attached-arrow labels: canvas placement regressed');
}
const showcaseXy = generateXyPic(exampleDocuments.showcase, 'snippet').text;
if (
  showcaseXy.includes('\\UseAllTwocells') ||
  showcaseXy.includes('@{==>}') ||
  showcaseXy.includes('\\xtwocell') ||
  (showcaseXy.match(/@2\{->\}/g) ?? []).length !== 3 ||
  !showcaseXy.includes('@/^1.74em/') ||
  !showcaseXy.includes('@/_3.44em/')
) {
  throw new Error(
    'native higher-arrow export: editable geometry was not preserved',
  );
}
const duplicateNative = JSON.parse(JSON.stringify(nativeExample));
duplicateNative.cells.push({
  ...duplicateNative.cells[0],
  id: 'c-beta',
  label: '\\beta',
});
const duplicateNativeXy = generateXyPic(duplicateNative, 'snippet').text;
if (
  duplicateNativeXy.includes('\\xtwocell') ||
  (duplicateNativeXy.match(/@2\{->\}/g) ?? []).length !== 2
) {
  throw new Error(
    'parallel higher cells: shared boundaries collapsed into native shorthand',
  );
}
const dependedNative = JSON.parse(JSON.stringify(nativeExample));
dependedNative.cells.push({
  id: 'c-beta',
  sourceAnchor: { kind: 'cell', id: 'c-alpha' },
  targetAnchor: { kind: 'node', id: 'n-b' },
  sourcePath: [],
  targetPath: [],
  label: '\\beta',
  color: '#273244',
  shaft: 'double',
  head: 'arrow',
  stroke: 'solid',
});
const dependedNativeXy = generateXyPic(dependedNative, 'snippet').text;
if (
  dependedNativeXy.includes('\\xtwocell') ||
  !dependedNativeXy.includes('="xyq-c1"') ||
  !dependedNativeXy.includes('\\POS "xyq-c1"')
) {
  throw new Error(
    'higher-cell dependency: native shorthand discarded a named cell anchor',
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
if (snapCurveLevel(205) !== 220 || snapCurveLevel(-205) !== -220) {
  throw new Error('curve snapping: outer fixed levels regressed');
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
const nativeTypora = generateXyPic(nativeExample, 'typora').text;
const nativeLatex = generateXyPic(nativeExample, 'latex').text;
if (
  nativeTypora.includes('\\xtwocell') ||
  nativeTypora.includes('\\UseAllTwocells') ||
  nativeLatex.includes('\\UseAllTwocells') ||
  !nativeLatex.includes('\\ar@2{->}')
) {
  throw new Error(
    'native higher-arrow export: XyJax/LaTeX modes regressed',
  );
}

const styled = JSON.parse(JSON.stringify(exampleDocuments.quasicategory));
Object.assign(
  styled.arrows.find((arrow) => arrow.id === 'q-f'),
  { stroke: 'dashed', head: 'twohead', tail: 'hook', curve: 40 },
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
  !styledXy.includes('@{^{(}-->>}@/^0.73em/') ||
  !styledXy.includes('@{|=}') ||
  !styledXy.includes('\\ar@{-->}')
) {
  throw new Error(
    'cell styles: combined dimension, body, tail, and head were not exported',
  );
}

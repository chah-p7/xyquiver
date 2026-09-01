export type NodeId = string;
export type ArrowId = string;
export type CellId = string;

export type ArrowStroke = 'solid' | 'dashed' | 'dotted' | 'double';
export type ArrowHead = 'arrow' | 'twohead' | 'none';
export type ArrowTail = 'none' | 'hook' | 'mapsto';
export type LabelSide = 'left' | 'right';
export type CellHead = 'arrow' | 'reverse' | 'equality' | 'none';
export type CellStroke = 'solid' | 'dashed' | 'dotted' | 'none';
export type CellShaft = 'single' | 'double';
export type CellLabelPosition = 'top' | 'bottom' | 'left' | 'right';
export type ConnectionLevel = 'auto' | 'arrow' | 'cell';
export type ConnectionAnchorKind = 'point' | 'node' | 'arrow' | 'cell';

export interface Point {
  x: number;
  y: number;
}

export interface DiagramNode extends Point {
  id: NodeId;
  label: string;
  ghost?: boolean;
}

export interface DiagramArrow {
  id: ArrowId;
  source: NodeId;
  target: NodeId;
  label: string;
  curve: number;
  labelSide: LabelSide;
  /** Absolute Xy-pic label placement. Legacy documents may still use labelSide. */
  labelPlacement?: CellLabelPosition;
  /** Optional position of the label along the arrow, from source to target. */
  labelPosition?: number;
  stroke: ArrowStroke;
  head: ArrowHead;
  tail: ArrowTail;
  color: string;
}

export type CellAnchor =
  | { kind: 'node'; id: NodeId }
  | { kind: 'arrow'; id: ArrowId; t?: number }
  | { kind: 'cell'; id: CellId };

export interface DiagramTwoCell {
  id: CellId;
  /** Legacy import field. Higher arrows are now determined by their anchors. */
  level?: 2 | 3;
  /** Legacy/native parallel-boundary representation. */
  sourceArrow?: ArrowId;
  targetArrow?: ArrowId;
  /** General attachment points for simplicial and pasting cells. */
  sourceAnchor?: CellAnchor;
  targetAnchor?: CellAnchor;
  /** Semantic boundary paths, ordered from their common source to target. */
  sourcePath?: ArrowId[];
  targetPath?: ArrowId[];
  label: string;
  /** Absolute label placement in the editor and all exports. */
  labelPosition?: CellLabelPosition;
  /** Visual line count; independent of categorical dimension. */
  shaft?: CellShaft;
  color: string;
  /** Signed quadratic bend in scene units, matching 1-cell curvature. */
  curve?: number;
  head?: CellHead;
  stroke?: CellStroke;
}

export function resolvedCellStroke(cell: DiagramTwoCell): CellStroke {
  return cell.stroke ?? (cell.head === 'none' ? 'none' : 'solid');
}

export function resolvedCellLabelPosition(
  cell: DiagramTwoCell,
): CellLabelPosition {
  return cell.labelPosition ?? 'top';
}

export function resolvedCellShaft(cell: DiagramTwoCell): CellShaft {
  return cell.shaft ?? 'double';
}

export function resolvedCellHead(
  cell: DiagramTwoCell,
): Exclude<CellHead, 'equality'> {
  return cell.head === 'equality' ? 'none' : (cell.head ?? 'arrow');
}

export interface DiagramGrid {
  columns: number[];
  rows: number[];
}

export interface DiagramDocument {
  format: 'xyquiver';
  version: 2;
  title: string;
  grid?: DiagramGrid;
  nodes: DiagramNode[];
  arrows: DiagramArrow[];
  cells: DiagramTwoCell[];
}

export type Selection =
  | { kind: 'node'; id: NodeId }
  | { kind: 'arrow'; id: ArrowId }
  | { kind: 'cell'; id: CellId };

export interface SelectionState {
  items: Selection[];
  primary: Selection | null;
}

export interface DiagramRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ArrowGeometry {
  start: Point;
  control: Point;
  end: Point;
  midpoint: Point;
  tangent: Point;
  normal: Point;
  path: string;
}

export interface ExportResult {
  text: string;
  warnings: string[];
}

export const SCENE_WIDTH = 1000;
export const SCENE_HEIGHT = 650;
export const SNAP = 40;
export const CURVE_SNAP_LEVELS = [
  -220, -180, -140, -100, -70, -45, 0, 45, 70, 100, 140, 180, 220,
] as const;

export function snapCurveLevel(value: number): number {
  return CURVE_SNAP_LEVELS.reduce((best, candidate) =>
    Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best,
  );
}
export const DEFAULT_MATRIX_GRID: DiagramGrid = {
  columns: [80, 280, 480, 680, 880],
  rows: [80, 200, 320, 440, 560],
};

const greek: Record<string, string> = {
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
  eta: 'η',
  theta: 'θ',
  lambda: 'λ',
  mu: 'μ',
  nu: 'ν',
  pi: 'π',
  rho: 'ρ',
  sigma: 'σ',
  tau: 'τ',
  phi: 'φ',
  psi: 'ψ',
  omega: 'ω',
  Gamma: 'Γ',
  Delta: 'Δ',
  Lambda: 'Λ',
  Omega: 'Ω',
};

const mathcal: Record<string, string> = {
  A: '𝒜',
  B: 'ℬ',
  C: '𝒞',
  D: '𝒟',
  E: 'ℰ',
  F: 'ℱ',
  G: '𝒢',
  H: 'ℋ',
  I: 'ℐ',
  J: '𝒥',
  K: '𝒦',
  L: 'ℒ',
  M: 'ℳ',
  N: '𝒩',
  O: '𝒪',
  P: '𝒫',
  Q: '𝒬',
  R: 'ℛ',
  S: '𝒮',
  T: '𝒯',
  U: '𝒰',
  V: '𝒱',
  W: '𝒲',
  X: '𝒳',
  Y: '𝒴',
  Z: '𝒵',
};

const blackboard: Record<string, string> = {
  C: 'ℂ',
  H: 'ℍ',
  N: 'ℕ',
  P: 'ℙ',
  Q: 'ℚ',
  R: 'ℝ',
  Z: 'ℤ',
};

export function normalizeMathTex(value: string): string {
  const trimmed = value.trim();
  const wrappers: Array<[string, string]> = [
    ['$$', '$$'],
    ['\\[', '\\]'],
    ['\\(', '\\)'],
    ['$', '$'],
  ];
  for (const [open, close] of wrappers) {
    if (
      trimmed.startsWith(open) &&
      trimmed.endsWith(close) &&
      trimmed.length >= open.length + close.length
    ) {
      return trimmed.slice(open.length, -close.length).trim();
    }
  }
  return trimmed;
}

export function displayTex(value: string): string {
  let result = normalizeMathTex(value);
  result = result.replace(
    /\\mathcal\{([A-Z])\}/g,
    (_, letter: string) => mathcal[letter] ?? letter,
  );
  result = result.replace(
    /\\mathbb\{([A-Z])\}/g,
    (_, letter: string) => blackboard[letter] ?? letter,
  );
  result = result.replace(
    /\\(?:operatorname|mathrm|mathbf|mathit|text|txt)\{([^{}]*)\}/g,
    '$1',
  );
  result = result.replace(/\\([A-Za-z]+)/g, (match, command: string) => {
    if (greek[command]) return greek[command];
    const symbols: Record<string, string> = {
      hbar: 'ℏ',
      infty: '∞',
      conn: 'conn',
      cl: 'cl',
      simeq: '≃',
      cong: '≅',
      equiv: '≃',
      to: '→',
      mapsto: '↦',
      nabla: '∇',
      cdot: '·',
      circ: '∘',
      ast: '∗',
      Rightarrow: '⇒',
      leftarrow: '←',
    };
    return symbols[command] ?? match;
  });
  return result
    .replace(/\\,/g, ' ')
    .replace(/\\!/g, '')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function balancedGroupEnd(value: string, start: number): number {
  if (value[start] !== '{') return start;
  let depth = 0;
  for (let index = start; index < value.length; index += 1) {
    if (value[index] === '\\') {
      index += 1;
      continue;
    }
    if (value[index] === '{') depth += 1;
    if (value[index] === '}') {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }
  return value.length;
}

function texTokenEnd(value: string, start: number): number {
  if (value[start] === '{') return balancedGroupEnd(value, start);
  if (value[start] !== '\\') {
    return start + (value.codePointAt(start)! > 0xffff ? 2 : 1);
  }
  let end = start + 1;
  if (/[A-Za-z]/.test(value[end] ?? '')) {
    while (/[A-Za-z]/.test(value[end] ?? '')) end += 1;
  } else if (end < value.length) {
    end += value.codePointAt(end)! > 0xffff ? 2 : 1;
  }
  const command = value.slice(start + 1, end);
  if (
    /^(?:mathcal|mathbb|mathrm|mathbf|mathit|operatorname|text|txt|hat|bar|tilde|widehat|widetilde)$/.test(
      command,
    ) &&
    value[end] === '{'
  ) {
    return balancedGroupEnd(value, end);
  }
  return end;
}

/** The first visible TeX glyph; following primes and scripts stay in the overlay. */
export function firstNodeTexAtom(value: string): string {
  const tex = normalizeMathTex(value)
    .replace(/[\r\n]/g, ' ')
    .trim();
  if (!tex) return '';
  return tex.slice(0, texTokenEnd(tex, 0));
}

export function snap(value: number): number {
  return Math.round(value / SNAP) * SNAP;
}

export function sceneGridCenters(maximum: number): number[] {
  return Array.from(
    { length: Math.max(0, Math.floor(maximum / SNAP) - 1) },
    (_, index) => (index + 1) * SNAP,
  );
}

export function sceneGridEdges(maximum: number): number[] {
  return Array.from(
    { length: Math.max(0, Math.floor(maximum / SNAP)) },
    (_, index) => SNAP / 2 + index * SNAP,
  ).filter((edge) => edge < maximum);
}

export function matrixAxes(
  doc: DiagramDocument,
  fallback = false,
): DiagramGrid {
  const base = doc.grid ?? (fallback ? DEFAULT_MATRIX_GRID : undefined);
  const columns = [
    ...new Set([...(base?.columns ?? []), ...doc.nodes.map((node) => node.x)]),
  ]
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const rows = [
    ...new Set([...(base?.rows ?? []), ...doc.nodes.map((node) => node.y)]),
  ]
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  return { columns, rows };
}

// @!0 makes these the actual fixed Xy-pic centre-to-centre steps and ignores
// entry dimensions. Equal values preserve the editor's square grid; 1.45pc is
// roughly one and a half math em, so a cell is only a little wider than one
// ordinary object glyph instead of growing with a long label.
const XY_COLUMN_GRID_UNIT_PC = 1.45;
const XY_ROW_GRID_UNIT_PC = 1.45;
const XY_CURVE_UNIT_PC = 0.625;

function filledLogicalAxis(values: number[]): number[] {
  const points = [...new Set(values)]
    .filter(Number.isFinite)
    .sort((left, right) => left - right);
  if (points.length < 2) return points;
  const start = snap(points[0]);
  const end = snap(points.at(-1)!);
  const filled: number[] = [];
  for (let value = start; value <= end; value += SNAP) filled.push(value);
  return [...new Set([...filled, ...points])].sort(
    (left, right) => left - right,
  );
}

/**
 * Every visible editor grid centre is one Xy-pic logical step. Moving an
 * object by one snap cell therefore changes the generated hop by exactly one
 * u/d/l/r, while a small typographic cell size keeps long arrows in scale.
 */
export function exportMatrixAxes(doc: DiagramDocument): DiagramGrid {
  return {
    columns: filledLogicalAxis(doc.nodes.map((node) => node.x)),
    rows: filledLogicalAxis(doc.nodes.map((node) => node.y)),
  };
}

/**
 * Migrate documents created before the fixed visual grid was introduced.
 * Every object is placed on a visible cell centre and coincident objects are
 * moved to the nearest free centre without changing their relative order.
 */
export function alignDocumentToSceneGrid(
  document: DiagramDocument,
): DiagramDocument {
  const doc = cloneDocument(document);
  const used = new Set<string>();
  const maxColumn = Math.floor((SCENE_WIDTH - SNAP) / SNAP) * SNAP;
  const maxRow = Math.floor((SCENE_HEIGHT - SNAP) / SNAP) * SNAP;
  const clampCenter = (point: Point): Point => ({
    x: Math.min(maxColumn, Math.max(SNAP, snap(point.x))),
    y: Math.min(maxRow, Math.max(SNAP, snap(point.y))),
  });
  const nearestFree = (origin: Point): Point => {
    const candidates: Point[] = [];
    const maxRadius = Math.max(
      Math.floor(SCENE_WIDTH / SNAP),
      Math.floor(SCENE_HEIGHT / SNAP),
    );
    for (let radius = 0; radius <= maxRadius; radius += 1) {
      candidates.length = 0;
      for (let dx = -radius; dx <= radius; dx += 1) {
        const dy = radius - Math.abs(dx);
        candidates.push(
          { x: origin.x + dx * SNAP, y: origin.y + dy * SNAP },
          ...(dy === 0
            ? []
            : [{ x: origin.x + dx * SNAP, y: origin.y - dy * SNAP }]),
        );
      }
      const free = candidates.find(
        (point) =>
          point.x >= SNAP &&
          point.x <= maxColumn &&
          point.y >= SNAP &&
          point.y <= maxRow &&
          !used.has(`${point.x}:${point.y}`),
      );
      if (free) return free;
    }
    return origin;
  };

  doc.nodes = doc.nodes.map((node) => {
    const position = nearestFree(clampCenter(node));
    used.add(`${position.x}:${position.y}`);
    return { ...node, ...position };
  });
  if (doc.grid) {
    doc.grid = {
      columns: [
        ...new Set(
          doc.grid.columns.map((value) => clampCenter({ x: value, y: SNAP }).x),
        ),
      ].sort((left, right) => left - right),
      rows: [
        ...new Set(
          doc.grid.rows.map((value) => clampCenter({ x: SNAP, y: value }).y),
        ),
      ].sort((top, bottom) => top - bottom),
    };
  }
  return doc;
}

/**
 * Convert matrix snap-point centres into the surrounding cell boundaries.
 * Keeping this separate from `matrixAxes` means snapping still targets the
 * vertices while the visible grid reads as cells around those vertices.
 */
export function matrixCellEdges(
  centers: number[],
  minimum: number,
  maximum: number,
): number[] {
  const points = [...new Set(centers)]
    .filter(Number.isFinite)
    .sort((left, right) => left - right);
  if (points.length === 0 || maximum <= minimum) return [];

  const firstGap = points.length > 1 ? points[1] - points[0] : SNAP;
  const lastGap = points.length > 1 ? points.at(-1)! - points.at(-2)! : SNAP;
  const edges = [
    points[0] - firstGap / 2,
    ...points.slice(0, -1).map((point, index) => {
      const next = points[index + 1];
      return point + (next - point) / 2;
    }),
    points.at(-1)! + lastGap / 2,
  ];

  return [
    ...new Set(edges.map((edge) => Math.min(maximum, Math.max(minimum, edge)))),
  ];
}

export function resolveConnectionLevel(
  _requested: ConnectionLevel,
  source: ConnectionAnchorKind,
  target: ConnectionAnchorKind,
): Exclude<ConnectionLevel, 'auto'> {
  // Users draw one kind of connection. Object-to-object connections are
  // ordinary arrows; attaching either endpoint to an existing arrow produces
  // the same double-line higher arrow, recursively.
  return source === 'arrow' ||
    target === 'arrow' ||
    source === 'cell' ||
    target === 'cell'
    ? 'cell'
    : 'arrow';
}

export function snapPointToMatrix(_doc: DiagramDocument, point: Point): Point {
  return {
    x: Math.min(
      Math.floor((SCENE_WIDTH - SNAP) / SNAP) * SNAP,
      Math.max(SNAP, snap(point.x)),
    ),
    y: Math.min(
      Math.floor((SCENE_HEIGHT - SNAP) / SNAP) * SNAP,
      Math.max(SNAP, snap(point.y)),
    ),
  };
}

export function nodeMetrics(node: DiagramNode) {
  if (node.ghost) return { width: 14, height: 14 };
  return { width: 40, height: 40 };
}

export function nodeLabelWidth(node: DiagramNode): number {
  if (node.ghost) return 14;
  // TeX commands such as \operatorname expand to far fewer visible glyphs than
  // their source spelling. displayTex already strips those commands, and this
  // deliberately compact estimate keeps the shaft close to the final glyph.
  return Math.max(40, displayTex(node.label).length * 11 + 18);
}

function normalize(vector: Point): Point {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
}

function pointOutsideNodeLabel(
  node: DiagramNode,
  direction: Point,
  gap: number,
): Point {
  const size = nodeMetrics(node);
  const labelWidth = nodeLabelWidth(node);
  const bounds = node.ghost
    ? {
        left: -size.width / 2,
        right: size.width / 2,
        top: -size.height / 2,
        bottom: size.height / 2,
      }
    : {
        // Labels are first-glyph anchored at the grid centre and grow right.
        left: -size.width / 2,
        right: labelWidth - size.width / 2,
        top: -size.height / 2,
        bottom: size.height / 2,
      };
  const horizontalExit =
    Math.abs(direction.x) < 1e-6
      ? Number.POSITIVE_INFINITY
      : (direction.x > 0 ? bounds.right : bounds.left) / direction.x;
  const verticalExit =
    Math.abs(direction.y) < 1e-6
      ? Number.POSITIVE_INFINITY
      : (direction.y > 0 ? bounds.bottom : bounds.top) / direction.y;
  const exit = Math.min(horizontalExit, verticalExit) + gap;
  return {
    x: node.x + direction.x * exit,
    y: node.y + direction.y * exit,
  };
}

export function quadraticPoint(
  start: Point,
  control: Point,
  end: Point,
  t: number,
): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x,
    y: mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y,
  };
}

export function quadraticTangent(
  start: Point,
  control: Point,
  end: Point,
  t: number,
): Point {
  return normalize({
    x: 2 * (1 - t) * (control.x - start.x) + 2 * t * (end.x - control.x),
    y: 2 * (1 - t) * (control.y - start.y) + 2 * t * (end.y - control.y),
  });
}

export function getArrowGeometry(
  doc: DiagramDocument,
  arrow: DiagramArrow,
): ArrowGeometry | null {
  const source = doc.nodes.find((node) => node.id === arrow.source);
  const target = doc.nodes.find((node) => node.id === arrow.target);
  if (!source || !target || source.id === target.id) return null;

  const chord = normalize({ x: target.x - source.x, y: target.y - source.y });
  const normal = { x: chord.y, y: -chord.x };
  const start = pointOutsideNodeLabel(source, chord, 13);
  const end = pointOutsideNodeLabel(target, { x: -chord.x, y: -chord.y }, 13);
  const control = {
    x: (start.x + end.x) / 2 + normal.x * arrow.curve,
    y: (start.y + end.y) / 2 + normal.y * arrow.curve,
  };
  const midpoint = quadraticPoint(start, control, end, 0.5);
  const tangent = quadraticTangent(start, control, end, 0.5);
  const middleNormal = { x: tangent.y, y: -tangent.x };
  return {
    start,
    control,
    end,
    midpoint,
    tangent,
    normal: middleNormal,
    path: `M ${round(start.x)} ${round(start.y)} Q ${round(control.x)} ${round(control.y)} ${round(end.x)} ${round(end.y)}`,
  };
}

export function arrowPointAt(
  geometry: ArrowGeometry,
  position = 0.5,
): Pick<ArrowGeometry, 'midpoint' | 'tangent' | 'normal'> {
  const t = Math.min(0.95, Math.max(0.05, position));
  const midpoint = quadraticPoint(
    geometry.start,
    geometry.control,
    geometry.end,
    t,
  );
  const tangent = quadraticTangent(
    geometry.start,
    geometry.control,
    geometry.end,
    t,
  );
  return {
    midpoint,
    tangent,
    normal: { x: tangent.y, y: -tangent.x },
  };
}

export function resolvedArrowLabelPosition(
  arrow: DiagramArrow,
): CellLabelPosition {
  return (
    arrow.labelPlacement ?? (arrow.labelSide === 'left' ? 'top' : 'bottom')
  );
}

export function arrowLabelPoint(
  geometry: ArrowGeometry,
  arrow: DiagramArrow,
  distance = 25,
): Point {
  const placed = arrowPointAt(geometry, arrow.labelPosition ?? 0.5);
  if (arrow.labelPlacement) {
    return cellLabelPoint(
      { midpoint: placed.midpoint },
      arrow.labelPlacement,
      distance,
    );
  }
  const side = arrow.labelSide === 'left' ? 1 : -1;
  return {
    x: placed.midpoint.x + placed.normal.x * distance * side,
    y: placed.midpoint.y + placed.normal.y * distance * side,
  };
}

export interface ArrowGridAnchor extends Point {
  t: number;
}

/** Grid-centre attachment points lying on the interior of an arrow. */
export function arrowGridAnchors(
  doc: DiagramDocument,
  arrow: DiagramArrow,
  tolerance = 10,
): ArrowGridAnchor[] {
  const geometry = getArrowGeometry(doc, arrow);
  if (!geometry) return [];
  const axes = {
    columns: sceneGridCenters(SCENE_WIDTH),
    rows: sceneGridCenters(SCENE_HEIGHT),
  };
  const candidates: ArrowGridAnchor[] = [];
  for (const x of axes.columns) {
    for (const y of axes.rows) {
      if (doc.nodes.some((node) => node.x === x && node.y === y)) continue;
      let best = {
        distance: Number.POSITIVE_INFINITY,
        t: 0.5,
        point: geometry.midpoint,
      };
      for (let step = 6; step <= 114; step += 1) {
        const t = step / 120;
        const point = quadraticPoint(
          geometry.start,
          geometry.control,
          geometry.end,
          t,
        );
        const candidateDistance = Math.hypot(point.x - x, point.y - y);
        if (candidateDistance < best.distance) {
          best = { distance: candidateDistance, t, point };
        }
      }
      if (best.distance > tolerance || best.t < 0.08 || best.t > 0.92) {
        continue;
      }
      if (
        candidates.some((candidate) => Math.abs(candidate.t - best.t) < 0.035)
      ) {
        continue;
      }
      candidates.push({ x, y, t: best.t });
    }
  }
  return candidates.sort((left, right) => left.t - right.t);
}

export function cellSourceAnchor(cell: DiagramTwoCell): CellAnchor | null {
  return (
    cell.sourceAnchor ??
    (cell.sourceArrow ? { kind: 'arrow', id: cell.sourceArrow, t: 0.5 } : null)
  );
}

export function cellTargetAnchor(cell: DiagramTwoCell): CellAnchor | null {
  return (
    cell.targetAnchor ??
    (cell.targetArrow ? { kind: 'arrow', id: cell.targetArrow, t: 0.5 } : null)
  );
}

export function cellBoundaryPaths(cell: DiagramTwoCell) {
  const source =
    cell.sourcePath ?? (cell.sourceArrow ? [cell.sourceArrow] : []);
  const target =
    cell.targetPath ?? (cell.targetArrow ? [cell.targetArrow] : []);
  return { source, target };
}

export function inferCompositeBoundary(
  doc: DiagramDocument,
  vertexId: NodeId,
  edgeId: ArrowId,
): ArrowId[] {
  const edge = doc.arrows.find((item) => item.id === edgeId);
  if (!edge) return [];
  const first = doc.arrows.find(
    (item) => item.source === edge.source && item.target === vertexId,
  );
  const second = doc.arrows.find(
    (item) => item.source === vertexId && item.target === edge.target,
  );
  return first && second ? [first.id, second.id] : [];
}

export function inferCellBoundaryPaths(
  doc: DiagramDocument,
  source: CellAnchor,
  target: CellAnchor,
) {
  if (source.kind === 'cell' || target.kind === 'cell') {
    return { source: [], target: [] };
  }
  if (source.kind === 'arrow' && target.kind === 'arrow') {
    const sourceArrow = doc.arrows.find((item) => item.id === source.id);
    const targetArrow = doc.arrows.find((item) => item.id === target.id);
    return sourceArrow && targetArrow && areParallel(sourceArrow, targetArrow)
      ? { source: [source.id], target: [target.id] }
      : { source: [], target: [] };
  }
  if (source.kind === 'node' && target.kind === 'arrow') {
    const composite = inferCompositeBoundary(doc, source.id, target.id);
    return {
      source: composite,
      target: composite.length > 0 ? [target.id] : [],
    };
  }
  if (source.kind === 'arrow' && target.kind === 'node') {
    const composite = inferCompositeBoundary(doc, target.id, source.id);
    return {
      source: composite.length > 0 ? [source.id] : [],
      target: composite,
    };
  }
  return { source: [], target: [] };
}

export function anchorPoint(
  doc: DiagramDocument,
  anchor: CellAnchor,
): Point | null {
  if (anchor.kind === 'node') {
    const node = doc.nodes.find((item) => item.id === anchor.id);
    return node ? { x: node.x, y: node.y } : null;
  }
  if (anchor.kind === 'cell') {
    const cell = doc.cells.find((item) => item.id === anchor.id);
    if (!cell) return null;
    return getCellGeometry(doc, cell)?.midpoint ?? null;
  }
  const arrow = doc.arrows.find((item) => item.id === anchor.id);
  const geometry = arrow ? getArrowGeometry(doc, arrow) : null;
  if (!geometry) return null;
  return quadraticPoint(
    geometry.start,
    geometry.control,
    geometry.end,
    Math.min(0.9, Math.max(0.1, anchor.t ?? 0.5)),
  );
}

function projectNodeOntoStraightArrow(
  doc: DiagramDocument,
  nodeAnchor: CellAnchor,
  arrowAnchor: CellAnchor,
): Point | null {
  if (nodeAnchor.kind !== 'node' || arrowAnchor.kind !== 'arrow') return null;
  const node = doc.nodes.find((item) => item.id === nodeAnchor.id);
  const arrow = doc.arrows.find((item) => item.id === arrowAnchor.id);
  const source = arrow
    ? doc.nodes.find((item) => item.id === arrow.source)
    : null;
  const target = arrow
    ? doc.nodes.find((item) => item.id === arrow.target)
    : null;
  if (!node || !arrow || !source || !target || Math.abs(arrow.curve) > 0.5)
    return null;

  const chord = { x: target.x - source.x, y: target.y - source.y };
  const lengthSquared = chord.x * chord.x + chord.y * chord.y;
  if (lengthSquared < 1) return null;
  const projection =
    ((node.x - source.x) * chord.x + (node.y - source.y) * chord.y) /
    lengthSquared;
  const requested = arrowAnchor.t ?? 0.5;
  if (Math.abs(projection - requested) > 0.06) return null;
  const t = Math.min(0.9, Math.max(0.1, projection));
  return {
    x: source.x + chord.x * t,
    y: source.y + chord.y * t,
  };
}

export function getCellGeometry(doc: DiagramDocument, cell: DiagramTwoCell) {
  const sourceAnchor = cellSourceAnchor(cell);
  const targetAnchor = cellTargetAnchor(cell);
  if (!sourceAnchor || !targetAnchor) return null;
  let rawFrom = anchorPoint(doc, sourceAnchor);
  let rawTo = anchorPoint(doc, targetAnchor);
  if (!rawFrom || !rawTo) return null;
  if (sourceAnchor.kind === 'node' && targetAnchor.kind === 'arrow') {
    rawTo =
      projectNodeOntoStraightArrow(doc, sourceAnchor, targetAnchor) ?? rawTo;
  } else if (sourceAnchor.kind === 'arrow' && targetAnchor.kind === 'node') {
    rawFrom =
      projectNodeOntoStraightArrow(doc, targetAnchor, sourceAnchor) ?? rawFrom;
  }
  if (Math.hypot(rawTo.x - rawFrom.x, rawTo.y - rawFrom.y) < 1) return null;
  const rawDirection = normalize({
    x: rawTo.x - rawFrom.x,
    y: rawTo.y - rawFrom.y,
  });
  let from = rawFrom;
  let to = rawTo;
  if (sourceAnchor.kind === 'node') {
    const node = doc.nodes.find((item) => item.id === sourceAnchor.id);
    if (node) {
      from = pointOutsideNodeLabel(node, rawDirection, 10);
    }
  }
  if (targetAnchor.kind === 'node') {
    const node = doc.nodes.find((item) => item.id === targetAnchor.id);
    if (node) {
      to = pointOutsideNodeLabel(
        node,
        { x: -rawDirection.x, y: -rawDirection.y },
        10,
      );
    }
  }
  const chordDirection = normalize({ x: to.x - from.x, y: to.y - from.y });
  const start = {
    x: from.x + chordDirection.x * (sourceAnchor.kind === 'node' ? 0 : 5),
    y: from.y + chordDirection.y * (sourceAnchor.kind === 'node' ? 0 : 5),
  };
  const end = {
    x: to.x - chordDirection.x * (targetAnchor.kind === 'node' ? 0 : 5),
    y: to.y - chordDirection.y * (targetAnchor.kind === 'node' ? 0 : 5),
  };
  const baseMidpoint = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };
  const baseNormal = {
    x: chordDirection.y,
    y: -chordDirection.x,
  };
  const curve = Math.min(220, Math.max(-220, cell.curve ?? 0));
  const control = {
    x: baseMidpoint.x + baseNormal.x * curve,
    y: baseMidpoint.y + baseNormal.y * curve,
  };
  const midpoint = quadraticPoint(start, control, end, 0.5);
  const direction = quadraticTangent(start, control, end, 0.5);
  const normal = { x: direction.y, y: -direction.x };
  const startTangent = quadraticTangent(start, control, end, 0);
  const endTangent = quadraticTangent(start, control, end, 1);
  return {
    start,
    end,
    control,
    baseMidpoint,
    baseNormal,
    midpoint,
    direction,
    normal,
    startTangent,
    endTangent,
    path: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`,
    sourceAnchor,
    targetAnchor,
  };
}

export function cellLabelPoint(
  geometry: Pick<NonNullable<ReturnType<typeof getCellGeometry>>, 'midpoint'>,
  position: CellLabelPosition,
  distance = 22,
): Point {
  const offset =
    position === 'top'
      ? { x: 0, y: -distance }
      : position === 'bottom'
        ? { x: 0, y: distance }
        : position === 'left'
          ? { x: -distance, y: 0 }
          : { x: distance, y: 0 };
  return {
    x: geometry.midpoint.x + offset.x,
    y: geometry.midpoint.y + offset.y,
  };
}

export function areParallel(
  first: DiagramArrow,
  second: DiagramArrow,
): boolean {
  return (
    first.id !== second.id &&
    first.source === second.source &&
    first.target === second.target
  );
}

export function isNativeParallelCell(
  doc: DiagramDocument,
  cell: DiagramTwoCell,
): boolean {
  const source = cellSourceAnchor(cell);
  const target = cellTargetAnchor(cell);
  if (
    !source ||
    !target ||
    source.kind !== 'arrow' ||
    target.kind !== 'arrow'
  ) {
    return false;
  }
  if (
    Math.abs((source.t ?? 0.5) - 0.5) > 1e-6 ||
    Math.abs((target.t ?? 0.5) - 0.5) > 1e-6
  ) {
    return false;
  }
  const paths = cellBoundaryPaths(cell);
  if (
    paths.source.length !== 1 ||
    paths.source[0] !== source.id ||
    paths.target.length !== 1 ||
    paths.target[0] !== target.id
  ) {
    return false;
  }
  const sourceArrow = doc.arrows.find((arrow) => arrow.id === source.id);
  const targetArrow = doc.arrows.find((arrow) => arrow.id === target.id);
  return Boolean(
    sourceArrow &&
    targetArrow &&
    areParallel(sourceArrow, targetArrow) &&
    resolvedCellShaft(cell) === 'double',
  );
}

export type CellCreationConflict =
  | 'duplicate'
  | 'shared-native-boundary'
  | null;

export function cellCreationConflict(
  _doc: DiagramDocument,
  _source: CellAnchor,
  _target: CellAnchor,
): CellCreationConflict {
  // Parallel higher cells are legitimate data: two 2-cells with the same
  // boundary can themselves be the source and target of a 3-cell.
  return null;
}

export function constrainArrowCurve(
  doc: DiagramDocument,
  arrowId: ArrowId,
  requested: number,
  minimum = -220,
  maximum = 220,
  gap = 28,
): number {
  const arrow = doc.arrows.find((item) => item.id === arrowId);
  if (!arrow) return Math.min(maximum, Math.max(minimum, requested));
  const partnerCurves = doc.cells.flatMap((cell) => {
    if (!isNativeParallelCell(doc, cell)) return [];
    const source = cellSourceAnchor(cell);
    const target = cellTargetAnchor(cell);
    if (source?.kind !== 'arrow' || target?.kind !== 'arrow') return [];
    const partnerId =
      source.id === arrowId
        ? target.id
        : target.id === arrowId
          ? source.id
          : null;
    const partner = partnerId
      ? doc.arrows.find((item) => item.id === partnerId)
      : null;
    return partner ? [partner.curve] : [];
  });
  const raw = Math.min(maximum, Math.max(minimum, snapCurveLevel(requested)));
  const valid = (candidate: number) =>
    partnerCurves.every((curve) => Math.abs(candidate - curve) >= gap);
  if (valid(raw)) return raw;
  const candidates = CURVE_SNAP_LEVELS.filter(
    (candidate) =>
      candidate >= minimum && candidate <= maximum && valid(candidate),
  );
  candidates.sort(
    (left, right) => Math.abs(left - raw) - Math.abs(right - raw),
  );
  return candidates[0] ?? arrow.curve;
}

export function selectionKey(selection: Selection): string {
  return `${selection.kind}:${selection.id}`;
}

export function selectionsInRect(
  doc: DiagramDocument,
  rect: DiagramRect,
): Selection[] {
  const left = Math.min(rect.x1, rect.x2);
  const right = Math.max(rect.x1, rect.x2);
  const top = Math.min(rect.y1, rect.y2);
  const bottom = Math.max(rect.y1, rect.y2);
  const contains = (point: Point) =>
    point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
  const segmentIntersects = (start: Point, end: Point) => {
    if (contains(start) || contains(end)) return true;
    const cross = (a: Point, b: Point, c: Point) =>
      (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    const intersects = (a: Point, b: Point, c: Point, d: Point) => {
      if (
        Math.max(a.x, b.x) < Math.min(c.x, d.x) ||
        Math.max(c.x, d.x) < Math.min(a.x, b.x) ||
        Math.max(a.y, b.y) < Math.min(c.y, d.y) ||
        Math.max(c.y, d.y) < Math.min(a.y, b.y)
      ) {
        return false;
      }
      const abC = cross(a, b, c);
      const abD = cross(a, b, d);
      const cdA = cross(c, d, a);
      const cdB = cross(c, d, b);
      return abC * abD <= 0 && cdA * cdB <= 0;
    };
    const corners = [
      { x: left, y: top },
      { x: right, y: top },
      { x: right, y: bottom },
      { x: left, y: bottom },
    ];
    return corners.some((corner, index) =>
      intersects(start, end, corner, corners[(index + 1) % corners.length]),
    );
  };
  const selections: Selection[] = doc.nodes
    .filter((node) => {
      const metrics = nodeMetrics(node);
      const nodeLeft = node.x - metrics.width / 2 - 7;
      const nodeRight = node.x + metrics.width / 2 + 7;
      const nodeTop = node.y - metrics.height / 2 - 6;
      const nodeBottom = node.y + metrics.height / 2 + 6;
      return !(
        nodeRight < left ||
        nodeLeft > right ||
        nodeBottom < top ||
        nodeTop > bottom
      );
    })
    .map((node) => ({ kind: 'node' as const, id: node.id }));
  for (const arrow of doc.arrows) {
    const geometry = getArrowGeometry(doc, arrow);
    const points = geometry
      ? Array.from({ length: 25 }, (_, index) =>
          quadraticPoint(
            geometry.start,
            geometry.control,
            geometry.end,
            index / 24,
          ),
        )
      : [];
    if (
      points.some(contains) ||
      points
        .slice(1)
        .some((point, index) => segmentIntersects(points[index], point))
    ) {
      selections.push({ kind: 'arrow', id: arrow.id });
    }
  }
  for (const cell of doc.cells) {
    const geometry = getCellGeometry(doc, cell);
    if (!geometry) continue;
    const points = Array.from({ length: 25 }, (_, index) =>
      quadraticPoint(
        geometry.start,
        geometry.control,
        geometry.end,
        index / 24,
      ),
    );
    if (
      points.some(contains) ||
      points
        .slice(1)
        .some((point, index) => segmentIntersects(points[index], point))
    ) {
      selections.push({ kind: 'cell', id: cell.id });
    }
  }
  return selections;
}

export function canPlaceNodes(
  doc: DiagramDocument,
  positions: Record<NodeId, Point>,
): boolean {
  const moving = new Set(Object.keys(positions));
  const occupied = new Set(
    doc.nodes
      .filter((node) => !moving.has(node.id))
      .map((node) => `${node.x}:${node.y}`),
  );
  const proposed = new Set<string>();
  for (const point of Object.values(positions)) {
    if (
      point.x < 40 ||
      point.x > SCENE_WIDTH - 40 ||
      point.y < 40 ||
      point.y > SCENE_HEIGHT - 40
    ) {
      return false;
    }
    const key = `${point.x}:${point.y}`;
    if (occupied.has(key) || proposed.has(key)) return false;
    proposed.add(key);
  }
  return true;
}

export function deleteSelections(
  doc: DiagramDocument,
  selections: Selection[],
): DiagramDocument {
  const nodeIds = new Set(
    selections.filter((item) => item.kind === 'node').map((item) => item.id),
  );
  const arrowIds = new Set(
    selections.filter((item) => item.kind === 'arrow').map((item) => item.id),
  );
  for (const arrow of doc.arrows) {
    if (nodeIds.has(arrow.source) || nodeIds.has(arrow.target)) {
      arrowIds.add(arrow.id);
    }
  }
  const cellIds = new Set(
    selections.filter((item) => item.kind === 'cell').map((item) => item.id),
  );
  for (const cell of doc.cells) {
    const source = cellSourceAnchor(cell);
    const target = cellTargetAnchor(cell);
    const paths = cellBoundaryPaths(cell);
    if (
      (source?.kind === 'node' && nodeIds.has(source.id)) ||
      (target?.kind === 'node' && nodeIds.has(target.id)) ||
      (source?.kind === 'arrow' && arrowIds.has(source.id)) ||
      (target?.kind === 'arrow' && arrowIds.has(target.id)) ||
      paths.source.some((id) => arrowIds.has(id)) ||
      paths.target.some((id) => arrowIds.has(id))
    ) {
      cellIds.add(cell.id);
    }
  }
  let grew = true;
  while (grew) {
    grew = false;
    for (const cell of doc.cells) {
      if (cellIds.has(cell.id)) continue;
      const source = cellSourceAnchor(cell);
      const target = cellTargetAnchor(cell);
      if (
        (source?.kind === 'cell' && cellIds.has(source.id)) ||
        (target?.kind === 'cell' && cellIds.has(target.id))
      ) {
        cellIds.add(cell.id);
        grew = true;
      }
    }
  }
  return {
    ...doc,
    nodes: doc.nodes.filter((node) => !nodeIds.has(node.id)),
    arrows: doc.arrows.filter((arrow) => !arrowIds.has(arrow.id)),
    cells: doc.cells.filter((cell) => !cellIds.has(cell.id)),
  };
}

export function deleteSelection(
  doc: DiagramDocument,
  selection: Selection,
): DiagramDocument {
  return deleteSelections(doc, [selection]);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function xml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function colorOrDefault(color: string, fallback: string): string {
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

export function diagramBounds(doc: DiagramDocument, padding = 42) {
  if (doc.nodes.length === 0) {
    return { x: 0, y: 0, width: 160, height: 120 };
  }
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const node of doc.nodes) {
    const { width: anchorWidth, height } = nodeMetrics(node);
    const labelWidth = nodeLabelWidth(node);
    minX = Math.min(minX, node.x - anchorWidth / 2);
    minY = Math.min(minY, node.y - height / 2);
    maxX = Math.max(maxX, node.x - anchorWidth / 2 + labelWidth);
    maxY = Math.max(maxY, node.y + height / 2);
  }
  for (const arrow of doc.arrows) {
    const geometry = getArrowGeometry(doc, arrow);
    if (!geometry) continue;
    for (const point of [geometry.start, geometry.control, geometry.end]) {
      minX = Math.min(minX, point.x - 30);
      minY = Math.min(minY, point.y - 30);
      maxX = Math.max(maxX, point.x + 30);
      maxY = Math.max(maxY, point.y + 30);
    }
  }
  for (const cell of doc.cells) {
    const geometry = getCellGeometry(doc, cell);
    if (!geometry) continue;
    for (const point of [geometry.start, geometry.control, geometry.end]) {
      minX = Math.min(minX, point.x - 30);
      minY = Math.min(minY, point.y - 30);
      maxX = Math.max(maxX, point.x + 30);
      maxY = Math.max(maxY, point.y + 30);
    }
  }
  return {
    x: Math.floor(minX - padding),
    y: Math.floor(minY - padding),
    width: Math.max(1, Math.ceil(maxX - minX + padding * 2)),
    height: Math.max(1, Math.ceil(maxY - minY + padding * 2)),
  };
}

function shiftedPath(geometry: ArrowGeometry, amount: number): string {
  const { normal } = geometry;
  const move = (point: Point) => ({
    x: point.x + normal.x * amount,
    y: point.y + normal.y * amount,
  });
  const start = move(geometry.start);
  const control = move(geometry.control);
  const end = move(geometry.end);
  return `M ${round(start.x)} ${round(start.y)} Q ${round(control.x)} ${round(control.y)} ${round(end.x)} ${round(end.y)}`;
}

export function generateSvg(
  doc: DiagramDocument,
  options: { background?: boolean; padding?: number } = {},
): string {
  const bounds = diagramBounds(doc, options.padding ?? 42);
  const prefix = 'xyq-export';
  const background = options.background
    ? `<rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" fill="#ffffff"/>`
    : '';
  const arrowMarkup = doc.arrows
    .map((arrow) => {
      const geometry = getArrowGeometry(doc, arrow);
      if (!geometry) return '';
      const color = colorOrDefault(arrow.color, '#1f2937');
      const dash =
        arrow.stroke === 'dashed'
          ? ' stroke-dasharray="11 7"'
          : arrow.stroke === 'dotted'
            ? ' stroke-dasharray="2 7.5" stroke-linecap="round"'
            : '';
      const marker =
        arrow.head === 'none'
          ? ''
          : ` marker-end="url(#${prefix}-${arrow.head})"`;
      const tail =
        arrow.tail === 'none'
          ? ''
          : ` marker-start="url(#${prefix}-${arrow.tail})"`;
      const common = `fill="none" stroke="${color}" stroke-width="2.2"${dash}`;
      const paths =
        arrow.stroke === 'double'
          ? `<path d="${shiftedPath(geometry, -2.6)}" ${common}${tail}/><path d="${shiftedPath(geometry, 2.6)}" ${common}${marker}/>`
          : `<path d="${geometry.path}" ${common}${tail}${marker}/>`;
      if (!arrow.label) return paths;
      const label = arrowLabelPoint(geometry, arrow, 23);
      return `${paths}<text x="${round(label.x)}" y="${round(label.y)}" text-anchor="middle" dominant-baseline="middle" font-family="Cambria Math, STIX Two Math, Times New Roman, serif" font-size="19" fill="${color}" stroke="#ffffff" stroke-width="5.5" paint-order="stroke fill">${xml(displayTex(arrow.label))}</text>`;
    })
    .join('');
  const cellMarkup = doc.cells
    .map((cell) => {
      const geometry = getCellGeometry(doc, cell);
      if (!geometry) return '';
      const color = '#1f2937';
      const offset = geometry.normal;
      const stroke = resolvedCellStroke(cell);
      const direction = resolvedCellHead(cell);
      const reverse = direction === 'reverse';
      const hasHead = direction !== 'none';
      const dash =
        stroke === 'dashed'
          ? ' stroke-dasharray="9 6"'
          : stroke === 'dotted'
            ? ' stroke-dasharray="1 6"'
            : '';
      const linecap = stroke === 'dotted' ? 'round' : 'butt';
      const tip = reverse ? geometry.start : geometry.end;
      const tipDirection = reverse
        ? { x: -geometry.startTangent.x, y: -geometry.startTangent.y }
        : geometry.endTangent;
      const tipNormal = { x: tipDirection.y, y: -tipDirection.x };
      const shaftTip = {
        x: tip.x - tipDirection.x * 8.5,
        y: tip.y - tipDirection.y * 8.5,
      };
      const wingA = {
        x: shaftTip.x + tipNormal.x * 5.8,
        y: shaftTip.y + tipNormal.y * 5.8,
      };
      const wingB = {
        x: shaftTip.x - tipNormal.x * 5.8,
        y: shaftTip.y - tipNormal.y * 5.8,
      };
      const line = (amount: number) => {
        const start = {
          x: geometry.start.x + offset.x * amount,
          y: geometry.start.y + offset.y * amount,
        };
        const control = {
          x: geometry.control.x + offset.x * amount,
          y: geometry.control.y + offset.y * amount,
        };
        const end = {
          x: geometry.end.x + offset.x * amount,
          y: geometry.end.y + offset.y * amount,
        };
        const x1 = reverse
          ? start.x + geometry.startTangent.x * (hasHead ? 8.5 : 0)
          : start.x;
        const y1 = reverse
          ? start.y + geometry.startTangent.y * (hasHead ? 8.5 : 0)
          : start.y;
        const x2 = reverse
          ? end.x
          : end.x - geometry.endTangent.x * (hasHead ? 8.5 : 0);
        const y2 = reverse
          ? end.y
          : end.y - geometry.endTangent.y * (hasHead ? 8.5 : 0);
        return `<path d="M ${round(x1)} ${round(y1)} Q ${round(control.x)} ${round(control.y)} ${round(x2)} ${round(y2)}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="${linecap}"${dash}/>`;
      };
      const head =
        direction === 'none' || stroke === 'none'
          ? ''
          : `<path d="M ${round(wingA.x)} ${round(wingA.y)} L ${round(tip.x)} ${round(tip.y)} L ${round(wingB.x)} ${round(wingB.y)}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
      const labelPoint = cellLabelPoint(
        geometry,
        resolvedCellLabelPosition(cell),
      );
      const shaft =
        stroke === 'none'
          ? ''
          : resolvedCellShaft(cell) === 'double'
            ? `${line(-2.8)}${line(2.8)}`
            : line(0);
      const label = cell.label
        ? `<text x="${round(labelPoint.x)}" y="${round(labelPoint.y)}" text-anchor="middle" dominant-baseline="middle" font-family="Cambria Math, STIX Two Math, Times New Roman, serif" font-size="19" fill="${color}" stroke="#ffffff" stroke-width="5.5" paint-order="stroke fill">${xml(displayTex(cell.label))}</text>`
        : '';
      return `${shaft}${head}${label}`;
    })
    .join('');
  const nodeMarkup = doc.nodes
    .filter((node) => !node.ghost)
    .map(
      (node) =>
        `<text x="${round(node.x - 9)}" y="${round(node.y)}" text-anchor="start" dominant-baseline="middle" font-family="Cambria Math, STIX Two Math, Times New Roman, serif" font-size="24" font-weight="500" fill="#111827" stroke="#ffffff" stroke-width="8" paint-order="stroke fill">${xml(displayTex(node.label))}</text>`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}" width="${bounds.width}" height="${bounds.height}" role="img"><title>${xml(doc.title || 'XyQuiver diagram')}</title><desc>Categorical diagram exported as editable vector paths and text by XyQuiver.</desc><defs><marker id="${prefix}-arrow" viewBox="-11 -6 11 12" refX="0" refY="0" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto" overflow="visible"><path d="M -10 -5.25 L 0 0 L -10 5.25" fill="none" stroke="#1f2937" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></marker><marker id="${prefix}-twohead" viewBox="-16 -7 16 14" refX="0" refY="0" markerWidth="17" markerHeight="13" markerUnits="userSpaceOnUse" orient="auto" overflow="visible"><path d="M -9 -5.5 L 0 0 L -9 5.5 M -15 -5.5 L -6 0 L -15 5.5" fill="none" stroke="#1f2937" stroke-width="1.9" stroke-linecap="round"/></marker><marker id="${prefix}-hook" viewBox="0 -8 13 16" refX="0" refY="0" markerWidth="13" markerHeight="16" markerUnits="userSpaceOnUse" orient="auto" overflow="visible"><path d="M 0 0 C 0 -7 8 -7 10 -2" fill="none" stroke="#1f2937" stroke-width="1.9" stroke-linecap="round"/></marker><marker id="${prefix}-mapsto" viewBox="0 -8 9 16" refX="1" refY="0" markerWidth="9" markerHeight="16" markerUnits="userSpaceOnUse" orient="auto" overflow="visible"><path d="M 1 -7 L 1 7" fill="none" stroke="#1f2937" stroke-width="1.9" stroke-linecap="round"/></marker></defs>${background}<g>${arrowMarkup}</g><g>${cellMarkup}</g><g>${nodeMarkup}</g></svg>`;
}

function safeTex(value: string): string {
  return normalizeMathTex(value)
    .replace(/[\r\n]/g, ' ')
    .trim();
}

function nativeNodeTex(value: string): string {
  const full = safeTex(value);
  if (!full) return '{}';
  // Native Xy-pic object syntax keeps the TeX reference point at the matrix
  // centre instead of centring the complete label. Together with @!0 this
  // makes the first glyph the grid anchor while the complete object remains
  // the arrow target; long labels neither stretch the grid nor split into
  // unrelated MathJax overlay boxes.
  return `*![r]{${full}}`;
}

function hopFor(
  source: DiagramNode,
  target: DiagramNode,
  xs: number[],
  ys: number[],
) {
  const sourceCol = xs.indexOf(source.x);
  const targetCol = xs.indexOf(target.x);
  const sourceRow = ys.indexOf(source.y);
  const targetRow = ys.indexOf(target.y);
  const vertical =
    targetRow > sourceRow
      ? 'd'.repeat(targetRow - sourceRow)
      : 'u'.repeat(sourceRow - targetRow);
  const horizontal =
    targetCol > sourceCol
      ? 'r'.repeat(targetCol - sourceCol)
      : 'l'.repeat(sourceCol - targetCol);
  return vertical + horizontal;
}

function arrowXyCommand(
  arrow: DiagramArrow,
  source: DiagramNode,
  target: DiagramNode,
  xs: number[],
  ys: number[],
  aliases: Array<{ name: string; t: number }> = [],
) {
  const hop = hopFor(source, target, xs, ys);
  const curve =
    Math.abs(arrow.curve) < 8
      ? ''
      : arrow.curve > 0
        ? `@/^${round((Math.abs(arrow.curve) / SNAP) * XY_CURVE_UNIT_PC)}pc/`
        : `@/_${round((Math.abs(arrow.curve) / SNAP) * XY_CURVE_UNIT_PC)}pc/`;
  const isDefaultStyle =
    arrow.stroke === 'solid' && arrow.head === 'arrow' && arrow.tail === 'none';
  const tail =
    arrow.tail === 'hook' ? '^{(}' : arrow.tail === 'mapsto' ? '|' : '';
  const body =
    arrow.stroke === 'dashed'
      ? '--'
      : arrow.stroke === 'dotted'
        ? '.'
        : arrow.stroke === 'double'
          ? '='
          : '-';
  const head =
    arrow.head === 'twohead' ? '>>' : arrow.head === 'arrow' ? '>' : '';
  const style = isDefaultStyle ? '' : `@{${tail}${body}${head}}`;
  const labelPosition = Math.min(
    0.95,
    Math.max(0.05, arrow.labelPosition ?? 0.5),
  );
  const labelPlace =
    Math.abs(labelPosition - 0.5) < 0.001 ? '' : `(${round(labelPosition)})`;
  const relativeLabel =
    arrow.label && !arrow.labelPlacement
      ? `${arrow.labelSide === 'left' ? '^' : '_'}${labelPlace}{${safeTex(arrow.label)}}`
      : '';
  const visible = `\\ar${curve}${style}[${hop}]${relativeLabel}`;
  const absoluteLabel =
    arrow.label && arrow.labelPlacement
      ? `\\ar${curve}@{}[${hop}]|${labelPlace || '(.5)'}*+${xyLabelOffset(arrow.labelPlacement)}{${safeTex(arrow.label)}}`
      : '';
  // A | break placed on the visible arrow can erase a stretch of its shaft.
  // Name 2-cell attachment points on an invisible companion arrow instead.
  const namedAnchors = aliases
    .map(({ name, t }) => `\\ar${curve}@{}[${hop}]|(${round(t)})*{}="${name}"`)
    .join(' ');
  return [visible, absoluteLabel, namedAnchors].filter(Boolean).join(' ');
}

function xyLabelOffset(position: CellLabelPosition): string {
  return position === 'top'
    ? '<0pt,-1.2em>'
    : position === 'bottom'
      ? '<0pt,1.2em>'
      : position === 'left'
        ? '<-1.2em,0pt>'
        : '<1.2em,0pt>';
}

function cellXyLabel(cell: DiagramTwoCell): string {
  if (!cell.label) return '';
  const offset = xyLabelOffset(resolvedCellLabelPosition(cell));
  // Put the label on an invisible companion path. The visible shaft remains
  // continuous, while the absolute offset mirrors the editor's four-way
  // placement instead of depending on the arrow's direction.
  return `|(.5)*+${offset}{${safeTex(cell.label)}}`;
}

function cellXyInlineLabel(cell: DiagramTwoCell): string {
  if (!cell.label) return '';
  const position = resolvedCellLabelPosition(cell);
  const side = position === 'bottom' ? '_' : '^';
  const t = position === 'left' ? 0.2 : position === 'right' ? 0.8 : 0.5;
  return `${side}(${t}){${safeTex(cell.label)}}`;
}

export function generateXyPic(
  doc: DiagramDocument,
  mode: 'typora' | 'snippet' | 'latex' = 'typora',
): ExportResult {
  const warnings: string[] = [];
  const wrap = (core: string): ExportResult => {
    if (mode === 'snippet') return { text: core, warnings };
    if (mode === 'latex') {
      return {
        text: `\\documentclass{standalone}\n\\usepackage[all,2cell]{xy}\n\\begin{document}\n${core}\n\\end{document}`,
        warnings,
      };
    }
    return { text: `$$\n${core}\n$$`, warnings };
  };
  if (doc.nodes.length === 0) {
    const empty = '\\begin{xy}\\xymatrix{ {} }\\end{xy}';
    return wrap(empty);
  }
  const axes = exportMatrixAxes(doc);
  const xs = axes.columns;
  const ys = axes.rows;
  const commands = new Map<NodeId, string[]>();
  const consumedArrows = new Set<ArrowId>();
  let nativeCellCount = 0;
  const cellsUsedAsAnchors = new Set(
    doc.cells.flatMap((cell) => {
      const source = cellSourceAnchor(cell);
      const target = cellTargetAnchor(cell);
      return [source, target].flatMap((anchor) =>
        anchor?.kind === 'cell' ? [anchor.id] : [],
      );
    }),
  );
  // XyJax renders \ar@{=>} natively, while its \xtwocell bootstrap macro is
  // not consistently available and can leak red TeX text into exported SVGs.
  // Use the same explicit double-arrow primitive for every attached arrow.
  const nativeCellIds = new Set<CellId>();

  for (const cell of doc.cells) {
    const sourceAnchor = cellSourceAnchor(cell);
    const targetAnchor = cellTargetAnchor(cell);
    if (!sourceAnchor || !targetAnchor) {
      warnings.push(
        `2-cell ${cell.label || cell.id} has a missing attachment.`,
      );
      continue;
    }
    if (!nativeCellIds.has(cell.id)) continue;
    const sourceArrow = doc.arrows.find(
      (arrow) => arrow.id === sourceAnchor.id,
    );
    const targetArrow = doc.arrows.find(
      (arrow) => arrow.id === targetAnchor.id,
    );
    if (!sourceArrow || !targetArrow) continue;
    const sourceNode = doc.nodes.find((node) => node.id === sourceArrow.source);
    const targetNode = doc.nodes.find((node) => node.id === sourceArrow.target);
    if (!sourceNode || !targetNode) continue;
    if (
      sourceArrow.stroke !== 'solid' ||
      targetArrow.stroke !== 'solid' ||
      sourceArrow.head !== 'arrow' ||
      targetArrow.head !== 'arrow'
    ) {
      warnings.push(
        `2-cell ${cell.label || cell.id} uses styled boundary arrows; XyJax may simplify them.`,
      );
    }
    const sourceGeometry = getArrowGeometry(doc, sourceArrow);
    const targetGeometry = getArrowGeometry(doc, targetArrow);
    const sourceIsUpper =
      sourceGeometry && targetGeometry
        ? sourceGeometry.midpoint.y <= targetGeometry.midpoint.y
        : sourceArrow.curve >= targetArrow.curve;
    const upper = sourceIsUpper ? sourceArrow : targetArrow;
    const lower = sourceIsUpper ? targetArrow : sourceArrow;
    const label = safeTex(cell.label);
    const stroke = resolvedCellStroke(cell);
    const direction = resolvedCellHead(cell);
    if (stroke === 'dashed' || stroke === 'dotted') {
      warnings.push(
        `Native 2-cell ${cell.label || cell.id} uses a ${stroke} body; \\xtwocell exports it as solid.`,
      );
    }
    if (Math.abs(cell.curve ?? 0) >= 1) {
      warnings.push(
        `Native 2-cell ${cell.label || cell.id} has editor curvature; \\xtwocell keeps its native straight body.`,
      );
    }
    const orientation =
      stroke === 'none'
        ? `\\omit ${label}`
        : direction === 'none'
          ? `=${label}`
          : (direction === 'reverse' ? !sourceIsUpper : sourceIsUpper)
            ? label
            : `^${label}`;
    const hop = hopFor(sourceNode, targetNode, xs, ys);
    const command = `\\xtwocell[${hop}]{}^{${safeTex(upper.label)}}_{${safeTex(lower.label)}}{${orientation}}`;
    commands.set(sourceNode.id, [
      ...(commands.get(sourceNode.id) ?? []),
      command,
    ]);
    consumedArrows.add(sourceArrow.id);
    consumedArrows.add(targetArrow.id);
    nativeCellCount += 1;
  }

  const arrowAnchorAliases = new Map<
    ArrowId,
    Map<string, { name: string; t: number }>
  >();
  const cellAnchorAliases = new Map<CellId, string>();
  let arrowAnchorIndex = 0;
  const resolveAnchorAlias = (anchor: CellAnchor): string | null => {
    if (anchor.kind === 'node') {
      const node = doc.nodes.find((item) => item.id === anchor.id);
      if (!node) return null;
      const row = ys.indexOf(node.y);
      const column = xs.indexOf(node.x);
      return row >= 0 && column >= 0 ? `${row + 1},${column + 1}` : null;
    }
    if (anchor.kind === 'cell') return cellAnchorAliases.get(anchor.id) ?? null;
    const arrow = doc.arrows.find((item) => item.id === anchor.id);
    if (
      !arrow ||
      arrow.source === arrow.target ||
      consumedArrows.has(arrow.id) ||
      !doc.nodes.some((node) => node.id === arrow.source) ||
      !doc.nodes.some((node) => node.id === arrow.target)
    ) {
      return null;
    }
    const t = Math.min(0.9, Math.max(0.1, anchor.t ?? 0.5));
    const key = `${round(t)}`;
    let aliases = arrowAnchorAliases.get(arrow.id);
    if (!aliases) {
      aliases = new Map();
      arrowAnchorAliases.set(arrow.id, aliases);
    }
    const existing = aliases.get(key);
    if (existing) return existing.name;
    const entry = { name: `xyq-a${++arrowAnchorIndex}`, t };
    aliases.set(key, entry);
    return entry.name;
  };

  const generalCellCommands: string[] = [];
  let cellAnchorIndex = 0;
  const pendingCells = doc.cells.filter((cell) => !nativeCellIds.has(cell.id));
  while (pendingCells.length > 0) {
    const readyIndex = pendingCells.findIndex((cell) => {
      const source = cellSourceAnchor(cell);
      const target = cellTargetAnchor(cell);
      return Boolean(
        source &&
        target &&
        (source.kind !== 'cell' || cellAnchorAliases.has(source.id)) &&
        (target.kind !== 'cell' || cellAnchorAliases.has(target.id)),
      );
    });
    if (readyIndex < 0) {
      for (const cell of pendingCells) {
        warnings.push(
          `Higher arrow ${cell.label || cell.id} has a cyclic or missing arrow attachment and was omitted.`,
        );
      }
      break;
    }
    const [cell] = pendingCells.splice(readyIndex, 1);
    const sourceAnchor = cellSourceAnchor(cell);
    const targetAnchor = cellTargetAnchor(cell);
    if (!sourceAnchor || !targetAnchor) continue;
    const paths = cellBoundaryPaths(cell);
    if (
      [...paths.source, ...paths.target].some(
        (id) => !doc.arrows.some((arrow) => arrow.id === id),
      )
    ) {
      warnings.push(
        `Higher arrow ${cell.label || cell.id} has a missing boundary path and was omitted.`,
      );
      continue;
    }
    const sourceAlias = resolveAnchorAlias(sourceAnchor);
    const targetAlias = resolveAnchorAlias(targetAnchor);
    if (!sourceAlias || !targetAlias) {
      warnings.push(
        `Higher arrow ${cell.label || cell.id} could not name one of its Xy-pic path anchors and was omitted.`,
      );
      continue;
    }
    const stroke = resolvedCellStroke(cell);
    const direction = resolvedCellHead(cell);
    const shaft = resolvedCellShaft(cell);
    const style =
      stroke === 'none'
        ? '@{}'
        : stroke === 'solid'
          ? shaft === 'double'
            ? direction === 'reverse'
              ? '@{<=}'
              : direction === 'none'
                ? '@{=}'
                : '@{=>}'
            : direction === 'reverse'
              ? '@{<-}'
              : direction === 'none'
                ? '@{-}'
                : '@{->}'
          : direction === 'reverse'
            ? stroke === 'dashed'
              ? '@{<--}'
              : '@{<.}'
            : direction === 'none'
              ? stroke === 'dashed'
                ? '@{--}'
                : '@{.}'
              : stroke === 'dashed'
                ? '@{-->}'
                : '@{.>}';
    if (stroke === 'dashed' || stroke === 'dotted') {
      warnings.push(
        `Higher arrow ${cell.label || cell.id} uses Xy-pic's nearest ${stroke} shaft glyph.`,
      );
    }
    const usesCellAnchor =
      sourceAnchor.kind === 'cell' || targetAnchor.kind === 'cell';
    const label = usesCellAnchor ? cellXyInlineLabel(cell) : cellXyLabel(cell);
    const curve =
      Math.abs(cell.curve ?? 0) < 1
        ? ''
        : (cell.curve ?? 0) > 0
          ? `@/^${round((Math.abs(cell.curve ?? 0) / SNAP) * XY_CURVE_UNIT_PC)}pc/`
          : `@/_${round((Math.abs(cell.curve ?? 0) / SNAP) * XY_CURVE_UNIT_PC)}pc/`;
    generalCellCommands.push(
      `\\POS "${sourceAlias}" \\ar${curve}${style} "${targetAlias}"${usesCellAnchor ? label : ''}`,
    );
    if (label && !usesCellAnchor) {
      generalCellCommands.push(
        `\\POS "${sourceAlias}" \\ar${curve}@{} "${targetAlias}"${label}`,
      );
    }
    if (cellsUsedAsAnchors.has(cell.id)) {
      const alias = `xyq-c${++cellAnchorIndex}`;
      cellAnchorAliases.set(cell.id, alias);
      generalCellCommands.push(
        `\\POS "${sourceAlias}" \\ar${curve}@{} "${targetAlias}"|(.5)*{}="${alias}"`,
      );
    }
  }

  for (const arrow of doc.arrows) {
    if (consumedArrows.has(arrow.id)) continue;
    const source = doc.nodes.find((node) => node.id === arrow.source);
    const target = doc.nodes.find((node) => node.id === arrow.target);
    if (!source || !target) continue;
    if (source.id === target.id) {
      warnings.push(
        `Loop ${arrow.label || arrow.id} needs low-level XY and was omitted.`,
      );
      continue;
    }
    const aliases = [...(arrowAnchorAliases.get(arrow.id)?.values() ?? [])];
    const command = arrowXyCommand(arrow, source, target, xs, ys, aliases);
    commands.set(source.id, [...(commands.get(source.id) ?? []), command]);
  }

  const rows = ys.map((y) =>
    xs
      .map((x) => {
        const node = doc.nodes.find(
          (candidate) => candidate.x === x && candidate.y === y,
        );
        if (!node) return '{}';
        const label = node.ghost ? '{}' : nativeNodeTex(node.label);
        return [label, ...(commands.get(node.id) ?? [])]
          .filter(Boolean)
          .join(' ');
      })
      .join(' & '),
  );
  const initializer = nativeCellCount > 0 ? '\\UseAllTwocells\n' : '';
  const trailing =
    generalCellCommands.length > 0 ? `\n${generalCellCommands.join('\n')}` : '';
  // Xy-pic row/column spacing is typographic. It must not be inferred from
  // browser pixels; doing so makes Typora arrows huge compared with glyphs.
  const columnSpacing = XY_COLUMN_GRID_UNIT_PC;
  const rowSpacing = XY_ROW_GRID_UNIT_PC;
  const core = `\\begin{xy}\n${initializer}\\xymatrix @!0 @C=${columnSpacing}pc @R=${rowSpacing}pc {\n  ${rows.join(' \\\\\n  ')}\n}${trailing}\n\\end{xy}`;
  return wrap(core);
}

function node(
  id: string,
  label: string,
  x: number,
  y: number,
  ghost = false,
): DiagramNode {
  return { id, label, x, y, ghost };
}

function arrow(
  id: string,
  source: string,
  target: string,
  label: string,
  curve = 0,
  overrides: Partial<DiagramArrow> = {},
): DiagramArrow {
  return {
    id,
    source,
    target,
    label,
    curve,
    labelSide: 'left',
    stroke: 'solid',
    head: 'arrow',
    tail: 'none',
    color: '#273244',
    ...overrides,
  };
}

export const exampleDocuments: Record<string, DiagramDocument> = {
  quasicategory: {
    format: 'xyquiver',
    version: 2,
    title: 'Quasi-category composition 2-simplex',
    grid: {
      columns: [...DEFAULT_MATRIX_GRID.columns],
      rows: [...DEFAULT_MATRIX_GRID.rows],
    },
    nodes: [
      node('q-x0', 'x_0', 80, 440),
      node('q-x1', 'x_1', 480, 80),
      node('q-x2', 'x_2', 880, 440),
    ],
    arrows: [
      arrow('q-f', 'q-x0', 'q-x1', 'f', 0),
      arrow('q-g', 'q-x1', 'q-x2', 'g', 0),
      arrow('q-h', 'q-x0', 'q-x2', 'h', 0, { labelSide: 'right' }),
    ],
    cells: [
      {
        id: 'q-alpha',
        sourceAnchor: { kind: 'node', id: 'q-x1' },
        targetAnchor: { kind: 'arrow', id: 'q-h', t: 0.5 },
        sourcePath: ['q-f', 'q-g'],
        targetPath: ['q-h'],
        label: '\\alpha',
        color: '#273244',
        head: 'arrow',
      },
    ],
  },
  showcase: {
    format: 'xyquiver',
    version: 2,
    title: 'Pasting of attached arrows',
    grid: {
      columns: [...DEFAULT_MATRIX_GRID.columns],
      rows: [...DEFAULT_MATRIX_GRID.rows],
    },
    nodes: [
      node('p-c', '\\mathcal{C}', 80, 440),
      node('p-d', '\\mathcal{D}', 480, 80),
      node('p-e', '\\mathcal{E}', 880, 440),
    ],
    arrows: [
      arrow('p-f', 'p-c', 'p-d', 'F', 96),
      arrow('p-fp', 'p-c', 'p-d', "F'", -96, { labelSide: 'right' }),
      arrow('p-g', 'p-d', 'p-e', 'G', 96),
      arrow('p-gp', 'p-d', 'p-e', "G'", -96, { labelSide: 'right' }),
      arrow('p-gf', 'p-c', 'p-e', 'G\\circ F', -40),
      arrow('p-gpfp', 'p-c', 'p-e', "G'\\circ F'", -190, {
        labelSide: 'right',
      }),
    ],
    cells: [
      {
        id: 'p-alpha',
        sourceArrow: 'p-f',
        targetArrow: 'p-fp',
        label: '\\alpha',
        color: '#273244',
      },
      {
        id: 'p-beta',
        sourceArrow: 'p-g',
        targetArrow: 'p-gp',
        label: '\\beta',
        color: '#273244',
      },
      {
        id: 'p-paste',
        sourceArrow: 'p-gf',
        targetArrow: 'p-gpfp',
        label: '\\beta\\ast\\alpha',
        color: '#273244',
      },
    ],
  },
  twocell: {
    format: 'xyquiver',
    version: 2,
    title: 'Parallel double arrow',
    grid: { columns: [200, 400, 600, 800], rows: [160, 320, 480] },
    nodes: [
      node('n-a', '\\mathcal{C}', 200, 320),
      node('n-b', '\\mathcal{D}', 800, 320),
    ],
    arrows: [
      arrow('a-f', 'n-a', 'n-b', 'F', 72),
      arrow('a-g', 'n-a', 'n-b', 'G', -72, { labelSide: 'right' }),
    ],
    cells: [
      {
        id: 'c-alpha',
        sourceArrow: 'a-f',
        targetArrow: 'a-g',
        label: '\\alpha',
        color: '#273244',
      },
    ],
  },
  parallel: {
    format: 'xyquiver',
    version: 2,
    title: 'Parallel deformation arrows',
    grid: {
      columns: [160, 320, 440, 560, 720, 880],
      rows: [120, 320, 520],
    },
    nodes: [
      node('n-c', 'C', 320, 320),
      node('n-cp', "C'_i=C+d\\rho_2=C+d\\rho'_2", 560, 320),
    ],
    arrows: [
      arrow('a-rho2', 'n-c', 'n-cp', '\\rho_2', 180),
      arrow('a-rho1', 'n-cp', 'n-c', '\\rho_1', -82, {
        labelPosition: 0.25,
        labelSide: 'left',
      }),
      arrow('a-rho1p', 'n-cp', 'n-c', "\\rho'_1", 82, {
        labelPosition: 0.75,
        labelSide: 'right',
      }),
      arrow(
        'a-rho2p',
        'n-c',
        'n-cp',
        "\\substack{\\rho'_2=\\rho_2+d\\rho_1\\\\=\\rho_2+d\\rho'_1}",
        -180,
        { labelSide: 'right' },
      ),
    ],
    cells: [
      {
        id: 'c-rho-upper',
        sourceArrow: 'a-rho1',
        targetArrow: 'a-rho1p',
        label: '',
        color: '#273244',
        curve: -70,
      },
      {
        id: 'c-rho-lower',
        sourceArrow: 'a-rho1',
        targetArrow: 'a-rho1p',
        label: '',
        color: '#273244',
        curve: 70,
      },
      {
        id: 'c-rho-three',
        sourceAnchor: { kind: 'cell', id: 'c-rho-upper' },
        targetAnchor: { kind: 'cell', id: 'c-rho-lower' },
        sourcePath: [],
        targetPath: [],
        label: '\\rho_0',
        color: '#273244',
        head: 'reverse',
      },
    ],
  },
  homotopy: {
    format: 'xyquiver',
    version: 2,
    title: 'Homotopy stabilization',
    grid: {
      columns: [280, 360, 480, 600, 680],
      rows: [160, 240, 320, 400, 440],
    },
    nodes: [
      node('n-xl', 'X', 280, 160),
      node('n-xr', 'X', 680, 160),
      node('n-bp', 'B^{p+1}(\\mathbb{R}/\\hbar\\mathbb{Z})_{conn}', 480, 320),
      node('n-omega', '\\Omega^{p+2}_{cl}', 480, 440),
    ],
    arrows: [
      arrow(
        'a-auto',
        'n-xl',
        'n-xr',
        '\\overset{\\mathrm{automorphism}}{\\simeq}',
        0,
      ),
      arrow('a-left-b', 'n-xl', 'n-bp', '\\nabla', 0),
      arrow('a-right-b', 'n-xr', 'n-bp', '\\nabla', 0, { labelSide: 'right' }),
      arrow('a-left-o', 'n-xl', 'n-omega', 'F', -90),
      arrow('a-right-o', 'n-xr', 'n-omega', 'F', 90, { labelSide: 'right' }),
      arrow('a-curv', 'n-bp', 'n-omega', '\\mathrm{curv}', 0, {
        labelSide: 'right',
      }),
    ],
    cells: [
      {
        id: 'c-stab',
        sourceAnchor: { kind: 'arrow', id: 'a-auto', t: 0.64 },
        targetAnchor: { kind: 'node', id: 'n-bp' },
        sourcePath: [],
        targetPath: [],
        label:
          '\\substack{\\scriptscriptstyle\\mathrm{homotopy}\\\\\\scriptscriptstyle\\mathrm{stabilization}}',
        color: '#273244',
        head: 'arrow',
        stroke: 'solid',
      },
    ],
  },
  snake: {
    format: 'xyquiver',
    version: 2,
    title: 'Snake lemma',
    grid: {
      columns: [80, 280, 480, 680, 880],
      rows: [40, 160, 280, 400, 520, 600],
    },
    nodes: [
      node('s-top-f', '0', 280, 40),
      node('s-top-g', '0', 480, 40),
      node('s-top-h', '0', 680, 40),
      node('s-ker0', '0', 80, 160),
      node('s-ker-f', '\\ker f', 280, 160),
      node('s-ker-g', '\\ker g', 480, 160),
      node('s-ker-h', '\\ker h', 680, 160),
      node('s-a0', '0', 80, 280),
      node('s-a1', "A'", 280, 280),
      node('s-a', 'A', 480, 280),
      node('s-a2', "A''", 680, 280),
      node('s-a3', '0', 880, 280),
      node('s-b0', '0', 80, 400),
      node('s-b1', "B'", 280, 400),
      node('s-b', 'B', 480, 400),
      node('s-b2', "B''", 680, 400),
      node('s-b3', '0', 880, 400),
      node('s-coker-f', '\\operatorname{coker} f', 280, 520),
      node('s-coker-g', '\\operatorname{coker} g', 480, 520),
      node('s-coker-h', '\\operatorname{coker} h', 680, 520),
      node('s-coker0', '0', 880, 520),
      node('s-bottom-f', '0', 280, 600),
      node('s-bottom-g', '0', 480, 600),
      node('s-bottom-h', '0', 680, 600),
    ],
    arrows: [
      arrow('s-top-f-ker', 's-top-f', 's-ker-f', ''),
      arrow('s-top-g-ker', 's-top-g', 's-ker-g', ''),
      arrow('s-top-h-ker', 's-top-h', 's-ker-h', ''),
      arrow('s-ker0-f', 's-ker0', 's-ker-f', ''),
      arrow('s-ker-f-g', 's-ker-f', 's-ker-g', ''),
      arrow('s-ker-g-h', 's-ker-g', 's-ker-h', ''),
      arrow('s-ker-f-a1', 's-ker-f', 's-a1', ''),
      arrow('s-ker-g-a', 's-ker-g', 's-a', ''),
      arrow('s-ker-h-a2', 's-ker-h', 's-a2', ''),
      arrow('s-a0-a1', 's-a0', 's-a1', ''),
      arrow('s-a1-a', 's-a1', 's-a', 'i'),
      arrow('s-a-a2', 's-a', 's-a2', 'p'),
      arrow('s-a2-a3', 's-a2', 's-a3', ''),
      arrow('s-a1-b1', 's-a1', 's-b1', 'f', 0, {
        labelSide: 'right',
      }),
      arrow('s-a-b', 's-a', 's-b', 'g', 0, { labelSide: 'right' }),
      arrow('s-a2-b2', 's-a2', 's-b2', 'h', 0, {
        labelSide: 'right',
      }),
      arrow('s-b0-b1', 's-b0', 's-b1', ''),
      arrow('s-b1-b', 's-b1', 's-b', "i'"),
      arrow('s-b-b2', 's-b', 's-b2', "p'"),
      arrow('s-b2-b3', 's-b2', 's-b3', ''),
      arrow('s-b1-coker-f', 's-b1', 's-coker-f', ''),
      arrow('s-b-coker-g', 's-b', 's-coker-g', ''),
      arrow('s-b2-coker-h', 's-b2', 's-coker-h', ''),
      arrow('s-coker-f-g', 's-coker-f', 's-coker-g', ''),
      arrow('s-coker-g-h', 's-coker-g', 's-coker-h', ''),
      arrow('s-coker-h-0', 's-coker-h', 's-coker0', ''),
      arrow('s-coker-f-bottom', 's-coker-f', 's-bottom-f', ''),
      arrow('s-coker-g-bottom', 's-coker-g', 's-bottom-g', ''),
      arrow('s-coker-h-bottom', 's-coker-h', 's-bottom-h', ''),
      arrow('s-delta', 's-ker-h', 's-coker-f', '\\delta', 180),
    ],
    cells: [],
  },
  blank: {
    format: 'xyquiver',
    version: 2,
    title: 'Untitled diagram',
    grid: {
      columns: [...DEFAULT_MATRIX_GRID.columns],
      rows: [...DEFAULT_MATRIX_GRID.rows],
    },
    nodes: [],
    arrows: [],
    cells: [],
  },
};

export function cloneDocument(doc: DiagramDocument): DiagramDocument {
  return JSON.parse(JSON.stringify(doc)) as DiagramDocument;
}

/**
 * The first public homotopy-stabilization example used a very wide 20×12-cell
 * frame. Keep saved copies of that built-in diagram in sync with the compact,
 * square-step layout without touching unrelated user diagrams.
 */
export function migrateLegacyHomotopyLayout(
  document: DiagramDocument,
): DiagramDocument {
  const expectedNodeIds = ['n-xl', 'n-xr', 'n-bp', 'n-omega'];
  const isBuiltInHomotopy =
    document.title === 'Homotopy stabilization' &&
    document.nodes.length === expectedNodeIds.length &&
    document.arrows.length === 6 &&
    document.cells.length === 1 &&
    expectedNodeIds.every((id) =>
      document.nodes.some((candidate) => candidate.id === id),
    );
  if (!isBuiltInHomotopy) return document;

  const compact = exampleDocuments.homotopy;
  const positions = new Map(
    compact.nodes.map((node) => [node.id, { x: node.x, y: node.y }]),
  );
  const migrated = cloneDocument(document);
  migrated.nodes = migrated.nodes.map((node) => ({
    ...node,
    ...positions.get(node.id),
  }));
  migrated.grid = compact.grid
    ? {
        columns: [...compact.grid.columns],
        rows: [...compact.grid.rows],
      }
    : undefined;
  return migrated;
}

export function validateDocument(value: unknown): DiagramDocument | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  if (
    candidate.format !== 'xyquiver' ||
    (candidate.version !== 1 && candidate.version !== 2) ||
    typeof candidate.title !== 'string' ||
    !Array.isArray(candidate.nodes) ||
    !Array.isArray(candidate.arrows) ||
    !Array.isArray(candidate.cells)
  ) {
    return null;
  }

  const asRecord = (item: unknown): Record<string, unknown> | null =>
    item !== null && typeof item === 'object'
      ? (item as Record<string, unknown>)
      : null;

  const nodes: DiagramNode[] = [];
  for (const rawNode of candidate.nodes) {
    const item = asRecord(rawNode);
    if (
      !item ||
      typeof item.id !== 'string' ||
      typeof item.label !== 'string' ||
      !Number.isFinite(item.x) ||
      !Number.isFinite(item.y) ||
      (item.ghost !== undefined && typeof item.ghost !== 'boolean')
    ) {
      return null;
    }
    nodes.push({
      id: item.id,
      label: item.label,
      x: item.x as number,
      y: item.y as number,
      ...(item.ghost === true ? { ghost: true } : {}),
    });
  }

  const arrows: DiagramArrow[] = [];
  for (const rawArrow of candidate.arrows) {
    const item = asRecord(rawArrow);
    if (
      !item ||
      typeof item.id !== 'string' ||
      typeof item.source !== 'string' ||
      typeof item.target !== 'string' ||
      typeof item.label !== 'string' ||
      !Number.isFinite(item.curve) ||
      (item.labelPosition !== undefined &&
        (!Number.isFinite(item.labelPosition) ||
          (item.labelPosition as number) < 0.05 ||
          (item.labelPosition as number) > 0.95)) ||
      !['left', 'right'].includes(item.labelSide as string) ||
      (item.labelPlacement !== undefined &&
        !['top', 'bottom', 'left', 'right'].includes(
          item.labelPlacement as string,
        )) ||
      !['solid', 'dashed', 'dotted', 'double'].includes(
        item.stroke as string,
      ) ||
      !['arrow', 'twohead', 'none'].includes(item.head as string) ||
      !['none', 'hook', 'mapsto'].includes(item.tail as string) ||
      typeof item.color !== 'string'
    ) {
      return null;
    }
    arrows.push({
      id: item.id,
      source: item.source,
      target: item.target,
      label: item.label,
      curve: item.curve as number,
      labelSide: item.labelSide as LabelSide,
      ...(item.labelPlacement === undefined
        ? {}
        : { labelPlacement: item.labelPlacement as CellLabelPosition }),
      ...(item.labelPosition === undefined
        ? {}
        : { labelPosition: item.labelPosition as number }),
      stroke: item.stroke as ArrowStroke,
      head: item.head as ArrowHead,
      tail: item.tail as ArrowTail,
      color: item.color,
    });
  }

  const invalidAnchor = Symbol('invalid-anchor');
  const parseAnchor = (
    rawAnchor: unknown,
  ): CellAnchor | undefined | typeof invalidAnchor => {
    if (rawAnchor === undefined) return undefined;
    const anchor = asRecord(rawAnchor);
    if (
      !anchor ||
      !['node', 'arrow', 'cell'].includes(anchor.kind as string) ||
      typeof anchor.id !== 'string'
    ) {
      return invalidAnchor;
    }
    if (anchor.kind === 'node') return { kind: 'node', id: anchor.id };
    if (anchor.kind === 'cell') return { kind: 'cell', id: anchor.id };
    if (
      anchor.t !== undefined &&
      (!Number.isFinite(anchor.t) ||
        (anchor.t as number) < 0.1 ||
        (anchor.t as number) > 0.9)
    ) {
      return invalidAnchor;
    }
    return {
      kind: 'arrow',
      id: anchor.id,
      ...(anchor.t === undefined ? {} : { t: anchor.t as number }),
    };
  };
  const invalidPath = Symbol('invalid-path');
  const parsePath = (
    rawPath: unknown,
  ): ArrowId[] | undefined | typeof invalidPath => {
    if (rawPath === undefined) return undefined;
    if (
      !Array.isArray(rawPath) ||
      !rawPath.every((id) => typeof id === 'string')
    ) {
      return invalidPath;
    }
    return [...rawPath] as ArrowId[];
  };

  const cells: DiagramTwoCell[] = [];
  for (const rawCell of candidate.cells) {
    const item = asRecord(rawCell);
    if (
      !item ||
      typeof item.id !== 'string' ||
      typeof item.label !== 'string' ||
      typeof item.color !== 'string' ||
      (item.level !== undefined && item.level !== 2 && item.level !== 3) ||
      (item.labelPosition !== undefined &&
        !['top', 'bottom', 'left', 'right'].includes(
          item.labelPosition as string,
        )) ||
      (item.shaft !== undefined &&
        !['single', 'double'].includes(item.shaft as string)) ||
      (item.sourceArrow !== undefined &&
        typeof item.sourceArrow !== 'string') ||
      (item.targetArrow !== undefined &&
        typeof item.targetArrow !== 'string') ||
      (item.head !== undefined &&
        !['arrow', 'reverse', 'equality', 'none'].includes(
          item.head as string,
        )) ||
      (item.curve !== undefined &&
        (!Number.isFinite(item.curve) ||
          Math.abs(item.curve as number) > 220)) ||
      (item.stroke !== undefined &&
        !['solid', 'dashed', 'dotted', 'none'].includes(item.stroke as string))
    ) {
      return null;
    }
    const parsedSource = parseAnchor(item.sourceAnchor);
    const parsedTarget = parseAnchor(item.targetAnchor);
    const parsedSourcePath = parsePath(item.sourcePath);
    const parsedTargetPath = parsePath(item.targetPath);
    if (
      parsedSource === invalidAnchor ||
      parsedTarget === invalidAnchor ||
      parsedSourcePath === invalidPath ||
      parsedTargetPath === invalidPath
    ) {
      return null;
    }
    const sourceArrow = item.sourceArrow as ArrowId | undefined;
    const targetArrow = item.targetArrow as ArrowId | undefined;
    if (
      (sourceArrow &&
        parsedSource &&
        (parsedSource.kind !== 'arrow' || parsedSource.id !== sourceArrow)) ||
      (targetArrow &&
        parsedTarget &&
        (parsedTarget.kind !== 'arrow' || parsedTarget.id !== targetArrow))
    ) {
      return null;
    }
    const sourceAnchor =
      parsedSource ??
      (sourceArrow
        ? ({ kind: 'arrow', id: sourceArrow, t: 0.5 } as const)
        : undefined);
    const targetAnchor =
      parsedTarget ??
      (targetArrow
        ? ({ kind: 'arrow', id: targetArrow, t: 0.5 } as const)
        : undefined);
    if (!sourceAnchor || !targetAnchor) return null;
    const sourcePath =
      parsedSourcePath ??
      (sourceArrow
        ? [sourceArrow]
        : sourceAnchor.kind === 'arrow'
          ? [sourceAnchor.id]
          : []);
    const targetPath =
      parsedTargetPath ??
      (targetArrow
        ? [targetArrow]
        : targetAnchor.kind === 'arrow'
          ? [targetAnchor.id]
          : []);
    cells.push({
      id: item.id,
      ...(sourceArrow ? { sourceArrow } : {}),
      ...(targetArrow ? { targetArrow } : {}),
      sourceAnchor,
      targetAnchor,
      sourcePath,
      targetPath,
      label: item.label,
      labelPosition:
        (item.labelPosition as CellLabelPosition | undefined) ?? 'top',
      shaft: (item.shaft as CellShaft | undefined) ?? 'double',
      color: item.color,
      ...(item.curve === undefined ? {} : { curve: item.curve as number }),
      head: (item.head as CellHead | undefined) ?? 'arrow',
      ...(item.stroke === undefined
        ? {}
        : { stroke: item.stroke as CellStroke }),
    });
  }

  let grid: DiagramGrid | undefined;
  if (candidate.grid !== undefined) {
    const rawGrid = asRecord(candidate.grid);
    if (
      !rawGrid ||
      !Array.isArray(rawGrid.columns) ||
      rawGrid.columns.length === 0 ||
      !rawGrid.columns.every(Number.isFinite) ||
      !Array.isArray(rawGrid.rows) ||
      rawGrid.rows.length === 0 ||
      !rawGrid.rows.every(Number.isFinite)
    ) {
      return null;
    }
    grid = {
      columns: [...new Set(rawGrid.columns as number[])].sort((a, b) => a - b),
      rows: [...new Set(rawGrid.rows as number[])].sort((a, b) => a - b),
    };
  }

  const unique = (ids: string[]) => new Set(ids).size === ids.length;
  if (
    !unique(nodes.map((node) => node.id)) ||
    !unique(arrows.map((arrow) => arrow.id)) ||
    !unique(cells.map((cell) => cell.id)) ||
    !unique(nodes.map((node) => `${node.x}:${node.y}`))
  ) {
    return null;
  }
  const nodeIds = new Set(nodes.map((node) => node.id));
  const arrowById = new Map(arrows.map((arrow) => [arrow.id, arrow]));
  const cellById = new Map(cells.map((cell) => [cell.id, cell]));
  const cellIndexById = new Map(cells.map((cell, index) => [cell.id, index]));
  if (
    arrows.some(
      (arrow) =>
        !nodeIds.has(arrow.source) ||
        !nodeIds.has(arrow.target) ||
        arrow.source === arrow.target,
    )
  ) {
    return null;
  }

  const document: DiagramDocument = {
    format: 'xyquiver',
    version: 2,
    title: candidate.title,
    ...(grid ? { grid } : {}),
    nodes,
    arrows,
    cells,
  };
  const pathInfo = (ids: ArrowId[]) => {
    if (ids.length === 0) return null;
    const path = ids.map((id) => arrowById.get(id));
    if (path.some((arrow) => !arrow)) return false as const;
    const complete = path as DiagramArrow[];
    if (
      complete
        .slice(1)
        .some((arrow, index) => complete[index].target !== arrow.source)
    ) {
      return false as const;
    }
    return {
      source: complete[0].source,
      target: complete.at(-1)!.target,
      vertices: [complete[0].source, ...complete.map((arrow) => arrow.target)],
    };
  };
  const anchorExists = (anchor: CellAnchor) =>
    anchor.kind === 'node'
      ? nodeIds.has(anchor.id)
      : anchor.kind === 'arrow'
        ? arrowById.has(anchor.id)
        : cellById.has(anchor.id);
  const anchorBelongs = (
    anchor: CellAnchor,
    path: ArrowId[],
    info: Exclude<ReturnType<typeof pathInfo>, null | false>,
  ) =>
    anchor.kind === 'arrow'
      ? path.includes(anchor.id)
      : anchor.kind === 'node'
        ? info.vertices.includes(anchor.id)
        : false;
  for (const [cellIndex, cell] of cells.entries()) {
    const sourceAnchor = cellSourceAnchor(cell);
    const targetAnchor = cellTargetAnchor(cell);
    if (
      !sourceAnchor ||
      !targetAnchor ||
      !anchorExists(sourceAnchor) ||
      !anchorExists(targetAnchor)
    ) {
      return null;
    }
    if (
      (sourceAnchor.kind === 'cell' &&
        (cellIndexById.get(sourceAnchor.id) ?? cellIndex) >= cellIndex) ||
      (targetAnchor.kind === 'cell' &&
        (cellIndexById.get(targetAnchor.id) ?? cellIndex) >= cellIndex)
    ) {
      return null;
    }
    const sourcePoint = anchorPoint(document, sourceAnchor);
    const targetPoint = anchorPoint(document, targetAnchor);
    if (
      !sourcePoint ||
      !targetPoint ||
      Math.hypot(sourcePoint.x - targetPoint.x, sourcePoint.y - targetPoint.y) <
        1
    ) {
      return null;
    }
    const paths = cellBoundaryPaths(cell);
    const sourceInfo = pathInfo(paths.source);
    const targetInfo = pathInfo(paths.target);
    if (
      sourceInfo === false ||
      targetInfo === false ||
      (sourceInfo === null) !== (targetInfo === null)
    ) {
      return null;
    }
    if (
      sourceInfo &&
      targetInfo &&
      (sourceInfo.source !== targetInfo.source ||
        sourceInfo.target !== targetInfo.target ||
        !anchorBelongs(sourceAnchor, paths.source, sourceInfo) ||
        !anchorBelongs(targetAnchor, paths.target, targetInfo))
    ) {
      return null;
    }
  }
  return cloneDocument(document);
}

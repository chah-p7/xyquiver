export type NodeId = string;
export type ArrowId = string;
export type CellId = string;

export type ArrowStroke = 'solid' | 'dashed' | 'dotted' | 'double';
export type ArrowHead = 'arrow' | 'twohead' | 'none';
export type ArrowTail = 'none' | 'hook' | 'mapsto';
export type LabelSide = 'left' | 'right';
export type CellHead = 'arrow' | 'reverse' | 'equality' | 'none';
export type CellStroke = 'solid' | 'dashed' | 'dotted' | 'none';

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
  stroke: ArrowStroke;
  head: ArrowHead;
  tail: ArrowTail;
  color: string;
}

export type CellAnchor =
  | { kind: 'node'; id: NodeId }
  | { kind: 'arrow'; id: ArrowId; t?: number };

export interface DiagramTwoCell {
  id: CellId;
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
  color: string;
  head?: CellHead;
  stroke?: CellStroke;
}

export function resolvedCellStroke(cell: DiagramTwoCell): CellStroke {
  return cell.stroke ?? (cell.head === 'none' ? 'none' : 'solid');
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
export const DEFAULT_MATRIX_GRID: DiagramGrid = {
  columns: [120, 310, 500, 690, 880],
  rows: [90, 210, 330, 450, 570],
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

export function displayTex(value: string): string {
  let result = value.trim();
  result = result.replace(
    /\\mathcal\{([A-Z])\}/g,
    (_, letter: string) => mathcal[letter] ?? letter,
  );
  result = result.replace(
    /\\mathbb\{([A-Z])\}/g,
    (_, letter: string) => blackboard[letter] ?? letter,
  );
  result = result.replace(
    /\\(?:operatorname|mathrm|text|txt)\{([^{}]*)\}/g,
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

export function snap(value: number): number {
  return Math.round(value / SNAP) * SNAP;
}

function nearest(value: number, candidates: number[]): number {
  return candidates.reduce((best, candidate) =>
    Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best,
  );
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

export function snapPointToMatrix(doc: DiagramDocument, point: Point): Point {
  const axes = matrixAxes(doc, true);
  return {
    x: axes.columns.length ? nearest(point.x, axes.columns) : snap(point.x),
    y: axes.rows.length ? nearest(point.y, axes.rows) : snap(point.y),
  };
}

export function nodeMetrics(node: DiagramNode) {
  if (node.ghost) return { width: 14, height: 14 };
  const label = displayTex(node.label);
  return {
    width: Math.min(300, Math.max(40, label.length * 10.5 + 22)),
    height: 40,
  };
}

function normalize(vector: Point): Point {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
}

function pointOnEllipse(center: Point, radii: Point, direction: Point): Point {
  const unit = normalize(direction);
  const scale =
    1 /
    Math.sqrt(
      (unit.x * unit.x) / (radii.x * radii.x) +
        (unit.y * unit.y) / (radii.y * radii.y),
    );
  return { x: center.x + unit.x * scale, y: center.y + unit.y * scale };
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
  const sourceSize = nodeMetrics(source);
  const targetSize = nodeMetrics(target);
  const start = pointOnEllipse(
    source,
    { x: sourceSize.width / 2 + 7, y: sourceSize.height / 2 + 7 },
    chord,
  );
  const end = pointOnEllipse(
    target,
    { x: targetSize.width / 2 + 10, y: targetSize.height / 2 + 10 },
    { x: -chord.x, y: -chord.y },
  );
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

export function getCellGeometry(doc: DiagramDocument, cell: DiagramTwoCell) {
  const sourceAnchor = cellSourceAnchor(cell);
  const targetAnchor = cellTargetAnchor(cell);
  if (!sourceAnchor || !targetAnchor) return null;
  const rawFrom = anchorPoint(doc, sourceAnchor);
  const rawTo = anchorPoint(doc, targetAnchor);
  if (!rawFrom || !rawTo) return null;
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
      const size = nodeMetrics(node);
      from = pointOnEllipse(
        node,
        { x: size.width / 2 + 10, y: size.height / 2 + 10 },
        rawDirection,
      );
    }
  }
  if (targetAnchor.kind === 'node') {
    const node = doc.nodes.find((item) => item.id === targetAnchor.id);
    if (node) {
      const size = nodeMetrics(node);
      to = pointOnEllipse(
        node,
        { x: size.width / 2 + 10, y: size.height / 2 + 10 },
        { x: -rawDirection.x, y: -rawDirection.y },
      );
    }
  }
  const direction = normalize({ x: to.x - from.x, y: to.y - from.y });
  const normal = { x: direction.y, y: -direction.x };
  const start = {
    x: from.x + direction.x * (sourceAnchor.kind === 'arrow' ? 5 : 0),
    y: from.y + direction.y * (sourceAnchor.kind === 'arrow' ? 5 : 0),
  };
  const end = {
    x: to.x - direction.x * (targetAnchor.kind === 'arrow' ? 5 : 0),
    y: to.y - direction.y * (targetAnchor.kind === 'arrow' ? 5 : 0),
  };
  const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  return {
    start,
    end,
    midpoint,
    direction,
    normal,
    sourceAnchor,
    targetAnchor,
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
    sourceArrow && targetArrow && areParallel(sourceArrow, targetArrow),
  );
}

function comparableAnchorKey(anchor: CellAnchor): string {
  return anchor.kind === 'arrow'
    ? `arrow:${anchor.id}:${round(anchor.t ?? 0.5)}`
    : `node:${anchor.id}`;
}

export type CellCreationConflict =
  | 'duplicate'
  | 'shared-native-boundary'
  | null;

export function cellCreationConflict(
  doc: DiagramDocument,
  source: CellAnchor,
  target: CellAnchor,
): CellCreationConflict {
  const sourceKey = comparableAnchorKey(source);
  const targetKey = comparableAnchorKey(target);
  for (const cell of doc.cells) {
    const existingSource = cellSourceAnchor(cell);
    const existingTarget = cellTargetAnchor(cell);
    if (!existingSource || !existingTarget) continue;
    const existingSourceKey = comparableAnchorKey(existingSource);
    const existingTargetKey = comparableAnchorKey(existingTarget);
    if (
      (existingSourceKey === sourceKey && existingTargetKey === targetKey) ||
      (existingSourceKey === targetKey && existingTargetKey === sourceKey)
    ) {
      return 'duplicate';
    }
  }

  if (source.kind !== 'arrow' || target.kind !== 'arrow') return null;
  const sourceArrow = doc.arrows.find((arrow) => arrow.id === source.id);
  const targetArrow = doc.arrows.find((arrow) => arrow.id === target.id);
  if (!sourceArrow || !targetArrow || !areParallel(sourceArrow, targetArrow)) {
    return null;
  }
  return doc.cells.some((cell) => {
    if (!isNativeParallelCell(doc, cell)) return false;
    const existingSource = cellSourceAnchor(cell);
    const existingTarget = cellTargetAnchor(cell);
    return (
      (existingSource?.kind === 'arrow' &&
        (existingSource.id === source.id || existingSource.id === target.id)) ||
      (existingTarget?.kind === 'arrow' &&
        (existingTarget.id === source.id || existingTarget.id === target.id))
    );
  })
    ? 'shared-native-boundary'
    : null;
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
  const raw = Math.min(
    maximum,
    Math.max(minimum, Math.round(requested / 2) * 2),
  );
  const valid = (candidate: number) =>
    partnerCurves.every((curve) => Math.abs(candidate - curve) >= gap);
  if (valid(raw)) return raw;
  const candidates = [
    minimum,
    maximum,
    ...partnerCurves.flatMap((curve) => [curve - gap, curve + gap]),
  ].filter(
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
    if (geometry && segmentIntersects(geometry.start, geometry.end)) {
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
  if (selection.kind === 'cell') {
    return {
      ...doc,
      cells: doc.cells.filter((cell) => cell.id !== selection.id),
    };
  }
  if (selection.kind === 'arrow') {
    return {
      ...doc,
      arrows: doc.arrows.filter((arrow) => arrow.id !== selection.id),
      cells: doc.cells.filter((cell) => {
        const source = cellSourceAnchor(cell);
        const target = cellTargetAnchor(cell);
        const paths = cellBoundaryPaths(cell);
        return !(
          (source?.kind === 'arrow' && source.id === selection.id) ||
          (target?.kind === 'arrow' && target.id === selection.id) ||
          paths.source.includes(selection.id) ||
          paths.target.includes(selection.id)
        );
      }),
    };
  }
  const arrowIds = new Set(
    doc.arrows
      .filter(
        (arrow) =>
          arrow.source === selection.id || arrow.target === selection.id,
      )
      .map((arrow) => arrow.id),
  );
  return {
    ...doc,
    nodes: doc.nodes.filter((node) => node.id !== selection.id),
    arrows: doc.arrows.filter((arrow) => !arrowIds.has(arrow.id)),
    cells: doc.cells.filter((cell) => {
      const source = cellSourceAnchor(cell);
      const target = cellTargetAnchor(cell);
      const paths = cellBoundaryPaths(cell);
      return !(
        (source?.kind === 'node' && source.id === selection.id) ||
        (target?.kind === 'node' && target.id === selection.id) ||
        (source?.kind === 'arrow' && arrowIds.has(source.id)) ||
        (target?.kind === 'arrow' && arrowIds.has(target.id)) ||
        paths.source.some((id) => arrowIds.has(id)) ||
        paths.target.some((id) => arrowIds.has(id))
      );
    }),
  };
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
    const { width, height } = nodeMetrics(node);
    minX = Math.min(minX, node.x - width / 2);
    minY = Math.min(minY, node.y - height / 2);
    maxX = Math.max(maxX, node.x + width / 2);
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
      const side = arrow.labelSide === 'left' ? 1 : -1;
      const label = {
        x: geometry.midpoint.x + geometry.normal.x * 23 * side,
        y: geometry.midpoint.y + geometry.normal.y * 23 * side,
      };
      return `${paths}<text x="${round(label.x)}" y="${round(label.y)}" text-anchor="middle" dominant-baseline="middle" font-family="Cambria Math, STIX Two Math, Times New Roman, serif" font-size="19" fill="${color}" stroke="#ffffff" stroke-width="5.5" paint-order="stroke fill">${xml(displayTex(arrow.label))}</text>`;
    })
    .join('');
  const cellMarkup = doc.cells
    .map((cell) => {
      const geometry = getCellGeometry(doc, cell);
      if (!geometry) return '';
      const color = colorOrDefault(cell.color, '#5b4bc4');
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
        ? { x: -geometry.direction.x, y: -geometry.direction.y }
        : geometry.direction;
      const shaftTip = {
        x: tip.x - tipDirection.x * 8.5,
        y: tip.y - tipDirection.y * 8.5,
      };
      const wingA = {
        x: shaftTip.x + geometry.normal.x * 5.8,
        y: shaftTip.y + geometry.normal.y * 5.8,
      };
      const wingB = {
        x: shaftTip.x - geometry.normal.x * 5.8,
        y: shaftTip.y - geometry.normal.y * 5.8,
      };
      const line = (amount: number) => {
        const start = {
          x: geometry.start.x + offset.x * amount,
          y: geometry.start.y + offset.y * amount,
        };
        const end = {
          x: geometry.end.x + offset.x * amount,
          y: geometry.end.y + offset.y * amount,
        };
        const x1 = reverse
          ? start.x + geometry.direction.x * (hasHead ? 8.5 : 0)
          : start.x;
        const y1 = reverse
          ? start.y + geometry.direction.y * (hasHead ? 8.5 : 0)
          : start.y;
        const x2 = reverse
          ? end.x
          : end.x - geometry.direction.x * (hasHead ? 8.5 : 0);
        const y2 = reverse
          ? end.y
          : end.y - geometry.direction.y * (hasHead ? 8.5 : 0);
        return `<path d="M ${round(x1)} ${round(y1)} L ${round(x2)} ${round(y2)}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="${linecap}"${dash}/>`;
      };
      const head =
        direction === 'none' || stroke === 'none'
          ? ''
          : `<path d="M ${round(wingA.x)} ${round(wingA.y)} L ${round(tip.x)} ${round(tip.y)} L ${round(wingB.x)} ${round(wingB.y)}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
      const labelX = geometry.midpoint.x + geometry.normal.x * 20;
      const labelY = geometry.midpoint.y + geometry.normal.y * 20;
      const shaft = stroke === 'none' ? '' : `${line(-2.6)}${line(2.6)}`;
      return `${shaft}${head}<text x="${round(labelX)}" y="${round(labelY)}" text-anchor="middle" dominant-baseline="middle" font-family="Cambria Math, STIX Two Math, Times New Roman, serif" font-size="19" fill="${color}" stroke="#ffffff" stroke-width="5.5" paint-order="stroke fill">${xml(displayTex(cell.label))}</text>`;
    })
    .join('');
  const nodeMarkup = doc.nodes
    .filter((node) => !node.ghost)
    .map(
      (node) =>
        `<text x="${round(node.x)}" y="${round(node.y)}" text-anchor="middle" dominant-baseline="middle" font-family="Cambria Math, STIX Two Math, Times New Roman, serif" font-size="24" font-weight="500" fill="#111827" stroke="#ffffff" stroke-width="8" paint-order="stroke fill">${xml(displayTex(node.label))}</text>`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}" width="${bounds.width}" height="${bounds.height}" role="img"><title>${xml(doc.title || 'XyQuiver diagram')}</title><desc>Categorical diagram exported as editable vector paths and text by XyQuiver.</desc><defs><marker id="${prefix}-arrow" viewBox="-11 -6 11 12" refX="0" refY="0" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto" overflow="visible"><path d="M -10 -5.25 L 0 0 L -10 5.25" fill="none" stroke="#1f2937" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></marker><marker id="${prefix}-twohead" viewBox="-16 -7 16 14" refX="0" refY="0" markerWidth="17" markerHeight="13" markerUnits="userSpaceOnUse" orient="auto" overflow="visible"><path d="M -9 -5.5 L 0 0 L -9 5.5 M -15 -5.5 L -6 0 L -15 5.5" fill="none" stroke="#1f2937" stroke-width="1.9" stroke-linecap="round"/></marker><marker id="${prefix}-hook" viewBox="0 -8 13 16" refX="0" refY="0" markerWidth="13" markerHeight="16" markerUnits="userSpaceOnUse" orient="auto" overflow="visible"><path d="M 0 0 C 0 -7 8 -7 10 -2" fill="none" stroke="#1f2937" stroke-width="1.9" stroke-linecap="round"/></marker><marker id="${prefix}-mapsto" viewBox="0 -8 9 16" refX="1" refY="0" markerWidth="9" markerHeight="16" markerUnits="userSpaceOnUse" orient="auto" overflow="visible"><path d="M 1 -7 L 1 7" fill="none" stroke="#1f2937" stroke-width="1.9" stroke-linecap="round"/></marker></defs>${background}<g>${arrowMarkup}</g><g>${cellMarkup}</g><g>${nodeMarkup}</g></svg>`;
}

function safeTex(value: string): string {
  return value.replace(/[\r\n]/g, ' ').trim();
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
        ? `@/^${round(Math.abs(arrow.curve) / 45)}em/`
        : `@/_${round(Math.abs(arrow.curve) / 45)}em/`;
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
  const label = arrow.label
    ? `${arrow.labelSide === 'left' ? '^' : '_'}{${safeTex(arrow.label)}}`
    : '';
  const namedAnchors = aliases
    .map(({ name, t }) => `|(${round(t)})*{}="${name}"`)
    .join('');
  return `\\ar${curve}${style}[${hop}]${label}${namedAnchors}`;
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
  const axes = matrixAxes(doc);
  const xs = axes.columns;
  const ys = axes.rows;
  const commands = new Map<NodeId, string[]>();
  const consumedArrows = new Set<ArrowId>();
  const nativeBoundaryOwners = new Map<ArrowId, CellId>();
  let nativeCellCount = 0;

  for (const cell of doc.cells) {
    const sourceAnchor = cellSourceAnchor(cell);
    const targetAnchor = cellTargetAnchor(cell);
    if (!sourceAnchor || !targetAnchor) {
      warnings.push(
        `2-cell ${cell.label || cell.id} has a missing attachment.`,
      );
      continue;
    }
    if (!isNativeParallelCell(doc, cell)) continue;
    const sourceArrow = doc.arrows.find(
      (arrow) => arrow.id === sourceAnchor.id,
    );
    const targetArrow = doc.arrows.find(
      (arrow) => arrow.id === targetAnchor.id,
    );
    if (!sourceArrow || !targetArrow) continue;
    const owner =
      nativeBoundaryOwners.get(sourceArrow.id) ??
      nativeBoundaryOwners.get(targetArrow.id);
    if (owner) {
      warnings.push(
        `2-cell ${cell.label || cell.id} shares a native boundary with ${owner} and was omitted.`,
      );
      continue;
    }
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
    const sourceIsUpper = sourceArrow.curve >= targetArrow.curve;
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
    nativeBoundaryOwners.set(sourceArrow.id, cell.id);
    nativeBoundaryOwners.set(targetArrow.id, cell.id);
    consumedArrows.add(sourceArrow.id);
    consumedArrows.add(targetArrow.id);
    nativeCellCount += 1;
  }

  const nodeAliases = new Map(
    doc.nodes.map((node, index) => [node.id, `xyq-n${index + 1}`]),
  );
  const arrowAnchorAliases = new Map<
    ArrowId,
    Map<string, { name: string; t: number }>
  >();
  let arrowAnchorIndex = 0;
  const resolveAnchorAlias = (anchor: CellAnchor): string | null => {
    if (anchor.kind === 'node') return nodeAliases.get(anchor.id) ?? null;
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
  for (const cell of doc.cells) {
    if (isNativeParallelCell(doc, cell)) continue;
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
        `2-cell ${cell.label || cell.id} has a missing boundary path and was omitted.`,
      );
      continue;
    }
    const sourceAlias = resolveAnchorAlias(sourceAnchor);
    const targetAlias = resolveAnchorAlias(targetAnchor);
    if (!sourceAlias || !targetAlias) {
      warnings.push(
        `2-cell ${cell.label || cell.id} could not name one of its Xy-pic path anchors and was omitted.`,
      );
      continue;
    }
    const stroke = resolvedCellStroke(cell);
    const direction = resolvedCellHead(cell);
    const style =
      stroke === 'none'
        ? '@{}'
        : stroke === 'solid'
          ? direction === 'reverse'
            ? '@{<=}'
            : direction === 'none'
              ? '@{=}'
              : '@{=>}'
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
        `2-cell ${cell.label || cell.id} uses Xy-pic's nearest ${stroke} shaft glyph.`,
      );
    }
    const label = cell.label ? `^{${safeTex(cell.label)}}` : '';
    generalCellCommands.push(
      `\\POS "${sourceAlias}" \\ar${style} "${targetAlias}"${label}`,
    );
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
        const label = node.ghost ? '{}' : safeTex(node.label) || '{}';
        const alias = nodeAliases.get(node.id);
        const aliasCommand = alias ? `\\ar@{}[]|*{}="${alias}"` : '';
        return [label, aliasCommand, ...(commands.get(node.id) ?? [])]
          .filter(Boolean)
          .join(' ');
      })
      .join(' & '),
  );
  const initializer = nativeCellCount > 0 ? '\\UseAllTwocells\n' : '';
  const trailing =
    generalCellCommands.length > 0 ? `\n${generalCellCommands.join('\n')}` : '';
  const core = `\\begin{xy}\n${initializer}\\xymatrix @C=4.5pc @R=3.8pc {\n  ${rows.join(' \\\\\n  ')}\n}${trailing}\n\\end{xy}`;
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
      node('q-x0', 'x_0', 120, 450),
      node('q-x1', 'x_1', 500, 90),
      node('q-x2', 'x_2', 880, 450),
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
        color: '#4f46a5',
        head: 'arrow',
      },
    ],
  },
  showcase: {
    format: 'xyquiver',
    version: 2,
    title: 'Pasting of 2-cells',
    grid: {
      columns: [...DEFAULT_MATRIX_GRID.columns],
      rows: [...DEFAULT_MATRIX_GRID.rows],
    },
    nodes: [
      node('p-c', '\\mathcal{C}', 120, 450),
      node('p-d', '\\mathcal{D}', 500, 90),
      node('p-e', '\\mathcal{E}', 880, 450),
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
        color: '#4f46a5',
      },
      {
        id: 'p-beta',
        sourceArrow: 'p-g',
        targetArrow: 'p-gp',
        label: '\\beta',
        color: '#4f46a5',
      },
      {
        id: 'p-paste',
        sourceArrow: 'p-gf',
        targetArrow: 'p-gpfp',
        label: '\\beta\\ast\\alpha',
        color: '#4f46a5',
      },
    ],
  },
  twocell: {
    format: 'xyquiver',
    version: 2,
    title: 'Native 2-cell',
    grid: { columns: [220, 500, 780], rows: [140, 300, 460] },
    nodes: [
      node('n-a', '\\mathcal{C}', 220, 300),
      node('n-b', '\\mathcal{D}', 780, 300),
    ],
    arrows: [
      arrow('a-f', 'n-a', 'n-b', 'F', 72),
      arrow('a-g', 'n-a', 'n-b', 'G', -72),
    ],
    cells: [
      {
        id: 'c-alpha',
        sourceArrow: 'a-f',
        targetArrow: 'a-g',
        label: '\\alpha',
        color: '#5b4bc4',
      },
    ],
  },
  parallel: {
    format: 'xyquiver',
    version: 2,
    title: 'Parallel deformation arrows',
    grid: { columns: [190, 460, 735], rows: [150, 310, 470] },
    nodes: [
      node('n-c', 'C', 190, 310),
      node('n-cp', "C'_i=C+d\\rho_2=C+d\\rho'_2", 735, 310),
    ],
    arrows: [
      arrow('a-rho2', 'n-c', 'n-cp', '\\rho_2', 170),
      arrow('a-rho1', 'n-c', 'n-cp', '\\rho_1', 72),
      arrow('a-rho0', 'n-c', 'n-cp', '\\rho_0', -18, { labelSide: 'right' }),
      arrow('a-rho1p', 'n-cp', 'n-c', "\\rho'_1", 76),
      arrow(
        'a-rho2p',
        'n-c',
        'n-cp',
        "\\rho'_2=\\rho_2+d\\rho_1=\\rho_2+d\\rho'_1",
        -174,
        { labelSide: 'right' },
      ),
    ],
    cells: [
      {
        id: 'c-rho',
        sourceArrow: 'a-rho1',
        targetArrow: 'a-rho0',
        label: '\\rho_0',
        color: '#5b4bc4',
      },
    ],
  },
  homotopy: {
    format: 'xyquiver',
    version: 2,
    title: 'Homotopy stabilization',
    grid: {
      columns: [150, 325, 500, 675, 850],
      rows: [105, 175, 330, 570],
    },
    nodes: [
      node('n-xl', 'X', 150, 105),
      node('n-xr', 'X', 850, 105),
      node('n-anchor', '', 500, 175, true),
      node('n-bp', 'B^{p+1}(\\mathbb{R}/\\hbar\\mathbb{Z})_{conn}', 500, 330),
      node('n-omega', '\\Omega^{p+2}_{cl}', 500, 570),
    ],
    arrows: [
      arrow('a-auto', 'n-xl', 'n-xr', 'automorphism\\;\\simeq', 0),
      arrow('a-left-b', 'n-xl', 'n-bp', '\\nabla', 0),
      arrow('a-right-b', 'n-xr', 'n-bp', '\\nabla', 0, { labelSide: 'right' }),
      arrow('a-left-o', 'n-xl', 'n-omega', 'F', -90),
      arrow('a-right-o', 'n-xr', 'n-omega', 'F', 90, { labelSide: 'right' }),
      arrow('a-curv', 'n-bp', 'n-omega', '\\mathrm{curv}', 0, {
        labelSide: 'right',
      }),
      arrow('a-stab', 'n-anchor', 'n-bp', '\\text{homotopy stabilization}', 0, {
        stroke: 'double',
        labelSide: 'left',
        color: '#5b4bc4',
      }),
    ],
    cells: [],
  },
  snake: {
    format: 'xyquiver',
    version: 2,
    title: 'Snake lemma',
    grid: { columns: [90, 280, 500, 720, 910], rows: [190, 430] },
    nodes: [
      node('s-01', '0', 90, 190),
      node('s-a1', "A'", 280, 190),
      node('s-a', 'A', 500, 190),
      node('s-a2', "A''", 720, 190),
      node('s-02', '0', 910, 190),
      node('s-03', '0', 90, 430),
      node('s-b1', "B'", 280, 430),
      node('s-b', 'B', 500, 430),
      node('s-b2', "B''", 720, 430),
      node('s-04', '0', 910, 430),
    ],
    arrows: [
      arrow('s-top0', 's-01', 's-a1', ''),
      arrow('s-top1', 's-a1', 's-a', 'i'),
      arrow('s-top2', 's-a', 's-a2', 'p'),
      arrow('s-top3', 's-a2', 's-02', ''),
      arrow('s-bot0', 's-03', 's-b1', ''),
      arrow('s-bot1', 's-b1', 's-b', "i'"),
      arrow('s-bot2', 's-b', 's-b2', "p'"),
      arrow('s-bot3', 's-b2', 's-04', ''),
      arrow('s-v1', 's-a1', 's-b1', 'f', 0, { labelSide: 'right' }),
      arrow('s-v2', 's-a', 's-b', 'g', 0, { labelSide: 'right' }),
      arrow('s-v3', 's-a2', 's-b2', 'h', 0, { labelSide: 'right' }),
      arrow('s-delta', 's-a2', 's-b1', '\\delta', -150, {
        stroke: 'dashed',
        color: '#5b4bc4',
      }),
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
      !['left', 'right'].includes(item.labelSide as string) ||
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
      (anchor.kind !== 'node' && anchor.kind !== 'arrow') ||
      typeof anchor.id !== 'string'
    ) {
      return invalidAnchor;
    }
    if (anchor.kind === 'node') return { kind: 'node', id: anchor.id };
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
      (item.sourceArrow !== undefined &&
        typeof item.sourceArrow !== 'string') ||
      (item.targetArrow !== undefined &&
        typeof item.targetArrow !== 'string') ||
      (item.head !== undefined &&
        !['arrow', 'reverse', 'equality', 'none'].includes(
          item.head as string,
        )) ||
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
      color: item.color,
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
    anchor.kind === 'node' ? nodeIds.has(anchor.id) : arrowById.has(anchor.id);
  const anchorBelongs = (
    anchor: CellAnchor,
    path: ArrowId[],
    info: Exclude<ReturnType<typeof pathInfo>, null | false>,
  ) =>
    anchor.kind === 'arrow'
      ? path.includes(anchor.id)
      : info.vertices.includes(anchor.id);
  const cellPairs = new Set<string>();
  for (const cell of cells) {
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
    const pair = [
      comparableAnchorKey(sourceAnchor),
      comparableAnchorKey(targetAnchor),
    ]
      .sort()
      .join('|');
    if (cellPairs.has(pair)) return null;
    cellPairs.add(pair);
  }
  const nativeOwners = new Set<ArrowId>();
  for (const cell of cells) {
    if (!isNativeParallelCell(document, cell)) continue;
    const source = cellSourceAnchor(cell);
    const target = cellTargetAnchor(cell);
    if (source?.kind !== 'arrow' || target?.kind !== 'arrow') return null;
    if (nativeOwners.has(source.id) || nativeOwners.has(target.id)) return null;
    nativeOwners.add(source.id);
    nativeOwners.add(target.id);
  }
  return cloneDocument(document);
}

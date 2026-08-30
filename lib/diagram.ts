export type NodeId = string;
export type ArrowId = string;
export type CellId = string;

export type ArrowStroke = 'solid' | 'dashed' | 'dotted' | 'double';
export type ArrowHead = 'arrow' | 'twohead' | 'none';
export type ArrowTail = 'none' | 'hook' | 'mapsto';
export type LabelSide = 'left' | 'right';

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

export interface DiagramTwoCell {
  id: CellId;
  sourceArrow: ArrowId;
  targetArrow: ArrowId;
  label: string;
  color: string;
}

export interface DiagramDocument {
  format: 'xyquiver';
  version: 1;
  title: string;
  nodes: DiagramNode[];
  arrows: DiagramArrow[];
  cells: DiagramTwoCell[];
}

export type Selection =
  | { kind: 'node'; id: NodeId }
  | { kind: 'arrow'; id: ArrowId }
  | { kind: 'cell'; id: CellId };

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
  result = result.replace(/\\mathcal\{([A-Z])\}/g, (_, letter: string) =>
    mathcal[letter] ?? letter,
  );
  result = result.replace(/\\mathbb\{([A-Z])\}/g, (_, letter: string) =>
    blackboard[letter] ?? letter,
  );
  result = result.replace(/\\(?:operatorname|mathrm|text|txt)\{([^{}]*)\}/g, '$1');
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

export function nodeMetrics(node: DiagramNode) {
  if (node.ghost) return { width: 14, height: 14 };
  const label = displayTex(node.label);
  return {
    width: Math.min(280, Math.max(46, label.length * 9.2 + 24)),
    height: 42,
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

export function getCellGeometry(doc: DiagramDocument, cell: DiagramTwoCell) {
  const sourceArrow = doc.arrows.find((arrow) => arrow.id === cell.sourceArrow);
  const targetArrow = doc.arrows.find((arrow) => arrow.id === cell.targetArrow);
  if (!sourceArrow || !targetArrow) return null;
  const sourceGeometry = getArrowGeometry(doc, sourceArrow);
  const targetGeometry = getArrowGeometry(doc, targetArrow);
  if (!sourceGeometry || !targetGeometry) return null;
  const from = sourceGeometry.midpoint;
  const to = targetGeometry.midpoint;
  const direction = normalize({ x: to.x - from.x, y: to.y - from.y });
  const normal = { x: direction.y, y: -direction.x };
  const start = { x: from.x + direction.x * 8, y: from.y + direction.y * 8 };
  const end = { x: to.x - direction.x * 11, y: to.y - direction.y * 11 };
  const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  return { start, end, midpoint, direction, normal };
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

export function deleteSelection(
  doc: DiagramDocument,
  selection: Selection,
): DiagramDocument {
  if (selection.kind === 'cell') {
    return { ...doc, cells: doc.cells.filter((cell) => cell.id !== selection.id) };
  }
  if (selection.kind === 'arrow') {
    return {
      ...doc,
      arrows: doc.arrows.filter((arrow) => arrow.id !== selection.id),
      cells: doc.cells.filter(
        (cell) =>
          cell.sourceArrow !== selection.id && cell.targetArrow !== selection.id,
      ),
    };
  }
  const arrowIds = new Set(
    doc.arrows
      .filter(
        (arrow) => arrow.source === selection.id || arrow.target === selection.id,
      )
      .map((arrow) => arrow.id),
  );
  return {
    ...doc,
    nodes: doc.nodes.filter((node) => node.id !== selection.id),
    arrows: doc.arrows.filter((arrow) => !arrowIds.has(arrow.id)),
    cells: doc.cells.filter(
      (cell) =>
        !arrowIds.has(cell.sourceArrow) && !arrowIds.has(cell.targetArrow),
    ),
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
          ? ' stroke-dasharray="10 7"'
          : arrow.stroke === 'dotted'
            ? ' stroke-dasharray="2 7" stroke-linecap="round"'
            : '';
      const marker =
        arrow.head === 'none'
          ? ''
          : ` marker-end="url(#${prefix}-${arrow.head})"`;
      const tail =
        arrow.tail === 'none'
          ? ''
          : ` marker-start="url(#${prefix}-${arrow.tail})"`;
      const common = `fill="none" stroke="${color}" stroke-width="2"${dash}${tail}`;
      const paths =
        arrow.stroke === 'double'
          ? `<path d="${shiftedPath(geometry, -2.4)}" ${common}/><path d="${shiftedPath(geometry, 2.4)}" ${common}${marker}/>`
          : `<path d="${geometry.path}" ${common}${marker}/>`;
      if (!arrow.label) return paths;
      const side = arrow.labelSide === 'left' ? 1 : -1;
      const label = {
        x: geometry.midpoint.x + geometry.normal.x * 20 * side,
        y: geometry.midpoint.y + geometry.normal.y * 20 * side,
      };
      return `${paths}<text x="${round(label.x)}" y="${round(label.y)}" text-anchor="middle" dominant-baseline="middle" font-family="Cambria Math, STIX Two Math, Times New Roman, serif" font-size="17" fill="${color}" stroke="#ffffff" stroke-width="5" paint-order="stroke fill">${xml(displayTex(arrow.label))}</text>`;
    })
    .join('');
  const cellMarkup = doc.cells
    .map((cell) => {
      const geometry = getCellGeometry(doc, cell);
      if (!geometry) return '';
      const color = colorOrDefault(cell.color, '#5b4bc4');
      const offset = geometry.normal;
      const line = (amount: number, marker: boolean) => {
        const x1 = geometry.start.x + offset.x * amount;
        const y1 = geometry.start.y + offset.y * amount;
        const x2 = geometry.end.x + offset.x * amount;
        const y2 = geometry.end.y + offset.y * amount;
        return `<path d="M ${round(x1)} ${round(y1)} L ${round(x2)} ${round(y2)}" fill="none" stroke="${color}" stroke-width="1.8"${marker ? ` marker-end="url(#${prefix}-cell)"` : ''}/>`;
      };
      const labelX = geometry.midpoint.x + geometry.normal.x * 17;
      const labelY = geometry.midpoint.y + geometry.normal.y * 17;
      return `${line(-2.3, false)}${line(2.3, true)}<text x="${round(labelX)}" y="${round(labelY)}" text-anchor="middle" dominant-baseline="middle" font-family="Cambria Math, STIX Two Math, Times New Roman, serif" font-size="17" fill="${color}" stroke="#ffffff" stroke-width="5" paint-order="stroke fill">${xml(displayTex(cell.label))}</text>`;
    })
    .join('');
  const nodeMarkup = doc.nodes
    .filter((node) => !node.ghost)
    .map(
      (node) =>
        `<text x="${round(node.x)}" y="${round(node.y)}" text-anchor="middle" dominant-baseline="middle" font-family="Cambria Math, STIX Two Math, Times New Roman, serif" font-size="21" font-weight="500" fill="#111827" stroke="#ffffff" stroke-width="7" paint-order="stroke fill">${xml(displayTex(node.label))}</text>`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}" width="${bounds.width}" height="${bounds.height}" role="img"><title>${xml(doc.title || 'XyQuiver diagram')}</title><desc>Categorical diagram exported as editable vector paths and text by XyQuiver.</desc><defs><marker id="${prefix}-arrow" viewBox="-10 -5 10 10" refX="0" refY="0" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto" overflow="visible"><path d="M -9 -5 L 0 0 L -9 5 Z" fill="#1f2937"/></marker><marker id="${prefix}-twohead" viewBox="-14 -6 14 12" refX="0" refY="0" markerWidth="14" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto" overflow="visible"><path d="M -8 -5 L 0 0 L -8 5 M -13 -5 L -5 0 L -13 5" fill="none" stroke="#1f2937" stroke-width="1.8"/></marker><marker id="${prefix}-hook" viewBox="0 -7 12 14" refX="0" refY="0" markerWidth="12" markerHeight="14" markerUnits="userSpaceOnUse" orient="auto" overflow="visible"><path d="M 0 0 C 0 -6 7 -6 8 -2" fill="none" stroke="#1f2937" stroke-width="1.8"/></marker><marker id="${prefix}-mapsto" viewBox="0 -7 8 14" refX="0" refY="0" markerWidth="8" markerHeight="14" markerUnits="userSpaceOnUse" orient="auto" overflow="visible"><path d="M 1 -6 L 1 6" fill="none" stroke="#1f2937" stroke-width="1.8"/></marker><marker id="${prefix}-cell" viewBox="-9 -5 9 10" refX="0" refY="0" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto" overflow="visible"><path d="M -8 -5 L 0 0 L -8 5 Z" fill="#5b4bc4"/></marker></defs>${background}<g>${arrowMarkup}</g><g>${cellMarkup}</g><g>${nodeMarkup}</g></svg>`;
}

function safeTex(value: string): string {
  return value.replace(/[\r\n]/g, ' ').trim();
}

function hopFor(source: DiagramNode, target: DiagramNode, xs: number[], ys: number[]) {
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
) {
  const hop = hopFor(source, target, xs, ys);
  const curve =
    Math.abs(arrow.curve) < 8
      ? ''
      : arrow.curve > 0
        ? `@/^${round(Math.abs(arrow.curve) / 45)}em/`
        : `@/_${round(Math.abs(arrow.curve) / 45)}em/`;
  const style =
    arrow.stroke === 'dashed'
      ? '@{-->}'
      : arrow.stroke === 'dotted'
        ? '@{.>}'
        : arrow.stroke === 'double'
          ? '@{=>}'
          : arrow.head === 'none'
            ? '@{-}'
            : arrow.head === 'twohead'
              ? '@{->>}'
              : arrow.tail === 'hook'
                ? '@{^{(}->}'
                : arrow.tail === 'mapsto'
                  ? '@{|->}'
                  : '';
  const label = arrow.label
    ? `${arrow.labelSide === 'left' ? '^' : '_'}{${safeTex(arrow.label)}}`
    : '';
  return `\\ar${curve}${style}[${hop}]${label}`;
}

export function generateXyPic(
  doc: DiagramDocument,
  mode: 'typora' | 'snippet' | 'latex' = 'typora',
): ExportResult {
  const warnings: string[] = [];
  if (doc.nodes.length === 0) {
    const empty = '\\begin{xy}\\xymatrix{ {} }\\end{xy}';
    return {
      text: mode === 'typora' ? `$$\n${empty}\n$$` : empty,
      warnings,
    };
  }
  const xs = [...new Set(doc.nodes.map((node) => node.x))].sort((a, b) => a - b);
  const ys = [...new Set(doc.nodes.map((node) => node.y))].sort((a, b) => a - b);
  const commands = new Map<NodeId, string[]>();
  const consumedArrows = new Set<ArrowId>();

  for (const cell of doc.cells) {
    const sourceArrow = doc.arrows.find((arrow) => arrow.id === cell.sourceArrow);
    const targetArrow = doc.arrows.find((arrow) => arrow.id === cell.targetArrow);
    if (!sourceArrow || !targetArrow || !areParallel(sourceArrow, targetArrow)) {
      warnings.push(`2-cell ${cell.label || cell.id} does not have parallel boundaries.`);
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
    const orientation = sourceIsUpper
      ? safeTex(cell.label)
      : `^${safeTex(cell.label)}`;
    const hop = hopFor(sourceNode, targetNode, xs, ys);
    const command = `\\xtwocell[${hop}]{}^{${safeTex(upper.label)}}_{${safeTex(lower.label)}}{${orientation}}`;
    commands.set(sourceNode.id, [...(commands.get(sourceNode.id) ?? []), command]);
    consumedArrows.add(sourceArrow.id);
    consumedArrows.add(targetArrow.id);
  }

  for (const arrow of doc.arrows) {
    if (consumedArrows.has(arrow.id)) continue;
    const source = doc.nodes.find((node) => node.id === arrow.source);
    const target = doc.nodes.find((node) => node.id === arrow.target);
    if (!source || !target) continue;
    if (source.id === target.id) {
      warnings.push(`Loop ${arrow.label || arrow.id} needs low-level XY and was omitted.`);
      continue;
    }
    const command = arrowXyCommand(arrow, source, target, xs, ys);
    commands.set(source.id, [...(commands.get(source.id) ?? []), command]);
  }

  const rows = ys.map((y) =>
    xs
      .map((x) => {
        const node = doc.nodes.find((candidate) => candidate.x === x && candidate.y === y);
        if (!node) return '{}';
        const label = node.ghost ? '{}' : safeTex(node.label) || '{}';
        return [label, ...(commands.get(node.id) ?? [])].join(' ');
      })
      .join(' & '),
  );
  const core = `\\begin{xy}\n\\xymatrix @C=4.5pc @R=3.8pc {\n  ${rows.join(' \\\\\n  ')}\n}\n\\end{xy}`;
  if (mode === 'snippet') return { text: core, warnings };
  if (mode === 'latex') {
    return {
      text: `\\documentclass{standalone}\n\\usepackage[all,2cell]{xy}\n\\UseTwocells\n\\begin{document}\n\\[\n${core}\n\\]\n\\end{document}`,
      warnings,
    };
  }
  return { text: `$$\n${core}\n$$`, warnings };
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
  twocell: {
    format: 'xyquiver',
    version: 1,
    title: 'Native 2-cell',
    nodes: [node('n-a', '\\mathcal{C}', 220, 300), node('n-b', '\\mathcal{D}', 780, 300)],
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
    version: 1,
    title: 'Parallel deformation arrows',
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
    version: 1,
    title: 'Homotopy stabilization',
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
      arrow('a-curv', 'n-bp', 'n-omega', '\\mathrm{curv}', 0, { labelSide: 'right' }),
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
    version: 1,
    title: 'Snake lemma',
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
    version: 1,
    title: 'Untitled diagram',
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
  const candidate = value as Partial<DiagramDocument>;
  if (
    candidate.format !== 'xyquiver' ||
    candidate.version !== 1 ||
    !Array.isArray(candidate.nodes) ||
    !Array.isArray(candidate.arrows) ||
    !Array.isArray(candidate.cells)
  ) {
    return null;
  }
  const nodesValid = candidate.nodes.every(
    (item) =>
      item &&
      typeof item.id === 'string' &&
      typeof item.label === 'string' &&
      Number.isFinite(item.x) &&
      Number.isFinite(item.y),
  );
  const arrowsValid = candidate.arrows.every(
    (item) =>
      item &&
      typeof item.id === 'string' &&
      typeof item.source === 'string' &&
      typeof item.target === 'string' &&
      typeof item.label === 'string' &&
      Number.isFinite(item.curve),
  );
  const cellsValid = candidate.cells.every(
    (item) =>
      item &&
      typeof item.id === 'string' &&
      typeof item.sourceArrow === 'string' &&
      typeof item.targetArrow === 'string' &&
      typeof item.label === 'string',
  );
  return nodesValid && arrowsValid && cellsValid
    ? (cloneDocument(candidate as DiagramDocument) as DiagramDocument)
    : null;
}

'use client';

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import katex from 'katex';

import { FloatingCellEditor } from '@/components/floating-cell-editor';
import { FloatingNodeEditor } from '@/components/floating-node-editor';
import {
  areParallel,
  arrowGridAnchors,
  arrowPointAt,
  canPlaceNodes,
  constrainArrowCurve,
  displayTex,
  getArrowGeometry,
  getCellGeometry,
  nodeLabelWidth,
  nodeMetrics,
  normalizeMathTex,
  quadraticPoint,
  resolvedCellHead,
  resolvedCellStroke,
  resolveConnectionLevel,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  sceneGridEdges,
  selectionKey,
  selectionsInRect,
  snapPointToMatrix,
  type ArrowId,
  type CellAnchor,
  type DiagramArrow,
  type DiagramDocument,
  type DiagramNode,
  type DiagramTwoCell,
  type NodeId,
  type Point,
  type Selection,
} from '@/lib/diagram';
import { ui, useUiLanguage } from '@/lib/i18n';

export type EditorTool = 'select' | 'object' | 'arrow' | 'cell';
export type ConnectionMode = 'auto' | 'arrow' | 'cell';

export type CanvasAnchor =
  | { kind: 'point'; point: Point }
  | { kind: 'node'; id: NodeId; point: Point }
  | { kind: 'arrow'; id: ArrowId; t: number; point: Point };

interface DiagramCanvasProps {
  doc: DiagramDocument;
  selections: Selection[];
  editing: Selection | null;
  tool: EditorTool;
  connectionMode: ConnectionMode;
  showGrid: boolean;
  pendingNode: NodeId | null;
  pendingArrow: ArrowId | null;
  onCanvasPoint: (point: Point) => void;
  onSelect: (selection: Selection | null, additive?: boolean) => void;
  onMarqueeSelect: (selections: Selection[], additive: boolean) => void;
  onNodeAction: (id: NodeId) => void;
  onArrowAction: (id: ArrowId) => void;
  onQuickNode: (point: Point) => void;
  onQuickConnect: (
    source: CanvasAnchor,
    target: CanvasAnchor,
    mode: ConnectionMode,
  ) => void;
  onMoveNodes: (positions: Record<NodeId, Point>) => void;
  onSetArrowCurve: (id: ArrowId, curve: number) => void;
  onPatchNode: (id: NodeId, patch: Partial<DiagramNode>) => void;
  onPatchArrow: (id: ArrowId, patch: Partial<DiagramArrow>) => void;
  onPatchCell: (id: string, patch: Partial<DiagramTwoCell>) => void;
  onChangeSelectionLevel: (
    selection: Extract<Selection, { kind: 'arrow' | 'cell' }>,
    level: Exclude<ConnectionMode, 'auto'>,
    label: string,
  ) => void;
  onBeginLabelEdit: (selection: Selection) => void;
  onCommitLabel: (selection: Selection, label: string) => void;
  onCancelLabelEdit: () => void;
  onStatus: (status: string) => void;
}

type Gesture =
  | {
      kind: 'connect';
      pointerId: number;
      source: CanvasAnchor;
      current: Point;
      clientStart: Point;
      moved: boolean;
      additive: boolean;
    }
  | {
      kind: 'move';
      pointerId: number;
      anchor: NodeId;
      sceneStart: Point;
      starts: Record<NodeId, Point>;
      positions: Record<NodeId, Point>;
      clientStart: Point;
      moved: boolean;
      valid: boolean;
    }
  | {
      kind: 'curve';
      pointerId: number;
      arrow: ArrowId;
      curve: number;
      clientStart: Point;
      moved: boolean;
    }
  | {
      kind: 'cell-curve';
      pointerId: number;
      cell: string;
      curve: number;
      clientStart: Point;
      moved: boolean;
    }
  | {
      kind: 'marquee';
      pointerId: number;
      start: Point;
      current: Point;
      clientStart: Point;
      moved: boolean;
      additive: boolean;
    };

const additiveModifier = (event: ReactPointerEvent) =>
  event.shiftKey || event.ctrlKey || event.metaKey;

function distance(left: Point, right: Point) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function floatingPanelPosition(
  anchor: Point,
  width: number,
  height: number,
  avoid?: Point,
) {
  const gap = 38;
  const candidates = [
    { x: anchor.x - width / 2, y: anchor.y - height - gap },
    { x: anchor.x - width / 2, y: anchor.y + gap },
    { x: anchor.x + gap, y: anchor.y - height / 2 },
    { x: anchor.x - width - gap, y: anchor.y - height / 2 },
  ].map((candidate, preference) => {
    const position = {
      x: clamp(candidate.x, 12, SCENE_WIDTH - width - 12),
      y: clamp(candidate.y, 12, SCENE_HEIGHT - height - 12),
    };
    const clampedDistance = Math.hypot(
      position.x - candidate.x,
      position.y - candidate.y,
    );
    const coversAvoid =
      avoid &&
      avoid.x >= position.x - 16 &&
      avoid.x <= position.x + width + 16 &&
      avoid.y >= position.y - 16 &&
      avoid.y <= position.y + height + 16;
    return {
      ...position,
      score: preference * 2 + clampedDistance + (coversAvoid ? 10_000 : 0),
    };
  });
  return candidates.sort((left, right) => left.score - right.score)[0];
}

function offsetPath(path: ReturnType<typeof getArrowGeometry>, amount: number) {
  if (!path) return '';
  const move = (point: Point) => ({
    x: point.x + path.normal.x * amount,
    y: point.y + path.normal.y * amount,
  });
  const start = move(path.start);
  const control = move(path.control);
  const end = move(path.end);
  return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
}

function MathLabel({
  tex,
  x,
  y,
  width,
  height = 38,
  color = '#222735',
  size = 17,
  paper = false,
  anchor = 'center',
}: {
  tex: string;
  x: number;
  y: number;
  width: number;
  height?: number;
  color?: string;
  size?: number;
  paper?: boolean;
  anchor?: 'center' | 'first';
}) {
  const labelRef = useRef<HTMLSpanElement>(null);
  const [firstGlyphCenter, setFirstGlyphCenter] = useState(10);
  const html = katex.renderToString(normalizeMathTex(tex) || '\\cdot', {
    displayMode: false,
    throwOnError: false,
    strict: 'ignore',
    output: 'html',
  });
  useLayoutEffect(() => {
    if (anchor !== 'first') return;
    let active = true;
    const measure = () => {
      const root = labelRef.current;
      const foreignObject = root?.closest('foreignObject');
      if (!root || !foreignObject) return;
      const glyph = [...root.querySelectorAll<HTMLElement>('span')].find(
        (candidate) =>
          candidate.childElementCount === 0 &&
          Boolean(candidate.textContent?.replace(/\u200b/g, '').trim()) &&
          candidate.getBoundingClientRect().width > 0,
      );
      if (!glyph) return;
      const rootRect = root.getBoundingClientRect();
      const glyphRect = glyph.getBoundingClientRect();
      const objectRect = foreignObject.getBoundingClientRect();
      const scale = objectRect.width / width || 1;
      const measured =
        (glyphRect.left - rootRect.left + glyphRect.width / 2) / scale;
      if (active && Number.isFinite(measured)) {
        setFirstGlyphCenter((current) =>
          Math.abs(current - measured) > 0.1 ? measured : current,
        );
      }
    };
    measure();
    void document.fonts?.ready.then(measure);
    return () => {
      active = false;
    };
  }, [anchor, html, width]);
  const labelClass = 'inline-block w-max max-w-none whitespace-nowrap';
  return (
    <foreignObject
      x={anchor === 'first' ? x : x - width / 2}
      y={y - height / 2}
      width={width}
      height={height}
      overflow="visible"
      pointerEvents="none"
    >
      <div
        className={
          anchor === 'first'
            ? 'relative size-full leading-none'
            : 'flex size-full items-center justify-center leading-none'
        }
        style={{ color, fontSize: `${size}px` }}
      >
        <span
          ref={labelRef}
          className={labelClass}
          style={{
            ...(anchor === 'first'
              ? {
                  left: 0,
                  position: 'absolute' as const,
                  top: '50%',
                  transform: `translate(${-firstGlyphCenter}px, -50%)`,
                }
              : {}),
            ...(paper
              ? {
                  filter:
                    'drop-shadow(1px 0 #fff) drop-shadow(-1px 0 #fff) drop-shadow(0 1px #fff) drop-shadow(0 -1px #fff)',
                }
              : {}),
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </foreignObject>
  );
}

function labelAnchor(doc: DiagramDocument, selection: Selection) {
  if (selection.kind === 'node') {
    const node = doc.nodes.find((item) => item.id === selection.id);
    return node ? { point: { x: node.x, y: node.y }, label: node.label } : null;
  }
  if (selection.kind === 'arrow') {
    const arrow = doc.arrows.find((item) => item.id === selection.id);
    const geometry = arrow ? getArrowGeometry(doc, arrow) : null;
    if (!arrow || !geometry) return null;
    const labelGeometry = arrowPointAt(geometry, arrow.labelPosition ?? 0.5);
    const side = arrow.labelSide === 'left' ? 1 : -1;
    return {
      point: {
        x: labelGeometry.midpoint.x + labelGeometry.normal.x * 25 * side,
        y: labelGeometry.midpoint.y + labelGeometry.normal.y * 25 * side,
      },
      label: arrow.label,
    };
  }
  const cell = doc.cells.find((item) => item.id === selection.id);
  const geometry = cell ? getCellGeometry(doc, cell) : null;
  return cell && geometry
    ? {
        point: {
          x: geometry.midpoint.x + geometry.normal.x * 20,
          y: geometry.midpoint.y + geometry.normal.y * 20,
        },
        label: cell.label,
      }
    : null;
}

function InlineLabelEditor({
  doc,
  selection,
  onCommit,
  onCancel,
  onPreview,
}: {
  doc: DiagramDocument;
  selection: Selection;
  onCommit: (selection: Selection, label: string) => void;
  onCancel: () => void;
  onPreview: (label: string | null) => void;
}) {
  const language = useUiLanguage();
  const anchor = labelAnchor(doc, selection);
  const [draft, setDraft] = useState(anchor?.label ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const finished = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  if (!anchor) return null;
  const editorY =
    anchor.point.y > SCENE_HEIGHT - 100
      ? anchor.point.y - 72
      : anchor.point.y + 28;
  const finish = (commit: boolean) => {
    if (finished.current) return;
    finished.current = true;
    onPreview(null);
    if (commit) onCommit(selection, draft);
    else onCancel();
  };
  return (
    <foreignObject
      x={anchor.point.x - 116}
      y={clamp(editorY, 8, SCENE_HEIGHT - 52)}
      width="232"
      height="44"
      overflow="visible"
      pointerEvents="all"
    >
      <div className="flex size-full items-center justify-center px-1">
        <input
          ref={inputRef}
          aria-label={ui(language, '编辑 LaTeX 标签', 'Edit LaTeX label')}
          className="h-9 w-full rounded-lg border border-[#8a4e75] bg-white/98 px-3 font-mono text-[13px] text-[#242430] shadow-[0_8px_30px_rgb(46_29_44/16%)] outline-none ring-3 ring-[#8a4e75]/12"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            onPreview(event.target.value);
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onBlur={() => finish(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              finish(true);
            } else if (event.key === 'Escape') {
              event.preventDefault();
              finish(false);
            }
          }}
        />
      </div>
    </foreignObject>
  );
}

function hitNode(doc: DiagramDocument, point: Point): NodeId | null {
  for (let index = doc.nodes.length - 1; index >= 0; index -= 1) {
    const node = doc.nodes[index];
    const metrics = nodeMetrics(node);
    if (
      Math.abs(point.x - node.x) <= metrics.width / 2 + 14 &&
      Math.abs(point.y - node.y) <= metrics.height / 2 + 14
    ) {
      return node.id;
    }
  }
  return null;
}

function nearestPointOnArrow(
  doc: DiagramDocument,
  arrowId: ArrowId,
  point: Point,
) {
  const arrow = doc.arrows.find((item) => item.id === arrowId);
  const geometry = arrow ? getArrowGeometry(doc, arrow) : null;
  if (!geometry) return null;
  let nearest = {
    distance: Number.POSITIVE_INFINITY,
    t: 0.5,
    point: geometry.midpoint,
  };
  for (let step = 0; step <= 120; step += 1) {
    const t = step / 120;
    const candidatePoint = quadraticPoint(
      geometry.start,
      geometry.control,
      geometry.end,
      t,
    );
    const candidateDistance = distance(point, candidatePoint);
    if (candidateDistance < nearest.distance) {
      nearest = { distance: candidateDistance, t, point: candidatePoint };
    }
  }
  return nearest;
}

function hitArrow(
  doc: DiagramDocument,
  point: Point,
  exclude?: ArrowId,
): ArrowId | null {
  let best: { id: ArrowId; distance: number } | null = null;
  for (const arrow of doc.arrows) {
    if (arrow.id === exclude) continue;
    const candidate = nearestPointOnArrow(doc, arrow.id, point);
    if (
      candidate &&
      candidate.distance <= 22 &&
      (!best || candidate.distance < best.distance)
    ) {
      best = { id: arrow.id, distance: candidate.distance };
    }
  }
  return best?.id ?? null;
}

function arrowAnchorFromPoint(
  doc: DiagramDocument,
  arrowId: ArrowId,
  point: Point,
): Extract<CanvasAnchor, { kind: 'arrow' }> | null {
  const arrow = doc.arrows.find((item) => item.id === arrowId);
  const nearest = nearestPointOnArrow(doc, arrowId, point);
  if (!arrow || !nearest) return null;
  const gridAnchor = arrowGridAnchors(doc, arrow)
    .map((anchor) => ({ anchor, distance: distance(point, anchor) }))
    .filter((candidate) => candidate.distance <= 24)
    .sort((left, right) => left.distance - right.distance)[0]?.anchor;
  return gridAnchor
    ? {
        kind: 'arrow',
        id: arrowId,
        t: gridAnchor.t,
        point: { x: gridAnchor.x, y: gridAnchor.y },
      }
    : {
        kind: 'arrow',
        id: arrowId,
        t: nearest.t,
        point: nearest.point,
      };
}

function anchorFromPoint(
  doc: DiagramDocument,
  point: Point,
  excludeArrow?: ArrowId,
): CanvasAnchor {
  const nodeId = hitNode(doc, point);
  if (nodeId) {
    const node = doc.nodes.find((item) => item.id === nodeId)!;
    return { kind: 'node', id: node.id, point: { x: node.x, y: node.y } };
  }
  const arrowId = hitArrow(doc, point, excludeArrow);
  if (arrowId) {
    const anchor = arrowAnchorFromPoint(doc, arrowId, point);
    if (anchor) return anchor;
  }
  return { kind: 'point', point: snapPointToMatrix(doc, point) };
}

export function connectionValidationError(
  source: CanvasAnchor,
  target: CanvasAnchor,
  requested: ConnectionMode,
): string | null {
  if (
    (source.kind === 'node' &&
      target.kind === 'node' &&
      source.id === target.id) ||
    (source.kind === 'arrow' &&
      target.kind === 'arrow' &&
      source.id === target.id) ||
    (source.kind === 'point' &&
      target.kind === 'point' &&
      distance(source.point, target.point) < 1)
  ) {
    return 'Drag to a different anchor to create a connection.';
  }
  const mode = resolveConnectionLevel(requested, source.kind, target.kind);
  if (
    mode === 'arrow' &&
    (source.kind === 'arrow' || target.kind === 'arrow')
  ) {
    return 'A 1-cell needs object endpoints; choose 2-cell for an arrow attachment.';
  }
  return null;
}

function CellGlyph({
  geometry,
  head,
  stroke,
}: {
  geometry: NonNullable<ReturnType<typeof getCellGeometry>>;
  head: 'arrow' | 'reverse' | 'none';
  stroke: 'solid' | 'dashed' | 'dotted' | 'none';
}) {
  const color = '#273244';
  const reverse = head === 'reverse';
  const hasHead = stroke !== 'none' && (head === 'arrow' || head === 'reverse');
  const tip = reverse ? geometry.start : geometry.end;
  const direction = reverse
    ? { x: -geometry.startTangent.x, y: -geometry.startTangent.y }
    : geometry.endTangent;
  const tipNormal = { x: direction.y, y: -direction.x };
  const shaftTip = {
    x: tip.x - direction.x * (head === 'arrow' || head === 'reverse' ? 8.5 : 0),
    y: tip.y - direction.y * (head === 'arrow' || head === 'reverse' ? 8.5 : 0),
  };
  const line = (amount: number) => {
    const start = {
      x: geometry.start.x + geometry.normal.x * amount,
      y: geometry.start.y + geometry.normal.y * amount,
    };
    const control = {
      x: geometry.control.x + geometry.normal.x * amount,
      y: geometry.control.y + geometry.normal.y * amount,
    };
    const end = {
      x: geometry.end.x + geometry.normal.x * amount,
      y: geometry.end.y + geometry.normal.y * amount,
    };
    const from = reverse
      ? {
          x: start.x + geometry.startTangent.x * (hasHead ? 8.5 : 0),
          y: start.y + geometry.startTangent.y * (hasHead ? 8.5 : 0),
        }
      : start;
    const to = reverse
      ? end
      : {
          x: end.x - geometry.endTangent.x * (hasHead ? 8.5 : 0),
          y: end.y - geometry.endTangent.y * (hasHead ? 8.5 : 0),
        };
    return (
      <path
        d={`M ${from.x} ${from.y} Q ${control.x} ${control.y} ${to.x} ${to.y}`}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap={stroke === 'dotted' ? 'round' : 'butt'}
        strokeDasharray={
          stroke === 'dashed' ? '9 6' : stroke === 'dotted' ? '1 6' : undefined
        }
        pointerEvents="none"
      />
    );
  };
  const wingA = {
    x: shaftTip.x + tipNormal.x * 5.8,
    y: shaftTip.y + tipNormal.y * 5.8,
  };
  const wingB = {
    x: shaftTip.x - tipNormal.x * 5.8,
    y: shaftTip.y - tipNormal.y * 5.8,
  };
  return (
    <>
      {stroke !== 'none' && line(-2.6)}
      {stroke !== 'none' && line(2.6)}
      {hasHead && (
        <path
          d={`M ${wingA.x} ${wingA.y} L ${tip.x} ${tip.y} L ${wingB.x} ${wingB.y}`}
          fill="none"
          stroke={color}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="none"
        />
      )}
    </>
  );
}

export function DiagramCanvas({
  doc,
  selections,
  editing,
  tool,
  connectionMode,
  showGrid,
  pendingNode,
  pendingArrow,
  onCanvasPoint,
  onSelect,
  onMarqueeSelect,
  onNodeAction,
  onArrowAction,
  onQuickNode,
  onQuickConnect,
  onMoveNodes,
  onSetArrowCurve,
  onPatchNode,
  onPatchArrow,
  onPatchCell,
  onChangeSelectionLevel,
  onBeginLabelEdit,
  onCommitLabel,
  onCancelLabelEdit,
  onStatus,
}: DiagramCanvasProps) {
  const language = useUiLanguage();
  const svgRef = useRef<SVGSVGElement>(null);
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [liveLabel, setLiveLabel] = useState<{
    selection: Selection;
    label: string;
  } | null>(null);
  const selectedKeys = useMemo(
    () => new Set(selections.map(selectionKey)),
    [selections],
  );
  const activeLabelEditorKey = editing
    ? selectionKey(editing)
    : selections.length === 1
      ? selectionKey(selections[0])
      : '';
  const effectiveLiveLabel =
    liveLabel && selectionKey(liveLabel.selection) === activeLabelEditorKey
      ? liveLabel
      : null;
  const gridColumns = sceneGridEdges(SCENE_WIDTH);
  const gridRows = sceneGridEdges(SCENE_HEIGHT);

  const clientToScene = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const scene = point.matrixTransform(matrix.inverse());
    return { x: scene.x, y: scene.y };
  };
  const capture = (pointerId: number) =>
    svgRef.current?.setPointerCapture(pointerId);
  const release = (pointerId: number) => {
    const svg = svgRef.current;
    if (svg?.hasPointerCapture(pointerId)) svg.releasePointerCapture(pointerId);
  };

  const previewDoc = useMemo(() => {
    let preview = doc;
    if (gesture?.kind === 'move') {
      preview = {
        ...doc,
        nodes: doc.nodes.map((node) =>
          gesture.positions[node.id]
            ? { ...node, ...gesture.positions[node.id] }
            : node,
        ),
      };
    } else if (gesture?.kind === 'curve') {
      preview = {
        ...doc,
        arrows: doc.arrows.map((arrow) =>
          arrow.id === gesture.arrow
            ? { ...arrow, curve: gesture.curve }
            : arrow,
        ),
      };
    } else if (gesture?.kind === 'cell-curve') {
      preview = {
        ...doc,
        cells: doc.cells.map((cell) =>
          cell.id === gesture.cell ? { ...cell, curve: gesture.curve } : cell,
        ),
      };
    }
    if (!effectiveLiveLabel) return preview;
    const { selection, label } = effectiveLiveLabel;
    return selection.kind === 'node'
      ? {
          ...preview,
          nodes: preview.nodes.map((node) =>
            node.id === selection.id ? { ...node, label } : node,
          ),
        }
      : selection.kind === 'arrow'
        ? {
            ...preview,
            arrows: preview.arrows.map((arrow) =>
              arrow.id === selection.id ? { ...arrow, label } : arrow,
            ),
          }
        : {
            ...preview,
            cells: preview.cells.map((cell) =>
              cell.id === selection.id ? { ...cell, label } : cell,
            ),
          };
  }, [doc, gesture, effectiveLiveLabel]);

  const beginConnect = (event: ReactPointerEvent, source: CanvasAnchor) => {
    event.preventDefault();
    event.stopPropagation();
    capture(event.pointerId);
    setGesture({
      kind: 'connect',
      pointerId: event.pointerId,
      source,
      current: source.point,
      clientStart: { x: event.clientX, y: event.clientY },
      moved: false,
      additive: additiveModifier(event),
    });
  };

  const beginMove = (event: ReactPointerEvent, id: NodeId) => {
    event.preventDefault();
    event.stopPropagation();
    if (additiveModifier(event)) {
      onSelect({ kind: 'node', id }, true);
      return;
    }
    const alreadySelected = selectedKeys.has(`node:${id}`);
    const ids = alreadySelected
      ? selections.filter((item) => item.kind === 'node').map((item) => item.id)
      : [id];
    if (!alreadySelected) onSelect({ kind: 'node', id });
    const starts: Record<NodeId, Point> = {};
    for (const nodeId of ids) {
      const node = doc.nodes.find((item) => item.id === nodeId);
      if (node) starts[nodeId] = { x: node.x, y: node.y };
    }
    if (!starts[id]) return;
    capture(event.pointerId);
    setGesture({
      kind: 'move',
      pointerId: event.pointerId,
      anchor: id,
      sceneStart: clientToScene(event.clientX, event.clientY),
      starts,
      positions: starts,
      clientStart: { x: event.clientX, y: event.clientY },
      moved: false,
      valid: true,
    });
  };

  const beginCurve = (event: ReactPointerEvent, arrow: ArrowId) => {
    const item = doc.arrows.find((candidate) => candidate.id === arrow);
    if (!item) return;
    event.preventDefault();
    event.stopPropagation();
    capture(event.pointerId);
    setGesture({
      kind: 'curve',
      pointerId: event.pointerId,
      arrow,
      curve: item.curve,
      clientStart: { x: event.clientX, y: event.clientY },
      moved: false,
    });
  };

  const beginCellCurve = (event: ReactPointerEvent, cell: string) => {
    const item = doc.cells.find((candidate) => candidate.id === cell);
    if (!item) return;
    event.preventDefault();
    event.stopPropagation();
    capture(event.pointerId);
    setGesture({
      kind: 'cell-curve',
      pointerId: event.pointerId,
      cell,
      curve: item.curve ?? 0,
      clientStart: { x: event.clientX, y: event.clientY },
      moved: false,
    });
  };

  const pointerMoved = (
    event: ReactPointerEvent,
    clientStart: Point,
    moved: boolean,
  ) =>
    moved ||
    Math.hypot(event.clientX - clientStart.x, event.clientY - clientStart.y) >=
      5;

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const point = clientToScene(event.clientX, event.clientY);
    const moved = pointerMoved(event, gesture.clientStart, gesture.moved);
    if (gesture.kind === 'connect' || gesture.kind === 'marquee') {
      setGesture({ ...gesture, current: point, moved });
      return;
    }
    if (gesture.kind === 'move') {
      const anchorStart = gesture.starts[gesture.anchor];
      const desired = snapPointToMatrix(doc, {
        x: anchorStart.x + point.x - gesture.sceneStart.x,
        y: anchorStart.y + point.y - gesture.sceneStart.y,
      });
      const delta = {
        x: desired.x - anchorStart.x,
        y: desired.y - anchorStart.y,
      };
      const positions = Object.fromEntries(
        Object.entries(gesture.starts).map(([id, start]) => [
          id,
          { x: start.x + delta.x, y: start.y + delta.y },
        ]),
      );
      setGesture({
        ...gesture,
        positions,
        moved,
        valid: canPlaceNodes(doc, positions),
      });
      return;
    }
    if (gesture.kind === 'cell-curve') {
      const cell = doc.cells.find((item) => item.id === gesture.cell);
      const geometry = cell ? getCellGeometry(doc, cell) : null;
      if (!cell || !geometry) return;
      let curve =
        Math.round(
          ((point.x - geometry.baseMidpoint.x) * geometry.baseNormal.x +
            (point.y - geometry.baseMidpoint.y) * geometry.baseNormal.y) /
            2,
        ) * 2;
      curve = clamp(curve, -220, 220);
      setGesture({ ...gesture, curve, moved });
      return;
    }
    const arrow = doc.arrows.find((item) => item.id === gesture.arrow);
    const geometry = arrow ? getArrowGeometry(doc, arrow) : null;
    const source = arrow
      ? doc.nodes.find((node) => node.id === arrow.source)
      : null;
    const target = arrow
      ? doc.nodes.find((node) => node.id === arrow.target)
      : null;
    if (!arrow || !geometry || !source || !target) return;
    const length = Math.hypot(target.x - source.x, target.y - source.y) || 1;
    const normal = {
      x: (target.y - source.y) / length,
      y: -(target.x - source.x) / length,
    };
    const base = {
      x: (geometry.start.x + geometry.end.x) / 2,
      y: (geometry.start.y + geometry.end.y) / 2,
    };
    let curve =
      Math.round(
        ((point.x - base.x) * normal.x + (point.y - base.y) * normal.y) / 2,
      ) * 2;
    curve = clamp(curve, -220, 220);
    curve = constrainArrowCurve(doc, arrow.id, curve);
    setGesture({ ...gesture, curve, moved });
  };

  const handlePointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const completed = gesture;
    release(event.pointerId);
    setGesture(null);
    if (completed.kind === 'connect') {
      if (!completed.moved) {
        if (completed.source.kind === 'point') {
          onSelect(null);
        } else if (completed.source.kind === 'node') {
          if (tool === 'arrow' && connectionMode === 'arrow')
            onNodeAction(completed.source.id);
          else
            onSelect(
              { kind: 'node', id: completed.source.id },
              completed.additive,
            );
        } else if (tool === 'cell') {
          onArrowAction(completed.source.id);
        } else {
          onSelect(
            { kind: 'arrow', id: completed.source.id },
            completed.additive,
          );
        }
        return;
      }
      const target = anchorFromPoint(
        doc,
        completed.current,
        completed.source.kind === 'arrow' ? completed.source.id : undefined,
      );
      const connectionError = connectionValidationError(
        completed.source,
        target,
        connectionMode,
      );
      if (connectionError) {
        onStatus(
          connectionError.startsWith('A 1-cell')
            ? ui(
                language,
                '一胞腔的端点必须是对象；若要附着到箭头，请选择二胞腔。',
                connectionError,
              )
            : ui(language, '请拖动到另一个锚点以创建连线。', connectionError),
        );
        return;
      }
      onQuickConnect(completed.source, target, connectionMode);
      return;
    }
    if (completed.kind === 'move') {
      if (!completed.moved) return;
      if (completed.valid) onMoveNodes(completed.positions);
      else
        onStatus(
          ui(
            language,
            '移动后会与另一个对象重叠，因此未作更改。',
            'That move would overlap another object, so nothing moved.',
          ),
        );
      return;
    }
    if (completed.kind === 'curve') {
      if (completed.moved) onSetArrowCurve(completed.arrow, completed.curve);
      return;
    }
    if (completed.kind === 'cell-curve') {
      if (completed.moved) {
        onPatchCell(completed.cell, { curve: completed.curve });
        onStatus(
          ui(
            language,
            `已将二胞腔弯曲度设为 ${completed.curve}。`,
            `Set 2-cell curvature to ${completed.curve}.`,
          ),
        );
      }
      return;
    }
    if (completed.moved) {
      onMarqueeSelect(
        selectionsInRect(doc, {
          x1: completed.start.x,
          y1: completed.start.y,
          x2: completed.current.x,
          y2: completed.current.y,
        }),
        completed.additive,
      );
    } else if (!completed.additive) {
      onSelect(null);
    }
  };

  const connectTarget =
    gesture?.kind === 'connect'
      ? anchorFromPoint(
          doc,
          gesture.current,
          gesture.source.kind === 'arrow' ? gesture.source.id : undefined,
        )
      : null;
  const previewMode =
    gesture?.kind === 'connect' && connectTarget
      ? resolveConnectionLevel(
          connectionMode,
          gesture.source.kind,
          connectTarget.kind,
        )
      : 'arrow';
  const connectionError =
    gesture?.kind === 'connect' && connectTarget
      ? connectionValidationError(gesture.source, connectTarget, connectionMode)
      : null;

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 size-full touch-none select-none"
      viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
      role="application"
      aria-label={ui(
        language,
        '可直接操作的范畴交换图画布',
        'Direct manipulation categorical diagram canvas',
      )}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={(event) => {
        if (gesture?.pointerId !== event.pointerId) return;
        release(event.pointerId);
        setGesture(null);
        onStatus(
          ui(language, '已取消当前手势。', 'Cancelled current gesture.'),
        );
      }}
      onLostPointerCapture={(event) => {
        if (gesture?.pointerId === event.pointerId) setGesture(null);
      }}
    >
      <defs>
        <marker
          id="xyq-canvas-arrow"
          viewBox="-10 -5 10 10"
          refX="0"
          refY="0"
          markerWidth="11"
          markerHeight="11"
          markerUnits="userSpaceOnUse"
          orient="auto"
          overflow="visible"
        >
          <path
            d="M -9 -4.75 L 0 0 L -9 4.75"
            fill="none"
            stroke="context-stroke"
            strokeWidth="1.65"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </marker>
        <marker
          id="xyq-canvas-twohead"
          viewBox="-15 -6 15 12"
          refX="0"
          refY="0"
          markerWidth="17"
          markerHeight="13"
          markerUnits="userSpaceOnUse"
          orient="auto"
          overflow="visible"
        >
          <path
            d="M -8 -5 L 0 0 L -8 5 M -14 -5 L -6 0 L -14 5"
            fill="none"
            stroke="context-stroke"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </marker>
        <marker
          id="xyq-canvas-hook"
          viewBox="0 -8 13 16"
          refX="0"
          refY="0"
          markerWidth="13"
          markerHeight="16"
          markerUnits="userSpaceOnUse"
          orient="auto"
          overflow="visible"
        >
          <path
            d="M 0 0 C 0 -7 8 -7 10 -2"
            fill="none"
            stroke="context-stroke"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </marker>
        <marker
          id="xyq-canvas-mapsto"
          viewBox="0 -8 9 16"
          refX="1"
          refY="0"
          markerWidth="9"
          markerHeight="16"
          markerUnits="userSpaceOnUse"
          orient="auto"
          overflow="visible"
        >
          <path
            d="M 1 -7 L 1 7"
            fill="none"
            stroke="context-stroke"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </marker>
      </defs>

      <rect
        data-canvas-background="true"
        x="0"
        y="0"
        width={SCENE_WIDTH}
        height={SCENE_HEIGHT}
        fill="transparent"
        pointerEvents="all"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          const point = clientToScene(event.clientX, event.clientY);
          if (tool === 'object') {
            onCanvasPoint(point);
            return;
          }
          if (tool === 'select' || tool === 'arrow' || tool === 'cell') {
            event.preventDefault();
            const snapped = snapPointToMatrix(doc, point);
            const nearGridPoint = distance(point, snapped) <= 19;
            if (nearGridPoint && !additiveModifier(event)) {
              beginConnect(event, { kind: 'point', point: snapped });
            } else if (tool === 'select') {
              capture(event.pointerId);
              setGesture({
                kind: 'marquee',
                pointerId: event.pointerId,
                start: point,
                current: point,
                clientStart: { x: event.clientX, y: event.clientY },
                moved: false,
                additive: additiveModifier(event),
              });
            }
          }
        }}
        onDoubleClick={(event) => {
          if (tool !== 'select') return;
          event.preventDefault();
          const point = clientToScene(event.clientX, event.clientY);
          onQuickNode(snapPointToMatrix(doc, point));
        }}
      />

      {showGrid && gridColumns.length > 1 && gridRows.length > 1 && (
        <g
          aria-label={ui(
            language,
            '对象居中的矩阵网格',
            'Object-centered matrix grid',
          )}
          pointerEvents="none"
        >
          {gridRows.map((y) => (
            <line
              key={`row-${y}`}
              x1={gridColumns[0]}
              y1={y}
              x2={gridColumns.at(-1)}
              y2={y}
              stroke="#5b5360"
              strokeWidth="1.15"
              opacity=".24"
            />
          ))}
          {gridColumns.map((x) => (
            <line
              key={`column-${x}`}
              x1={x}
              y1={gridRows[0]}
              x2={x}
              y2={gridRows.at(-1)}
              stroke="#5b5360"
              strokeWidth="1.15"
              opacity=".24"
            />
          ))}
        </g>
      )}

      <g aria-label="1-cells">
        {previewDoc.arrows.map((arrow) => {
          const geometry = getArrowGeometry(previewDoc, arrow);
          if (!geometry) return null;
          const selected = selectedKeys.has(`arrow:${arrow.id}`);
          const pending = pendingArrow === arrow.id;
          const target =
            connectTarget?.kind === 'arrow' && connectTarget.id === arrow.id;
          const invalidTarget = target && Boolean(connectionError);
          const source =
            gesture?.kind === 'connect' &&
            gesture.source.kind === 'arrow' &&
            gesture.source.id === arrow.id;
          const color = target
            ? invalidTarget
              ? '#b34b55'
              : '#238060'
            : selected || pending || source
              ? '#6c3f63'
              : arrow.color;
          const dash =
            arrow.stroke === 'dashed'
              ? '11 7'
              : arrow.stroke === 'dotted'
                ? '2 7.5'
                : undefined;
          const markerEnd =
            arrow.head === 'none'
              ? undefined
              : arrow.head === 'twohead'
                ? 'url(#xyq-canvas-twohead)'
                : 'url(#xyq-canvas-arrow)';
          const markerStart =
            arrow.tail === 'hook'
              ? 'url(#xyq-canvas-hook)'
              : arrow.tail === 'mapsto'
                ? 'url(#xyq-canvas-mapsto)'
                : undefined;
          const side = arrow.labelSide === 'left' ? 1 : -1;
          const labelGeometry = arrowPointAt(
            geometry,
            arrow.labelPosition ?? 0.5,
          );
          const labelX =
            labelGeometry.midpoint.x + labelGeometry.normal.x * 25 * side;
          const labelY =
            labelGeometry.midpoint.y + labelGeometry.normal.y * 25 * side;
          return (
            <g
              key={arrow.id}
              tabIndex={0}
              aria-label={`1-cell ${displayTex(arrow.label) || 'unlabelled'}`}
              className="cursor-crosshair outline-none"
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                if (tool === 'object') {
                  event.stopPropagation();
                  onArrowAction(arrow.id);
                  return;
                }
                const point = clientToScene(event.clientX, event.clientY);
                const anchor = arrowAnchorFromPoint(
                  previewDoc,
                  arrow.id,
                  point,
                );
                if (anchor) beginConnect(event, anchor);
              }}
              onDoubleClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onSelect({ kind: 'arrow', id: arrow.id });
                onBeginLabelEdit({ kind: 'arrow', id: arrow.id });
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onBeginLabelEdit({ kind: 'arrow', id: arrow.id });
                } else if (event.key === ' ') {
                  event.preventDefault();
                  onArrowAction(arrow.id);
                }
              }}
            >
              <path
                d={geometry.path}
                fill="none"
                stroke="transparent"
                strokeWidth="20"
                pointerEvents="stroke"
              />
              {(selected || target || source) && (
                <path
                  d={geometry.path}
                  fill="none"
                  stroke={
                    target ? (invalidTarget ? '#b34b55' : '#238060') : '#b88aa9'
                  }
                  strokeWidth={target ? 9 : 7}
                  opacity={target ? '.18' : '.16'}
                  pointerEvents="none"
                />
              )}
              {arrow.stroke === 'double' ? (
                <>
                  <path
                    d={offsetPath(geometry, -2.6)}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.9"
                    markerStart={markerStart}
                    pointerEvents="none"
                  />
                  <path
                    d={offsetPath(geometry, 2.6)}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.9"
                    markerEnd={markerEnd}
                    pointerEvents="none"
                  />
                </>
              ) : (
                <path
                  d={geometry.path}
                  fill="none"
                  stroke={color}
                  strokeWidth={selected || pending ? 2.5 : 1.9}
                  strokeDasharray={dash}
                  strokeLinecap={arrow.stroke === 'dotted' ? 'round' : 'butt'}
                  markerStart={markerStart}
                  markerEnd={markerEnd}
                  pointerEvents="none"
                />
              )}
              {arrow.label && (
                <MathLabel
                  tex={arrow.label}
                  x={labelX}
                  y={labelY}
                  width={Math.min(
                    250,
                    Math.max(52, displayTex(arrow.label).length * 11 + 28),
                  )}
                  color="#2b3040"
                  paper
                />
              )}
              {selected &&
                arrowGridAnchors(previewDoc, arrow).map((anchor) => (
                  <circle
                    key={`${arrow.id}-anchor-${anchor.x}-${anchor.y}`}
                    cx={anchor.x}
                    cy={anchor.y}
                    r="4.5"
                    fill="#fbfaf7"
                    stroke="#8a4e75"
                    strokeWidth="1.5"
                    pointerEvents="none"
                  />
                ))}
            </g>
          );
        })}
      </g>

      <g aria-label="2-cells">
        {previewDoc.cells.map((cell) => {
          const geometry = getCellGeometry(previewDoc, cell);
          if (!geometry) return null;
          const selected = selectedKeys.has(`cell:${cell.id}`);
          return (
            <g
              key={cell.id}
              tabIndex={0}
              aria-label={`2-cell ${displayTex(cell.label)}`}
              className="cursor-pointer outline-none"
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.stopPropagation();
                onSelect(
                  { kind: 'cell', id: cell.id },
                  additiveModifier(event),
                );
              }}
              onDoubleClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onSelect({ kind: 'cell', id: cell.id });
                onBeginLabelEdit({ kind: 'cell', id: cell.id });
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onBeginLabelEdit({ kind: 'cell', id: cell.id });
                }
              }}
            >
              <path
                d={geometry.path}
                fill="none"
                stroke="transparent"
                strokeWidth="22"
                pointerEvents="stroke"
              />
              {selected && (
                <circle
                  cx={geometry.midpoint.x}
                  cy={geometry.midpoint.y}
                  r="27"
                  fill="#8a4e75"
                  opacity=".09"
                  pointerEvents="none"
                />
              )}
              <CellGlyph
                geometry={geometry}
                head={resolvedCellHead(cell)}
                stroke={resolvedCellStroke(cell)}
              />
              <MathLabel
                tex={cell.label}
                x={geometry.midpoint.x + geometry.normal.x * 20}
                y={geometry.midpoint.y + geometry.normal.y * 20}
                width={Math.min(
                  220,
                  Math.max(52, displayTex(cell.label).length * 11 + 26),
                )}
                color="#273244"
                size={17}
                paper
              />
            </g>
          );
        })}
      </g>

      <g aria-label="Objects">
        {previewDoc.nodes.map((node) => {
          const metrics = nodeMetrics(node);
          const selected = selectedKeys.has(`node:${node.id}`);
          const pending = pendingNode === node.id;
          const target =
            connectTarget?.kind === 'node' && connectTarget.id === node.id;
          const invalidTarget = target && Boolean(connectionError);
          const invalid =
            gesture?.kind === 'move' &&
            !gesture.valid &&
            Boolean(gesture.positions[node.id]);
          return (
            <g
              key={node.id}
              transform={`translate(${node.x} ${node.y})`}
              tabIndex={0}
              aria-label={`Object ${displayTex(node.label) || 'unlabelled'}`}
              className="outline-none"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onBeginLabelEdit({ kind: 'node', id: node.id });
                } else if (event.key === ' ') {
                  event.preventDefault();
                  onNodeAction(node.id);
                }
              }}
            >
              <rect
                x={-metrics.width / 2 - 14}
                y={-metrics.height / 2 - 13}
                width={metrics.width + 28}
                height={metrics.height + 26}
                rx="12"
                fill="none"
                stroke={
                  invalid
                    ? '#b34b55'
                    : selected || pending
                      ? '#8a4e75'
                      : 'transparent'
                }
                strokeWidth="10"
                opacity={invalid ? '.23' : selected || pending ? '.13' : '0'}
                pointerEvents={tool === 'select' ? 'stroke' : 'none'}
                className="cursor-move"
                onPointerDown={(event) => beginMove(event, node.id)}
              />
              <rect
                data-node-id={node.id}
                x={-metrics.width / 2 - 7}
                y={-metrics.height / 2 - 6}
                width={metrics.width + 14}
                height={metrics.height + 12}
                rx="9"
                fill={
                  target
                    ? invalidTarget
                      ? '#fbeaec'
                      : '#e5f5ed'
                    : selected || pending
                      ? '#f4eaf1'
                      : node.ghost
                        ? '#ffffff99'
                        : 'transparent'
                }
                stroke={
                  target
                    ? invalidTarget
                      ? '#b34b55'
                      : '#238060'
                    : selected || pending
                      ? '#8a4e75'
                      : node.ghost
                        ? '#9ca3af'
                        : 'transparent'
                }
                strokeWidth={target || selected || pending ? 1.55 : 1.2}
                strokeDasharray={node.ghost ? '4 4' : undefined}
                opacity={node.ghost && !selected ? 0.68 : 1}
                pointerEvents="all"
                className="cursor-crosshair"
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  if (tool === 'object') {
                    event.stopPropagation();
                    onNodeAction(node.id);
                    return;
                  }
                  if (tool === 'select' && selected) {
                    beginMove(event, node.id);
                    return;
                  }
                  beginConnect(event, {
                    kind: 'node',
                    id: node.id,
                    point: { x: node.x, y: node.y },
                  });
                }}
                onDoubleClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onSelect({ kind: 'node', id: node.id });
                  onBeginLabelEdit({ kind: 'node', id: node.id });
                }}
              />
              {node.ghost ? (
                <>
                  <path
                    d="M -6 0 L 6 0 M 0 -6 L 0 6"
                    stroke="#7c8291"
                    strokeWidth="1.5"
                    pointerEvents="none"
                  />
                  <circle
                    r="3"
                    fill="#ffffff"
                    stroke="#7c8291"
                    pointerEvents="none"
                  />
                </>
              ) : (
                <MathLabel
                  tex={node.label}
                  x={0}
                  y={0}
                  width={nodeLabelWidth(node) + 20}
                  height={50}
                  color="#1f2532"
                  size={22}
                  anchor="first"
                />
              )}
              {(selected || pending) && (
                <>
                  <circle
                    cx={-metrics.width / 2 - 12}
                    cy="0"
                    r="5"
                    fill="#8a4e75"
                    stroke="#fbfaf7"
                    strokeWidth="1.6"
                    pointerEvents="all"
                    className="cursor-crosshair"
                    onPointerDown={(event) => {
                      if (tool === 'object') return;
                      beginConnect(event, {
                        kind: 'node',
                        id: node.id,
                        point: { x: node.x, y: node.y },
                      });
                    }}
                  />
                  <circle
                    cx={metrics.width / 2 + 12}
                    cy="0"
                    r="5"
                    fill="#8a4e75"
                    stroke="#fbfaf7"
                    strokeWidth="1.6"
                    pointerEvents="all"
                    className="cursor-crosshair"
                    onPointerDown={(event) => {
                      if (tool === 'object') return;
                      beginConnect(event, {
                        kind: 'node',
                        id: node.id,
                        point: { x: node.x, y: node.y },
                      });
                    }}
                  />
                </>
              )}
            </g>
          );
        })}
      </g>

      {selections.length === 1 &&
        selections[0].kind === 'node' &&
        tool === 'select' &&
        !editing &&
        !gesture &&
        (() => {
          const node = previewDoc.nodes.find(
            (item) => item.id === selections[0].id,
          );
          if (!node) return null;
          const committedNode =
            doc.nodes.find((item) => item.id === node.id) ?? node;
          const width = 330;
          const height = 76;
          const position = floatingPanelPosition(node, width, height);
          return (
            <foreignObject
              x={position.x}
              y={position.y}
              width={width}
              height={height}
              overflow="visible"
              pointerEvents="all"
            >
              <div
                className="size-full"
                onPointerDown={(event) => event.stopPropagation()}
                onDoubleClick={(event) => event.stopPropagation()}
              >
                <FloatingNodeEditor
                  key={node.id}
                  node={committedNode}
                  onCommitLabel={(label) => {
                    setLiveLabel(null);
                    onCommitLabel({ kind: 'node', id: node.id }, label);
                  }}
                  onPreviewLabel={(label) =>
                    setLiveLabel(
                      label === null
                        ? null
                        : {
                            selection: { kind: 'node', id: node.id },
                            label,
                          },
                    )
                  }
                  onPatch={(patch) => onPatchNode(node.id, patch)}
                />
              </div>
            </foreignObject>
          );
        })()}

      {selections.length === 1 &&
        selections[0].kind === 'cell' &&
        tool === 'select' &&
        (() => {
          const cell = previewDoc.cells.find(
            (item) => item.id === selections[0].id,
          );
          const geometry = cell ? getCellGeometry(previewDoc, cell) : null;
          if (!cell || !geometry) return null;
          return (
            <g aria-label="2-cell curvature control">
              <line
                x1={geometry.baseMidpoint.x}
                y1={geometry.baseMidpoint.y}
                x2={geometry.control.x}
                y2={geometry.control.y}
                stroke="#8a4e75"
                strokeWidth="1"
                strokeDasharray="3 4"
                opacity=".45"
                pointerEvents="none"
              />
              <circle
                cx={geometry.control.x}
                cy={geometry.control.y}
                r="7"
                fill="#fbfaf7"
                stroke="#8a4e75"
                strokeWidth="2"
                className="cursor-ns-resize"
                pointerEvents="all"
                onPointerDown={(event) => beginCellCurve(event, cell.id)}
                onDoubleClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onPatchCell(cell.id, { curve: 0 });
                }}
              />
            </g>
          );
        })()}

      {selections.length === 1 &&
        selections[0].kind === 'arrow' &&
        tool === 'select' &&
        (() => {
          const arrow = previewDoc.arrows.find(
            (item) => item.id === selections[0].id,
          );
          const geometry = arrow ? getArrowGeometry(previewDoc, arrow) : null;
          if (!arrow || !geometry) return null;
          const midpoint = {
            x: (geometry.start.x + geometry.end.x) / 2,
            y: (geometry.start.y + geometry.end.y) / 2,
          };
          return (
            <g aria-label="Curvature control">
              <line
                x1={midpoint.x}
                y1={midpoint.y}
                x2={geometry.control.x}
                y2={geometry.control.y}
                stroke="#8a4e75"
                strokeWidth="1"
                strokeDasharray="3 4"
                opacity=".45"
                pointerEvents="none"
              />
              <circle
                cx={geometry.control.x}
                cy={geometry.control.y}
                r="7"
                fill="#fbfaf7"
                stroke="#8a4e75"
                strokeWidth="2"
                className="cursor-ns-resize"
                pointerEvents="all"
                onPointerDown={(event) => beginCurve(event, arrow.id)}
                onDoubleClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onSetArrowCurve(arrow.id, 0);
                }}
              />
            </g>
          );
        })()}

      {selections.length === 1 &&
        selections[0].kind === 'arrow' &&
        tool !== 'object' &&
        !editing &&
        !gesture &&
        (() => {
          const arrow = previewDoc.arrows.find(
            (item) => item.id === selections[0].id,
          );
          const geometry = arrow ? getArrowGeometry(previewDoc, arrow) : null;
          if (!arrow || !geometry) return null;
          const committedArrow =
            doc.arrows.find((item) => item.id === arrow.id) ?? arrow;
          const width = 330;
          const height = 122;
          const position = floatingPanelPosition(
            geometry.midpoint,
            width,
            height,
            geometry.control,
          );
          return (
            <foreignObject
              x={position.x}
              y={position.y}
              width={width}
              height={height}
              overflow="visible"
              pointerEvents="all"
            >
              <div
                className="size-full"
                onPointerDown={(event) => event.stopPropagation()}
                onDoubleClick={(event) => event.stopPropagation()}
              >
                <FloatingCellEditor
                  key={arrow.id}
                  item={{ kind: 'arrow', value: committedArrow }}
                  onChangeLevel={(level, label) =>
                    onChangeSelectionLevel(
                      { kind: 'arrow', id: arrow.id },
                      level,
                      label,
                    )
                  }
                  onCommitLabel={(label) => {
                    setLiveLabel(null);
                    onCommitLabel({ kind: 'arrow', id: arrow.id }, label);
                  }}
                  onPreviewLabel={(label) =>
                    setLiveLabel(
                      label === null
                        ? null
                        : {
                            selection: { kind: 'arrow', id: arrow.id },
                            label,
                          },
                    )
                  }
                  onPatchArrow={(patch) => onPatchArrow(arrow.id, patch)}
                />
              </div>
            </foreignObject>
          );
        })()}

      {selections.length === 1 &&
        selections[0].kind === 'cell' &&
        tool !== 'object' &&
        !editing &&
        !gesture &&
        (() => {
          const cell = previewDoc.cells.find(
            (item) => item.id === selections[0].id,
          );
          const geometry = cell ? getCellGeometry(previewDoc, cell) : null;
          if (!cell || !geometry) return null;
          const committedCell =
            doc.cells.find((item) => item.id === cell.id) ?? cell;
          const width = 330;
          const height = 122;
          const position = floatingPanelPosition(
            geometry.midpoint,
            width,
            height,
            geometry.control,
          );
          return (
            <foreignObject
              x={position.x}
              y={position.y}
              width={width}
              height={height}
              overflow="visible"
              pointerEvents="all"
            >
              <div
                className="size-full"
                onPointerDown={(event) => event.stopPropagation()}
                onDoubleClick={(event) => event.stopPropagation()}
              >
                <FloatingCellEditor
                  key={cell.id}
                  item={{ kind: 'cell', value: committedCell }}
                  onChangeLevel={(level, label) =>
                    onChangeSelectionLevel(
                      { kind: 'cell', id: cell.id },
                      level,
                      label,
                    )
                  }
                  onCommitLabel={(label) => {
                    setLiveLabel(null);
                    onCommitLabel({ kind: 'cell', id: cell.id }, label);
                  }}
                  onPreviewLabel={(label) =>
                    setLiveLabel(
                      label === null
                        ? null
                        : {
                            selection: { kind: 'cell', id: cell.id },
                            label,
                          },
                    )
                  }
                  onPatchCell={(patch) => onPatchCell(cell.id, patch)}
                />
              </div>
            </foreignObject>
          );
        })()}

      {gesture?.kind === 'connect' && gesture.moved && connectTarget && (
        <g pointerEvents="none">
          {previewMode === 'arrow' ? (
            <path
              d={`M ${gesture.source.point.x} ${gesture.source.point.y} L ${connectTarget.point.x} ${connectTarget.point.y}`}
              fill="none"
              stroke={connectionError ? '#b34b55' : '#8a4e75'}
              strokeWidth="2"
              strokeDasharray="7 6"
              markerEnd="url(#xyq-canvas-arrow)"
              opacity=".78"
            />
          ) : (
            <>
              <path
                d={`M ${gesture.source.point.x - 2} ${gesture.source.point.y} L ${connectTarget.point.x - 2} ${connectTarget.point.y}`}
                fill="none"
                stroke={connectionError ? '#b34b55' : '#273244'}
                strokeWidth="1.6"
                strokeDasharray="6 5"
                opacity=".78"
              />
              <path
                d={`M ${gesture.source.point.x + 2} ${gesture.source.point.y} L ${connectTarget.point.x + 2} ${connectTarget.point.y}`}
                fill="none"
                stroke={connectionError ? '#b34b55' : '#273244'}
                strokeWidth="1.6"
                strokeDasharray="6 5"
                markerEnd="url(#xyq-canvas-arrow)"
                opacity=".78"
              />
            </>
          )}
          {connectTarget.kind === 'point' && (
            <circle
              cx={connectTarget.point.x}
              cy={connectTarget.point.y}
              r="11"
              fill={connectionError ? '#fbeaec' : '#f4eaf1'}
              stroke={connectionError ? '#b34b55' : '#8a4e75'}
              strokeWidth="1.5"
            />
          )}
        </g>
      )}

      {gesture?.kind === 'marquee' && gesture.moved && (
        <rect
          x={Math.min(gesture.start.x, gesture.current.x)}
          y={Math.min(gesture.start.y, gesture.current.y)}
          width={Math.abs(gesture.current.x - gesture.start.x)}
          height={Math.abs(gesture.current.y - gesture.start.y)}
          fill="#8a4e75"
          fillOpacity=".07"
          stroke="#8a4e75"
          strokeWidth="1.4"
          strokeDasharray="6 5"
          pointerEvents="none"
        />
      )}

      {editing && (
        <InlineLabelEditor
          key={selectionKey(editing)}
          doc={previewDoc}
          selection={editing}
          onCommit={onCommitLabel}
          onCancel={onCancelLabelEdit}
          onPreview={(label) =>
            setLiveLabel(label === null ? null : { selection: editing, label })
          }
        />
      )}
    </svg>
  );
}

export function canvasAnchorToCellAnchor(
  anchor: CanvasAnchor,
): CellAnchor | null {
  if (anchor.kind === 'node') return { kind: 'node', id: anchor.id };
  if (anchor.kind === 'arrow') {
    return { kind: 'arrow', id: anchor.id, t: anchor.t };
  }
  return null;
}

export function connectionIsNativeParallel(
  doc: DiagramDocument,
  source: CanvasAnchor,
  target: CanvasAnchor,
) {
  if (source.kind !== 'arrow' || target.kind !== 'arrow') return false;
  const sourceArrow = doc.arrows.find((item) => item.id === source.id);
  const targetArrow = doc.arrows.find((item) => item.id === target.id);
  return Boolean(
    sourceArrow && targetArrow && areParallel(sourceArrow, targetArrow),
  );
}

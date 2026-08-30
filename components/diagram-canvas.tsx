'use client';

import { useEffect, useRef, useState } from 'react';
import katex from 'katex';

import {
  displayTex,
  getArrowGeometry,
  getCellGeometry,
  nodeMetrics,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  snap,
  type ArrowId,
  type DiagramDocument,
  type NodeId,
  type Point,
  type Selection,
} from '@/lib/diagram';

export type EditorTool = 'select' | 'object' | 'arrow' | 'cell';

interface DiagramCanvasProps {
  doc: DiagramDocument;
  selection: Selection | null;
  tool: EditorTool;
  pendingNode: NodeId | null;
  pendingArrow: ArrowId | null;
  onCanvasPoint: (point: Point) => void;
  onSelect: (selection: Selection | null) => void;
  onNodeAction: (id: NodeId) => void;
  onArrowAction: (id: ArrowId) => void;
  onBeginNodeDrag: (id: NodeId) => void;
  onMoveNode: (id: NodeId, point: Point) => void;
  onEndNodeDrag: () => void;
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
  size = 15,
  paper = false,
}: {
  tex: string;
  x: number;
  y: number;
  width: number;
  height?: number;
  color?: string;
  size?: number;
  paper?: boolean;
}) {
  const html = katex.renderToString(tex || '\\cdot', {
    displayMode: false,
    throwOnError: false,
    strict: 'ignore',
    output: 'html',
  });
  return (
    <foreignObject
      x={x - width / 2}
      y={y - height / 2}
      width={width}
      height={height}
      overflow="visible"
      pointerEvents="none"
    >
      <div
        className="flex size-full items-center justify-center leading-none"
        style={{ color, fontSize: `${size}px` }}
      >
        <span
          className={paper ? 'rounded-[4px] bg-[#fbfaf7]/95 px-1.5 py-0.5' : ''}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </foreignObject>
  );
}

export function DiagramCanvas({
  doc,
  selection,
  tool,
  pendingNode,
  pendingArrow,
  onCanvasPoint,
  onSelect,
  onNodeAction,
  onArrowAction,
  onBeginNodeDrag,
  onMoveNode,
  onEndNodeDrag,
}: DiagramCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{ id: NodeId; pointerId: number } | null>(null);

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

  useEffect(() => {
    if (!drag) return;
    const move = (event: PointerEvent) => {
      if (event.pointerId !== drag.pointerId) return;
      const point = clientToScene(event.clientX, event.clientY);
      onMoveNode(drag.id, {
        x: Math.max(40, Math.min(SCENE_WIDTH - 40, snap(point.x))),
        y: Math.max(40, Math.min(SCENE_HEIGHT - 40, snap(point.y))),
      });
    };
    const end = (event: PointerEvent) => {
      if (event.pointerId !== drag.pointerId) return;
      setDrag(null);
      onEndNodeDrag();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, [drag, onEndNodeDrag, onMoveNode]);

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 size-full touch-none select-none"
      viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
      role="application"
      aria-label="Interactive categorical diagram canvas"
      onClick={(event) => {
        const target = event.target as SVGElement;
        if (
          event.target !== event.currentTarget &&
          target.dataset.canvasBackground !== 'true'
        )
          return;
        if (tool === 'select') onSelect(null);
        onCanvasPoint(clientToScene(event.clientX, event.clientY));
      }}
    >
      <defs>
        <marker
          id="xyq-canvas-arrow"
          viewBox="-10 -5 10 10"
          refX="0"
          refY="0"
          markerWidth="9"
          markerHeight="9"
          markerUnits="userSpaceOnUse"
          orient="auto"
          overflow="visible"
        >
          <path
            d="M -8 -4.25 L 0 0 L -8 4.25"
            fill="none"
            stroke="#273244"
            strokeWidth="1.45"
            strokeLinejoin="round"
          />
        </marker>
        <marker
          id="xyq-canvas-twohead"
          viewBox="-15 -6 15 12"
          refX="0"
          refY="0"
          markerWidth="15"
          markerHeight="12"
          markerUnits="userSpaceOnUse"
          orient="auto"
          overflow="visible"
        >
          <path
            d="M -8 -5 L 0 0 L -8 5 M -14 -5 L -6 0 L -14 5"
            fill="none"
            stroke="#273244"
            strokeWidth="1.8"
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
      />

      <g aria-label="1-cells">
        {doc.arrows.map((arrow) => {
          const geometry = getArrowGeometry(doc, arrow);
          if (!geometry) return null;
          const selected = selection?.kind === 'arrow' && selection.id === arrow.id;
          const pending = pendingArrow === arrow.id;
          const color = selected || pending ? '#6c3f63' : arrow.color;
          const dash =
            arrow.stroke === 'dashed'
              ? '10 7'
              : arrow.stroke === 'dotted'
                ? '2 7'
                : undefined;
          const markerEnd =
            arrow.head === 'none'
              ? undefined
              : arrow.head === 'twohead'
                ? 'url(#xyq-canvas-twohead)'
                : 'url(#xyq-canvas-arrow)';
          const labelSide = arrow.labelSide === 'left' ? 1 : -1;
          const labelX = geometry.midpoint.x + geometry.normal.x * 23 * labelSide;
          const labelY = geometry.midpoint.y + geometry.normal.y * 23 * labelSide;
          return (
            <g
              key={arrow.id}
              role="button"
              tabIndex={0}
              aria-label={`1-cell ${displayTex(arrow.label) || 'unlabelled'}`}
              className="cursor-pointer outline-none"
              onClick={(event) => {
                event.stopPropagation();
                onArrowAction(arrow.id);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onArrowAction(arrow.id);
                }
              }}
            >
              <path
                d={geometry.path}
                fill="none"
                stroke="transparent"
                strokeWidth="18"
                pointerEvents="stroke"
              />
              {selected && (
                <path
                  d={geometry.path}
                  fill="none"
                  stroke="#b88aa9"
                  strokeWidth="7"
                  opacity=".18"
                />
              )}
              {arrow.stroke === 'double' ? (
                <>
                  <path
                    d={offsetPath(geometry, -2.6)}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.7"
                  />
                  <path
                    d={offsetPath(geometry, 2.6)}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.7"
                    markerEnd={markerEnd}
                  />
                </>
              ) : (
                <path
                  d={geometry.path}
                  fill="none"
                  stroke={color}
                  strokeWidth={selected || pending ? 2.35 : 1.65}
                  strokeDasharray={dash}
                  strokeLinecap={arrow.stroke === 'dotted' ? 'round' : 'butt'}
                  markerEnd={markerEnd}
                />
              )}
              {arrow.label && (
                <MathLabel
                  tex={arrow.label}
                  x={labelX}
                  y={labelY}
                  width={Math.min(250, Math.max(48, displayTex(arrow.label).length * 10 + 26))}
                  color="#2b3040"
                  paper
                />
              )}
            </g>
          );
        })}
      </g>

      <g aria-label="2-cells">
        {doc.cells.map((cell) => {
          const geometry = getCellGeometry(doc, cell);
          if (!geometry) return null;
          const selected = selection?.kind === 'cell' && selection.id === cell.id;
          const color = selected ? '#5b284d' : cell.color;
          const shaftEnd = {
            x: geometry.end.x - geometry.direction.x * 7,
            y: geometry.end.y - geometry.direction.y * 7,
          };
          const wingA = {
            x: shaftEnd.x + geometry.normal.x * 5,
            y: shaftEnd.y + geometry.normal.y * 5,
          };
          const wingB = {
            x: shaftEnd.x - geometry.normal.x * 5,
            y: shaftEnd.y - geometry.normal.y * 5,
          };
          const line = (amount: number) => {
            const x1 = geometry.start.x + geometry.normal.x * amount;
            const y1 = geometry.start.y + geometry.normal.y * amount;
            const x2 = shaftEnd.x + geometry.normal.x * amount;
            const y2 = shaftEnd.y + geometry.normal.y * amount;
            return (
              <path
                d={`M ${x1} ${y1} L ${x2} ${y2}`}
                fill="none"
                stroke={color}
                strokeWidth={selected ? 2.25 : 1.55}
                strokeLinecap="round"
              />
            );
          };
          return (
            <g
              key={cell.id}
              role="button"
              tabIndex={0}
              aria-label={`2-cell ${displayTex(cell.label)}, from ${cell.sourceArrow} to ${cell.targetArrow}`}
              className="cursor-pointer outline-none"
              onClick={(event) => {
                event.stopPropagation();
                onSelect({ kind: 'cell', id: cell.id });
              }}
            >
              <path
                d={`M ${geometry.start.x} ${geometry.start.y} L ${geometry.end.x} ${geometry.end.y}`}
                fill="none"
                stroke="transparent"
                strokeWidth="20"
                pointerEvents="stroke"
              />
              {selected && (
                <circle
                  cx={geometry.midpoint.x}
                  cy={geometry.midpoint.y}
                  r="27"
                  fill="#8a4e75"
                  opacity=".1"
                />
              )}
              {line(-2.6)}
              {line(2.6)}
              <path
                d={`M ${wingA.x} ${wingA.y} L ${geometry.end.x} ${geometry.end.y} L ${wingB.x} ${wingB.y}`}
                fill="none"
                stroke={color}
                strokeWidth={selected ? 2.25 : 1.55}
                strokeLinecap="round"
                strokeLinejoin="round"
                pointerEvents="none"
              />
              <MathLabel
                tex={cell.label}
                x={geometry.midpoint.x + geometry.normal.x * 18}
                y={geometry.midpoint.y + geometry.normal.y * 18}
                width={Math.min(220, Math.max(48, displayTex(cell.label).length * 10 + 24))}
                color="#6c3f63"
                size={15.5}
                paper
              />
            </g>
          );
        })}
      </g>

      <g aria-label="Objects">
        {doc.nodes.map((node) => {
          const metrics = nodeMetrics(node);
          const selected = selection?.kind === 'node' && selection.id === node.id;
          const pending = pendingNode === node.id;
          return (
            <g
              key={node.id}
              role="button"
              tabIndex={0}
              aria-label={`${node.ghost ? 'Phantom anchor' : 'Object'} ${displayTex(node.label)}`}
              className={tool === 'select' ? 'group cursor-grab outline-none active:cursor-grabbing' : 'group cursor-crosshair outline-none'}
              transform={`translate(${node.x} ${node.y})`}
              onPointerDown={(event) => {
                if (tool !== 'select') return;
                event.preventDefault();
                event.stopPropagation();
                onSelect({ kind: 'node', id: node.id });
                onBeginNodeDrag(node.id);
                setDrag({ id: node.id, pointerId: event.pointerId });
              }}
              onClick={(event) => {
                event.stopPropagation();
                if (tool !== 'select') onNodeAction(node.id);
                else onSelect({ kind: 'node', id: node.id });
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onNodeAction(node.id);
                }
              }}
            >
              <rect
                x={-metrics.width / 2 - 7}
                y={-metrics.height / 2 - 6}
                width={metrics.width + 14}
                height={metrics.height + 12}
                rx="9"
                fill={selected || pending ? '#f4eaf1' : node.ghost ? '#ffffff99' : 'transparent'}
                stroke={selected || pending ? '#8a4e75' : node.ghost ? '#9ca3af' : 'transparent'}
                strokeWidth={selected || pending ? 1.6 : 1.2}
                strokeDasharray={node.ghost ? '4 4' : undefined}
                opacity={node.ghost && !selected ? 0.68 : 1}
              />
              {node.ghost ? (
                <>
                  <path d="M -6 0 L 6 0 M 0 -6 L 0 6" stroke="#7c8291" strokeWidth="1.5" />
                  <circle r="3" fill="#ffffff" stroke="#7c8291" />
                </>
              ) : (
                <MathLabel
                  tex={node.label}
                  x={0}
                  y={0}
                  width={metrics.width + 34}
                  height={50}
                  color="#1f2532"
                  size={19}
                />
              )}
              {(selected || pending) && (
                <>
                  <circle cx={-metrics.width / 2 - 7} cy="0" r="3.8" fill="#8a4e75" stroke="#fbfaf7" strokeWidth="1.7" />
                  <circle cx={metrics.width / 2 + 7} cy="0" r="3.8" fill="#8a4e75" stroke="#fbfaf7" strokeWidth="1.7" />
                </>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

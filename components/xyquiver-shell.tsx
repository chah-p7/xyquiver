'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import {
  ArrowLeftRight,
  ArrowRight,
  Braces,
  ChevronDown,
  CirclePlus,
  Code2,
  Copy,
  Download,
  FileJson,
  FolderOpen,
  MousePointer2,
  PanelBottomClose,
  Redo2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Undo2,
} from 'lucide-react';

import {
  DiagramCanvas,
  canvasAnchorToCellAnchor,
  connectionValidationError,
  type CanvasAnchor,
  type ConnectionMode,
  type EditorTool,
} from '@/components/diagram-canvas';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  areParallel,
  cellCreationConflict,
  cellBoundaryPaths,
  cellSourceAnchor,
  cellTargetAnchor,
  cloneDocument,
  constrainArrowCurve,
  deleteSelections,
  displayTex,
  exampleDocuments,
  generateSvg,
  generateXyPic,
  inferCellBoundaryPaths,
  isNativeParallelCell,
  matrixAxes,
  selectionKey,
  snapPointToMatrix,
  validateDocument,
  type ArrowId,
  type ArrowHead,
  type ArrowStroke,
  type ArrowTail,
  type CellAnchor,
  type CellHead,
  type DiagramArrow,
  type DiagramDocument,
  type DiagramNode,
  type DiagramTwoCell,
  type NodeId,
  type Point,
  type Selection,
} from '@/lib/diagram';

interface HistoryState {
  past: DiagramDocument[];
  present: DiagramDocument;
  future: DiagramDocument[];
}

const tools: Array<{
  id: EditorTool;
  label: string;
  key: string;
  icon: typeof MousePointer2;
}> = [
  { id: 'select', label: 'Select', key: 'V', icon: MousePointer2 },
  { id: 'object', label: 'Object', key: 'O', icon: CirclePlus },
  { id: 'arrow', label: '1-cell', key: 'A', icon: ArrowRight },
  { id: 'cell', label: '2-cell', key: 'T', icon: Sparkles },
];

const examples = [
  { id: 'quasicategory', label: 'Quasi-category composition 2-simplex' },
  { id: 'showcase', label: 'Pasting of 2-cells' },
  { id: 'twocell', label: 'Native 2-cell' },
  { id: 'parallel', label: 'Parallel deformation arrows' },
  { id: 'homotopy', label: 'Homotopy stabilization' },
  { id: 'snake', label: 'Snake lemma' },
  { id: 'blank', label: 'Blank diagram' },
] as const;

const storageKey = 'xyquiver:document:v4';
const greekLabels = ['\\alpha', '\\beta', '\\gamma', '\\delta', '\\eta'];
const arrowLabels = ['F', 'G', 'H', 'K', 'L', 'M'];

const arrowStrokeOptions: Array<{ value: ArrowStroke; label: string }> = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'double', label: 'Double' },
];

const arrowTailOptions: Array<{ value: ArrowTail; label: string }> = [
  { value: 'none', label: 'Plain' },
  { value: 'mapsto', label: 'Maps to' },
  { value: 'hook', label: 'Hook' },
];

const arrowHeadOptions: Array<{ value: ArrowHead; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'arrow', label: 'Arrow' },
  { value: 'twohead', label: 'Two heads' },
];

function makeId(prefix: string) {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${id}`;
}

function downloadText(text: string, filename: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  requestAnimationFrame(() => URL.revokeObjectURL(url));
}

function DraftInput({
  value,
  onCommit,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'onBlur'> & {
  value: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    if (draft !== value) onCommit(draft);
  };
  return (
    <Input
      {...props}
      className={className}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
          event.currentTarget.blur();
        }
        if (event.key === 'Escape') {
          setDraft(value);
          event.currentTarget.blur();
        }
      }}
    />
  );
}

function ArrowStylePreview({
  stroke,
  head,
  tail,
  className,
}: Pick<DiagramArrow, 'stroke' | 'head' | 'tail'> & {
  className?: string;
}) {
  const dash =
    stroke === 'dashed' ? '9 5' : stroke === 'dotted' ? '1 6' : undefined;
  const bodyRows = stroke === 'double' ? [13, 19] : [16];
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: stroke === 'double' ? 1.6 : 1.8,
    strokeLinecap: 'round' as const,
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 32"
      className={className ?? 'size-auto h-7 w-full'}
    >
      {bodyRows.map((y) => (
        <path
          key={y}
          d={`M 16 ${y} L 84 ${y}`}
          {...common}
          strokeDasharray={dash}
        />
      ))}
      {tail === 'mapsto' && <path d="M 17 8 L 17 24" {...common} />}
      {tail === 'hook' && <path d="M 17 16 C 17 7 27 7 29 12" {...common} />}
      {head !== 'none' && <path d="M 76 9 L 85 16 L 76 23" {...common} />}
      {head === 'twohead' && <path d="M 69 9 L 78 16 L 69 23" {...common} />}
    </svg>
  );
}

function ArrowStyleChoice({
  label,
  selected,
  arrow,
  patch,
  onSelect,
}: {
  label: string;
  selected: boolean;
  arrow: DiagramArrow;
  patch: Partial<DiagramArrow>;
  onSelect: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={selected ? 'secondary' : 'outline'}
      className="h-auto min-h-14 flex-col gap-0.5 rounded-lg px-2 py-1.5"
      aria-pressed={selected}
      title={label}
      onClick={onSelect}
    >
      <ArrowStylePreview
        stroke={patch.stroke ?? arrow.stroke}
        head={patch.head ?? arrow.head}
        tail={patch.tail ?? arrow.tail}
        className="size-auto h-6 w-full"
      />
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </Button>
  );
}

function arrowStyleSummary(arrow: DiagramArrow) {
  const stroke = arrowStrokeOptions.find(
    (option) => option.value === arrow.stroke,
  )?.label;
  const tail = arrowTailOptions.find(
    (option) => option.value === arrow.tail,
  )?.label;
  const head = arrowHeadOptions.find(
    (option) => option.value === arrow.head,
  )?.label;
  return [tail === 'Plain' ? null : tail, stroke, head]
    .filter(Boolean)
    .join(' · ');
}

function anchorName(doc: DiagramDocument, anchor: CellAnchor | null) {
  if (!anchor) return '—';
  if (anchor.kind === 'node') {
    return displayTex(
      doc.nodes.find((item) => item.id === anchor.id)?.label ?? 'object',
    );
  }
  return displayTex(
    doc.arrows.find((item) => item.id === anchor.id)?.label ?? '1-cell',
  );
}

function Inspector({
  doc,
  selection,
  onPatchNode,
  onPatchArrow,
  onPatchCell,
  onDelete,
}: {
  doc: DiagramDocument;
  selection: Selection | null;
  onPatchNode: (id: NodeId, patch: Partial<DiagramNode>) => void;
  onPatchArrow: (id: ArrowId, patch: Partial<DiagramArrow>) => void;
  onPatchCell: (id: string, patch: Partial<DiagramTwoCell>) => void;
  onDelete: () => void;
}) {
  const node =
    selection?.kind === 'node'
      ? doc.nodes.find((item) => item.id === selection.id)
      : undefined;
  const arrow =
    selection?.kind === 'arrow'
      ? doc.arrows.find((item) => item.id === selection.id)
      : undefined;
  const cell =
    selection?.kind === 'cell'
      ? doc.cells.find((item) => item.id === selection.id)
      : undefined;

  if (!selection || (!node && !arrow && !cell)) {
    return (
      <div className="grid min-h-72 place-items-center p-7 text-center">
        <div className="max-w-52 text-muted-foreground">
          <div className="mx-auto mb-4 grid size-10 place-items-center rounded-full border bg-muted/35">
            <MousePointer2 className="size-4" />
          </div>
          <p className="text-sm font-medium text-foreground">
            Nothing selected
          </p>
          <p className="mt-1.5 text-xs leading-relaxed">
            Select an object, arrow, or 2-cell to edit its LaTeX and geometry.
          </p>
          <p className="mt-4 font-mono text-[10px] tracking-wide">
            V · O · A · T
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Selected
          </p>
          <p className="mt-0.5 text-sm font-medium">
            {node ? 'Object' : arrow ? '1-cell' : '2-cell'}
          </p>
        </div>
        <Badge variant="outline" className="font-mono">
          {node ? '0' : arrow ? '1' : '2'}-cell
        </Badge>
      </div>

      {node && (
        <>
          <div className="space-y-2">
            <Label htmlFor="node-label">LaTeX label</Label>
            <DraftInput
              id="node-label"
              value={node.label}
              onCommit={(label) => onPatchNode(node.id, { label })}
              className="font-mono"
            />
            <p className="truncate font-serif text-sm text-muted-foreground">
              Preview: {displayTex(node.label) || 'phantom anchor'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="node-x">X</Label>
              <DraftInput
                id="node-x"
                value={String(node.x)}
                onCommit={(value) => {
                  const point = snapPointToMatrix(doc, {
                    x: Number(value) || node.x,
                    y: node.y,
                  });
                  onPatchNode(node.id, { x: point.x });
                }}
                inputMode="numeric"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="node-y">Y</Label>
              <DraftInput
                id="node-y"
                value={String(node.y)}
                onCommit={(value) => {
                  const point = snapPointToMatrix(doc, {
                    x: node.x,
                    y: Number(value) || node.y,
                  });
                  onPatchNode(node.id, { y: point.y });
                }}
                inputMode="numeric"
                className="font-mono"
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-xs font-medium">Phantom anchor</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Useful for free-standing XY paths
              </p>
            </div>
            <Switch
              checked={Boolean(node.ghost)}
              onCheckedChange={(checked) =>
                onPatchNode(node.id, { ghost: Boolean(checked) })
              }
              aria-label="Toggle phantom anchor"
            />
          </div>
        </>
      )}

      {arrow && (
        <>
          <div className="space-y-2">
            <Label htmlFor="arrow-label">LaTeX label</Label>
            <DraftInput
              id="arrow-label"
              value={arrow.label}
              onCommit={(label) => onPatchArrow(arrow.id, { label })}
              className="font-mono"
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Curvature</Label>
              <span className="font-mono text-[11px] text-muted-foreground">
                {Math.round(arrow.curve)}
              </span>
            </div>
            <Slider
              value={[arrow.curve]}
              min={-190}
              max={190}
              step={2}
              onValueChange={(value) => {
                const next = Array.isArray(value) ? value[0] : value;
                onPatchArrow(arrow.id, { curve: Number(next) });
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Arrow style</Label>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className="h-auto w-full justify-between gap-3 px-3 py-2"
                  />
                }
              >
                <span className="min-w-0 flex-1 text-left">
                  <ArrowStylePreview
                    stroke={arrow.stroke}
                    head={arrow.head}
                    tail={arrow.tail}
                    className="size-auto h-7 w-full max-w-40"
                  />
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {arrowStyleSummary(arrow)}
                  </span>
                </span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
              </PopoverTrigger>
              <PopoverContent
                side="left"
                align="start"
                sideOffset={12}
                className="w-[352px] gap-4 rounded-xl p-4 shadow-xl"
              >
                <PopoverHeader>
                  <PopoverTitle>Arrow style</PopoverTitle>
                  <PopoverDescription>
                    Combine the body, tail, and head just like quiver.
                  </PopoverDescription>
                </PopoverHeader>

                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Body
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {arrowStrokeOptions.map((option) => (
                      <ArrowStyleChoice
                        key={option.value}
                        label={option.label}
                        selected={arrow.stroke === option.value}
                        arrow={arrow}
                        patch={{ stroke: option.value }}
                        onSelect={() =>
                          onPatchArrow(arrow.id, { stroke: option.value })
                        }
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Tail
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {arrowTailOptions.map((option) => (
                      <ArrowStyleChoice
                        key={option.value}
                        label={option.label}
                        selected={arrow.tail === option.value}
                        arrow={arrow}
                        patch={{ tail: option.value }}
                        onSelect={() =>
                          onPatchArrow(arrow.id, { tail: option.value })
                        }
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Head
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {arrowHeadOptions.map((option) => (
                      <ArrowStyleChoice
                        key={option.value}
                        label={option.label}
                        selected={arrow.head === option.value}
                        arrow={arrow}
                        patch={{ head: option.value }}
                        onSelect={() =>
                          onPatchArrow(arrow.id, { head: option.value })
                        }
                      />
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Label side</Label>
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                size="sm"
                variant={arrow.labelSide === 'left' ? 'secondary' : 'outline'}
                onClick={() => onPatchArrow(arrow.id, { labelSide: 'left' })}
              >
                Left / above
              </Button>
              <Button
                size="sm"
                variant={arrow.labelSide === 'right' ? 'secondary' : 'outline'}
                onClick={() => onPatchArrow(arrow.id, { labelSide: 'right' })}
              >
                Right / below
              </Button>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              onPatchArrow(arrow.id, {
                source: arrow.target,
                target: arrow.source,
                curve: -arrow.curve,
              })
            }
          >
            <ArrowLeftRight data-icon="inline-start" />
            Reverse direction
          </Button>
        </>
      )}

      {cell && (
        <>
          <div className="space-y-2">
            <Label htmlFor="cell-label">LaTeX label</Label>
            <DraftInput
              id="cell-label"
              value={cell.label}
              onCommit={(label) => onPatchCell(cell.id, { label })}
              className="font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border bg-muted/35 p-2.5">
              <p className="text-[10px] text-muted-foreground">Source</p>
              <p className="mt-1 truncate font-serif text-sm">
                {anchorName(doc, cellSourceAnchor(cell))}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/35 p-2.5">
              <p className="text-[10px] text-muted-foreground">Target</p>
              <p className="mt-1 truncate font-serif text-sm">
                {anchorName(doc, cellTargetAnchor(cell))}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>2-cell arrow style</Label>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                  />
                }
              >
                {cell.head === 'reverse'
                  ? 'Arrowhead toward source  ⇐'
                  : cell.head === 'equality'
                    ? 'Equality  ='
                    : cell.head === 'none'
                      ? 'Label only  (omit glyph)'
                      : 'Arrowhead toward target  ⇒'}
                <ChevronDown data-icon="inline-end" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuRadioGroup
                  value={cell.head ?? 'arrow'}
                  onValueChange={(value) =>
                    onPatchCell(cell.id, { head: value as CellHead })
                  }
                >
                  <DropdownMenuRadioItem value="arrow">
                    Arrowhead toward target ⇒
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="reverse">
                    Arrowhead toward source ⇐
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="equality">
                    Equality =
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="none">
                    Label only (omit 2-cell glyph)
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-[11px] leading-relaxed text-indigo-950">
            {isNativeParallelCell(doc, cell) ? (
              <>
                Native parallel mapping:{' '}
                <code className="font-mono">\\xtwocell</code>
              </>
            ) : cellBoundaryPaths(cell).source.length === 2 ||
              cellBoundaryPaths(cell).target.length === 2 ? (
              <>Composite boundary with an exact named path anchor in Xy-pic</>
            ) : (
              <>General native 2-cell between attached anchors</>
            )}
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              onPatchCell(cell.id, {
                sourceArrow: cell.targetArrow,
                targetArrow: cell.sourceArrow,
                sourceAnchor: cellTargetAnchor(cell) ?? undefined,
                targetAnchor: cellSourceAnchor(cell) ?? undefined,
                sourcePath: cellBoundaryPaths(cell).target,
                targetPath: cellBoundaryPaths(cell).source,
              })
            }
          >
            <ArrowLeftRight data-icon="inline-start" />
            Swap source and target boundaries
          </Button>
        </>
      )}

      <Separator />
      <Button variant="destructive" className="w-full" onClick={onDelete}>
        <Trash2 data-icon="inline-start" />
        Delete selected
      </Button>
    </div>
  );
}

function ExportDialog({
  doc,
  onStatus,
}: {
  doc: DiagramDocument;
  onStatus: (status: string) => void;
}) {
  const [mode, setMode] = useState<'typora' | 'snippet' | 'latex'>('typora');
  const [background, setBackground] = useState(false);
  const xy = useMemo(() => generateXyPic(doc, mode), [doc, mode]);
  const svg = useMemo(
    () => generateSvg(doc, { background }),
    [background, doc],
  );
  const json = useMemo(() => JSON.stringify(doc, null, 2), [doc]);

  const copy = async (
    value: string,
    label: string,
    warnings: string[] = [],
  ) => {
    await navigator.clipboard.writeText(value);
    onStatus(
      warnings.length > 0
        ? `${label} copied with ${warnings.length} warning(s): ${warnings[0]}`
        : `${label} copied to clipboard.`,
    );
  };

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" />}>
        <Download data-icon="inline-start" />
        Export
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Export diagram</DialogTitle>
          <DialogDescription>
            Xy-pic stays editable in Typora; SVG is a standalone vector file.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="xypic" className="min-h-0">
          <TabsList>
            <TabsTrigger value="xypic">Xy-pic</TabsTrigger>
            <TabsTrigger value="svg">SVG</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
          </TabsList>
          <TabsContent value="xypic" className="min-h-0 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {(['typora', 'snippet', 'latex'] as const).map((item) => (
                <Button
                  key={item}
                  size="sm"
                  variant={mode === item ? 'secondary' : 'outline'}
                  onClick={() => setMode(item)}
                >
                  {item === 'typora'
                    ? 'Typora / XyJax'
                    : item === 'snippet'
                      ? 'XY snippet'
                      : 'Full LaTeX'}
                </Button>
              ))}
            </div>
            {xy.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-950">
                {xy.warnings.join(' ')}
              </div>
            )}
            <Textarea
              value={xy.text}
              readOnly
              className="h-[42vh] resize-none font-mono text-[11px] leading-5"
              aria-label="Generated Xy-pic code"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => copy(xy.text, 'Xy-pic', xy.warnings)}
              >
                <Copy data-icon="inline-start" />
                Copy
              </Button>
              <Button
                onClick={() =>
                  downloadText(xy.text, 'xyquiver-diagram.tex', 'text/x-tex')
                }
              >
                <Download data-icon="inline-start" />
                Download .tex
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="svg" className="min-h-0 space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">White background</p>
                <p className="text-xs text-muted-foreground">
                  Off exports a transparent SVG.
                </p>
              </div>
              <Switch
                checked={background}
                onCheckedChange={(checked) => setBackground(Boolean(checked))}
                aria-label="Toggle SVG background"
              />
            </div>
            <div
              className="grid h-[35vh] place-items-center overflow-hidden rounded-xl border bg-canvas-grid p-4 [&_svg]:max-h-full [&_svg]:max-w-full"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            <p className="text-xs text-muted-foreground">
              True vector curves, arrowheads, and editable text; no raster image
              is embedded.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => copy(svg, 'SVG')}>
                <Copy data-icon="inline-start" />
                Copy SVG
              </Button>
              <Button
                onClick={() =>
                  downloadText(svg, 'xyquiver-diagram.svg', 'image/svg+xml')
                }
              >
                <Download data-icon="inline-start" />
                Download .svg
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="json" className="min-h-0 space-y-3">
            <Textarea
              value={json}
              readOnly
              className="h-[48vh] resize-none font-mono text-[11px] leading-5"
              aria-label="XyQuiver JSON"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => copy(json, 'JSON')}>
                <Copy data-icon="inline-start" />
                Copy JSON
              </Button>
              <Button
                onClick={() =>
                  downloadText(
                    json,
                    'xyquiver-diagram.json',
                    'application/json',
                  )
                }
              >
                <FileJson data-icon="inline-start" />
                Download .json
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter className="text-xs text-muted-foreground sm:justify-start">
          SVG bounds are cropped from diagram geometry, including curved arrows
          and labels.
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function XyQuiverShell() {
  const [history, setHistory] = useState<HistoryState>(() => ({
    past: [],
    present: cloneDocument(exampleDocuments.quasicategory),
    future: [],
  }));
  const [tool, setTool] = useState<EditorTool>('select');
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('auto');
  const [selections, setSelections] = useState<Selection[]>([]);
  const [editing, setEditing] = useState<Selection | null>(null);
  const [codeOpen, setCodeOpen] = useState(false);
  const [pendingNode, setPendingNode] = useState<NodeId | null>(null);
  const [pendingArrow, setPendingArrow] = useState<ArrowId | null>(null);
  const [canvasCancelEpoch, setCanvasCancelEpoch] = useState(0);
  const [status, setStatus] = useState(
    'Quick draw: drag object-to-object for a 1-cell; drag an object to an arrow for a 2-cell.',
  );
  const importRef = useRef<HTMLInputElement>(null);
  const doc = history.present;
  const selection = selections.at(-1) ?? null;
  const typora = useMemo(() => generateXyPic(doc, 'typora'), [doc]);
  const grid = useMemo(() => matrixAxes(doc, true), [doc]);

  const cancelCanvasGesture = useCallback(
    () => setCanvasCancelEpoch((current) => current + 1),
    [],
  );

  const commit = useCallback(
    (update: (current: DiagramDocument) => DiagramDocument) => {
      cancelCanvasGesture();
      setHistory((current) => {
        const next = update(current.present);
        if (JSON.stringify(next) === JSON.stringify(current.present))
          return current;
        return {
          past: [...current.past.slice(-119), current.present],
          present: next,
          future: [],
        };
      });
    },
    [cancelCanvasGesture],
  );

  const undo = useCallback(() => {
    cancelCanvasGesture();
    setHistory((current) => {
      const previous = current.past.at(-1);
      if (!previous) return current;
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future],
      };
    });
    setSelections([]);
    setEditing(null);
    setPendingNode(null);
    setPendingArrow(null);
    setStatus('Undid last change.');
  }, [cancelCanvasGesture]);

  const redo = useCallback(() => {
    cancelCanvasGesture();
    setHistory((current) => {
      const next = current.future[0];
      if (!next) return current;
      return {
        past: [...current.past, current.present],
        present: next,
        future: current.future.slice(1),
      };
    });
    setSelections([]);
    setEditing(null);
    setStatus('Redid change.');
  }, [cancelCanvasGesture]);

  const loadDocument = useCallback(
    (next: DiagramDocument, message: string) => {
      cancelCanvasGesture();
      setHistory({ past: [], present: cloneDocument(next), future: [] });
      setSelections([]);
      setEditing(null);
      setPendingNode(null);
      setPendingArrow(null);
      setTool('select');
      setConnectionMode('auto');
      setStatus(message);
    },
    [cancelCanvasGesture],
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return;
      const restored = validateDocument(JSON.parse(stored));
      if (restored) {
        setHistory({ past: [], present: restored, future: [] });
        setSelections([]);
        setStatus('Restored local draft.');
      }
    } catch {
      setStatus(
        'The saved draft could not be restored; the example is still available.',
      );
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      localStorage.setItem(storageKey, JSON.stringify(doc));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [doc]);

  const selectElement = useCallback(
    (next: Selection | null, additive = false) => {
      setEditing(null);
      if (!next) {
        setSelections([]);
        return;
      }
      setSelections((current) => {
        if (!additive) return [next];
        const key = selectionKey(next);
        return current.some((item) => selectionKey(item) === key)
          ? current.filter((item) => selectionKey(item) !== key)
          : [...current, next];
      });
    },
    [],
  );

  const selectMarquee = useCallback((items: Selection[], additive: boolean) => {
    setEditing(null);
    setSelections((current) => {
      if (!additive) return items;
      const merged = new Map(current.map((item) => [selectionKey(item), item]));
      for (const item of items) merged.set(selectionKey(item), item);
      return [...merged.values()];
    });
  }, []);

  const deleteSelected = useCallback(() => {
    if (selections.length === 0) return;
    const count = selections.length;
    commit((current) => deleteSelections(current, selections));
    setSelections([]);
    setEditing(null);
    setStatus(
      `Deleted ${count} selected ${count === 1 ? 'element' : 'elements'}.`,
    );
  }, [commit, selections]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteSelected();
        return;
      }
      const shortcuts: Record<string, EditorTool> = {
        v: 'select',
        o: 'object',
        a: 'arrow',
        t: 'cell',
        '1': 'select',
        '2': 'object',
        '3': 'arrow',
        '4': 'cell',
      };
      const nextTool = shortcuts[event.key.toLowerCase()];
      if (nextTool) {
        cancelCanvasGesture();
        setTool(nextTool);
        setConnectionMode(
          nextTool === 'arrow'
            ? 'arrow'
            : nextTool === 'cell'
              ? 'cell'
              : 'auto',
        );
        setPendingNode(null);
        setPendingArrow(null);
      }
      if (event.key === 'Escape') {
        cancelCanvasGesture();
        setPendingNode(null);
        setPendingArrow(null);
        setEditing(null);
        setSelections([]);
        setStatus('Cancelled current action.');
      }
      if (event.key === 'Enter' && selection) {
        event.preventDefault();
        setEditing(selection);
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [cancelCanvasGesture, deleteSelected, redo, selection, undo]);

  const patchNode = useCallback(
    (id: NodeId, patch: Partial<DiagramNode>) => {
      commit((current) => ({
        ...current,
        nodes: current.nodes.map((node) =>
          node.id === id ? { ...node, ...patch } : node,
        ),
      }));
    },
    [commit],
  );

  const patchArrow = useCallback(
    (id: ArrowId, patch: Partial<DiagramArrow>) => {
      const cell = doc.cells.find((item) => {
        const source = cellSourceAnchor(item);
        const target = cellTargetAnchor(item);
        const paths = cellBoundaryPaths(item);
        return (
          (source?.kind === 'arrow' && source.id === id) ||
          (target?.kind === 'arrow' && target.id === id) ||
          paths.source.includes(id) ||
          paths.target.includes(id)
        );
      });
      if (cell && (patch.source || patch.target)) {
        setStatus(
          'Reverse or retarget both boundary arrows before changing this 2-cell.',
        );
        return;
      }
      commit((current) => ({
        ...current,
        arrows: current.arrows.map((arrow) =>
          arrow.id === id
            ? {
                ...arrow,
                ...patch,
                curve:
                  patch.curve === undefined
                    ? arrow.curve
                    : constrainArrowCurve(current, id, patch.curve),
              }
            : arrow,
        ),
      }));
    },
    [commit, doc.cells],
  );

  const patchCell = useCallback(
    (id: string, patch: Partial<DiagramTwoCell>) => {
      commit((current) => ({
        ...current,
        cells: current.cells.map((cell) =>
          cell.id === id ? { ...cell, ...patch } : cell,
        ),
      }));
    },
    [commit],
  );

  const addNode = useCallback(
    (point: Point) => {
      const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const label =
        labels[doc.nodes.filter((node) => !node.ghost).length % labels.length];
      const gridPoint = snapPointToMatrix(doc, point);
      const next: DiagramNode = {
        id: makeId('node'),
        label,
        x: gridPoint.x,
        y: gridPoint.y,
      };
      const occupied = doc.nodes.some(
        (node) => node.x === next.x && node.y === next.y,
      );
      if (occupied) {
        setStatus('That grid position already contains an object.');
        return;
      }
      commit((current) => ({ ...current, nodes: [...current.nodes, next] }));
      const nextSelection: Selection = { kind: 'node', id: next.id };
      setSelections([nextSelection]);
      setEditing(nextSelection);
      setStatus(`Created object ${label}.`);
    },
    [commit, doc],
  );

  const handleNodeAction = useCallback(
    (id: NodeId) => {
      if (tool !== 'arrow') {
        setSelections([{ kind: 'node', id }]);
        return;
      }
      if (!pendingNode) {
        setPendingNode(id);
        setStatus('Choose the target object for the 1-cell.');
        return;
      }
      if (pendingNode === id) {
        setStatus('Self-loops are reserved for the low-level XY editor.');
        return;
      }
      const existing = doc.arrows.filter(
        (arrow) => arrow.source === pendingNode && arrow.target === id,
      );
      const nextId = makeId('arrow');
      const label = arrowLabels[doc.arrows.length % arrowLabels.length];
      commit((current) => {
        let arrows = current.arrows;
        if (existing.length === 1 && Math.abs(existing[0].curve) < 8) {
          arrows = arrows.map((arrow) =>
            arrow.id === existing[0].id ? { ...arrow, curve: 58 } : arrow,
          );
        }
        const next: DiagramArrow = {
          id: nextId,
          source: pendingNode,
          target: id,
          label,
          curve: existing.length === 0 ? 0 : -58 - (existing.length - 1) * 34,
          labelSide: existing.length === 0 ? 'left' : 'right',
          stroke: 'solid',
          head: 'arrow',
          tail: 'none',
          color: '#273244',
        };
        return { ...current, arrows: [...arrows, next] };
      });
      setPendingNode(null);
      const nextSelection: Selection = { kind: 'arrow', id: nextId };
      setSelections([nextSelection]);
      setEditing(nextSelection);
      setStatus(`Created 1-cell ${label}.`);
    },
    [commit, doc.arrows, pendingNode, tool],
  );

  const handleArrowAction = useCallback(
    (id: ArrowId) => {
      if (tool !== 'cell') {
        setSelections([{ kind: 'arrow', id }]);
        return;
      }
      if (!pendingArrow) {
        setPendingArrow(id);
        setStatus(
          'Click a parallel target for a native 2-cell, or drag for a general attached 2-cell.',
        );
        return;
      }
      const sourceArrow = doc.arrows.find((arrow) => arrow.id === pendingArrow);
      const targetArrow = doc.arrows.find((arrow) => arrow.id === id);
      if (
        !sourceArrow ||
        !targetArrow ||
        !areParallel(sourceArrow, targetArrow)
      ) {
        setStatus(
          'The click workflow needs parallel arrows; drag between anchors for a general 2-cell.',
        );
        setPendingArrow(null);
        return;
      }
      const conflict = cellCreationConflict(
        doc,
        { kind: 'arrow', id: sourceArrow.id, t: 0.5 },
        { kind: 'arrow', id: targetArrow.id, t: 0.5 },
      );
      if (conflict) {
        setStatus(
          conflict === 'duplicate'
            ? 'That 2-cell boundary pair already exists.'
            : 'One of those arrows already bounds a native 2-cell.',
        );
        setPendingArrow(null);
        return;
      }
      const nextId = makeId('cell');
      const label = greekLabels[doc.cells.length % greekLabels.length];
      commit((current) => {
        const source = current.arrows.find(
          (arrow) => arrow.id === sourceArrow.id,
        )!;
        const target = current.arrows.find(
          (arrow) => arrow.id === targetArrow.id,
        )!;
        const shouldSeparate = Math.abs(source.curve - target.curve) < 30;
        const arrows = shouldSeparate
          ? current.arrows.map((arrow) =>
              arrow.id === source.id
                ? { ...arrow, curve: 62, labelSide: 'left' as const }
                : arrow.id === target.id
                  ? { ...arrow, curve: -62, labelSide: 'right' as const }
                  : arrow,
            )
          : current.arrows;
        return {
          ...current,
          arrows,
          cells: [
            ...current.cells,
            {
              id: nextId,
              sourceArrow: source.id,
              targetArrow: target.id,
              sourceAnchor: { kind: 'arrow', id: source.id, t: 0.5 },
              targetAnchor: { kind: 'arrow', id: target.id, t: 0.5 },
              sourcePath: [source.id],
              targetPath: [target.id],
              label,
              color: '#5b4bc4',
              head: 'arrow',
            },
          ],
        };
      });
      setPendingArrow(null);
      const nextSelection: Selection = { kind: 'cell', id: nextId };
      setSelections([nextSelection]);
      setEditing(nextSelection);
      setStatus(`Created native 2-cell ${displayTex(label)}.`);
    },
    [commit, doc, pendingArrow, tool],
  );

  const moveNodes = useCallback(
    (positions: Record<NodeId, Point>) => {
      commit((current) => ({
        ...current,
        nodes: current.nodes.map((node) =>
          positions[node.id] ? { ...node, ...positions[node.id] } : node,
        ),
      }));
      setStatus(
        `Moved ${Object.keys(positions).length} ${Object.keys(positions).length === 1 ? 'object' : 'objects'}.`,
      );
    },
    [commit],
  );

  const setArrowCurve = useCallback(
    (id: ArrowId, curve: number) => {
      const constrained = constrainArrowCurve(doc, id, curve);
      commit((current) => ({
        ...current,
        arrows: current.arrows.map((arrow) =>
          arrow.id === id
            ? { ...arrow, curve: constrainArrowCurve(current, id, curve) }
            : arrow,
        ),
      }));
      setStatus(`Curvature set to ${Math.round(constrained)}.`);
    },
    [commit, doc],
  );

  const commitLabel = useCallback(
    (item: Selection, label: string) => {
      commit((current) =>
        item.kind === 'node'
          ? {
              ...current,
              nodes: current.nodes.map((node) =>
                node.id === item.id ? { ...node, label } : node,
              ),
            }
          : item.kind === 'arrow'
            ? {
                ...current,
                arrows: current.arrows.map((arrow) =>
                  arrow.id === item.id ? { ...arrow, label } : arrow,
                ),
              }
            : {
                ...current,
                cells: current.cells.map((cell) =>
                  cell.id === item.id ? { ...cell, label } : cell,
                ),
              },
      );
      setEditing(null);
      setStatus('Updated LaTeX label.');
    },
    [commit],
  );

  const quickConnect = useCallback(
    (source: CanvasAnchor, target: CanvasAnchor, requested: ConnectionMode) => {
      const connectionError = connectionValidationError(
        source,
        target,
        requested,
      );
      if (connectionError) {
        setStatus(connectionError);
        return;
      }
      const anchorExists = (anchor: CanvasAnchor) =>
        anchor.kind === 'point' ||
        (anchor.kind === 'node'
          ? doc.nodes.some((node) => node.id === anchor.id)
          : doc.arrows.some((arrow) => arrow.id === anchor.id));
      if (!anchorExists(source) || !anchorExists(target)) {
        setStatus('That gesture referenced an object that no longer exists.');
        return;
      }
      const mode =
        requested === 'auto'
          ? source.kind === 'arrow' || target.kind === 'arrow'
            ? 'cell'
            : 'arrow'
          : requested;
      const newNodes: DiagramNode[] = [];
      const resolveNode = (
        anchor: CanvasAnchor,
        index: number,
      ): NodeId | null => {
        if (anchor.kind === 'node') return anchor.id;
        if (anchor.kind === 'arrow') return null;
        const occupied = doc.nodes.find(
          (node) => node.x === anchor.point.x && node.y === anchor.point.y,
        );
        if (occupied) return occupied.id;
        const labelIndex =
          doc.nodes.filter((node) => !node.ghost).length + index;
        const node: DiagramNode = {
          id: makeId('node'),
          label: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[labelIndex % 26],
          x: anchor.point.x,
          y: anchor.point.y,
        };
        newNodes.push(node);
        return node.id;
      };

      if (mode === 'arrow') {
        const sourceId = resolveNode(source, 0);
        const targetId = resolveNode(target, newNodes.length);
        if (!sourceId || !targetId || sourceId === targetId) {
          setStatus('Choose two different object anchors for a 1-cell.');
          return;
        }
        const nextId = makeId('arrow');
        const label = arrowLabels[doc.arrows.length % arrowLabels.length];
        commit((current) => {
          const existing = current.arrows.filter(
            (arrow) => arrow.source === sourceId && arrow.target === targetId,
          );
          let arrows = current.arrows;
          if (existing.length === 1 && Math.abs(existing[0].curve) < 8) {
            arrows = arrows.map((arrow) =>
              arrow.id === existing[0].id
                ? { ...arrow, curve: 58, labelSide: 'left' as const }
                : arrow,
            );
          }
          const next: DiagramArrow = {
            id: nextId,
            source: sourceId,
            target: targetId,
            label,
            curve: existing.length === 0 ? 0 : -58 - (existing.length - 1) * 36,
            labelSide: existing.length === 0 ? 'left' : 'right',
            stroke: 'solid',
            head: 'arrow',
            tail: 'none',
            color: '#273244',
          };
          return {
            ...current,
            nodes: [...current.nodes, ...newNodes],
            arrows: [...arrows, next],
          };
        });
        const nextSelection: Selection = { kind: 'arrow', id: nextId };
        setSelections([nextSelection]);
        setEditing(nextSelection);
        setStatus(
          newNodes.length > 0
            ? `Created ${newNodes.length} ${newNodes.length === 1 ? 'object' : 'objects'} and 1-cell ${label}.`
            : `Created 1-cell ${label}.`,
        );
        return;
      }

      const sourceNodeId =
        source.kind === 'point' ? resolveNode(source, 0) : null;
      const targetNodeId =
        target.kind === 'point' ? resolveNode(target, newNodes.length) : null;
      const sourceAnchor =
        source.kind === 'point'
          ? sourceNodeId
            ? ({ kind: 'node', id: sourceNodeId } as const)
            : null
          : canvasAnchorToCellAnchor(source);
      const targetAnchor =
        target.kind === 'point'
          ? targetNodeId
            ? ({ kind: 'node', id: targetNodeId } as const)
            : null
          : canvasAnchorToCellAnchor(target);
      if (!sourceAnchor || !targetAnchor) return;
      if (
        sourceAnchor.kind === targetAnchor.kind &&
        sourceAnchor.id === targetAnchor.id
      ) {
        setStatus('Choose two different anchors for a 2-cell.');
        return;
      }
      const conflict = cellCreationConflict(doc, sourceAnchor, targetAnchor);
      if (conflict) {
        setStatus(
          conflict === 'duplicate'
            ? 'That 2-cell boundary pair already exists.'
            : 'One of those arrows already bounds a native 2-cell.',
        );
        return;
      }
      const sourceArrowForMode =
        sourceAnchor.kind === 'arrow'
          ? doc.arrows.find((arrow) => arrow.id === sourceAnchor.id)
          : null;
      const targetArrowForMode =
        targetAnchor.kind === 'arrow'
          ? doc.arrows.find((arrow) => arrow.id === targetAnchor.id)
          : null;
      const nativeParallel = Boolean(
        sourceArrowForMode &&
        targetArrowForMode &&
        areParallel(sourceArrowForMode, targetArrowForMode),
      );
      const nextId = makeId('cell');
      const label = greekLabels[doc.cells.length % greekLabels.length];
      commit((current) => {
        const withNodes = {
          ...current,
          nodes: [...current.nodes, ...newNodes],
        };
        const paths = inferCellBoundaryPaths(
          withNodes,
          sourceAnchor,
          targetAnchor,
        );
        const sourceArrow =
          sourceAnchor.kind === 'arrow'
            ? current.arrows.find((arrow) => arrow.id === sourceAnchor.id)
            : null;
        const targetArrow =
          targetAnchor.kind === 'arrow'
            ? current.arrows.find((arrow) => arrow.id === targetAnchor.id)
            : null;
        const shouldSeparate =
          nativeParallel &&
          sourceArrow &&
          targetArrow &&
          Math.abs(sourceArrow.curve - targetArrow.curve) < 30;
        const arrows = shouldSeparate
          ? current.arrows.map((arrow) =>
              arrow.id === sourceArrow!.id
                ? { ...arrow, curve: 62, labelSide: 'left' as const }
                : arrow.id === targetArrow!.id
                  ? { ...arrow, curve: -62, labelSide: 'right' as const }
                  : arrow,
            )
          : current.arrows;
        return {
          ...withNodes,
          arrows,
          cells: [
            ...current.cells,
            {
              id: nextId,
              sourceArrow: nativeParallel ? sourceArrow!.id : undefined,
              targetArrow: nativeParallel ? targetArrow!.id : undefined,
              sourceAnchor,
              targetAnchor,
              sourcePath: paths.source,
              targetPath: paths.target,
              label,
              color: '#5b4bc4',
              head: 'arrow' as const,
            },
          ],
        };
      });
      const nextSelection: Selection = { kind: 'cell', id: nextId };
      setSelections([nextSelection]);
      setEditing(nextSelection);
      setStatus(
        nativeParallel
          ? `Created native parallel 2-cell ${displayTex(label)}.`
          : sourceAnchor.kind === 'node' && targetAnchor.kind === 'arrow'
            ? `Created attached 2-cell ${displayTex(label)} from the vertex to the opposite edge.`
            : `Created general attached 2-cell ${displayTex(label)}.`,
      );
    },
    [commit, doc],
  );

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = validateDocument(JSON.parse(await file.text()));
      if (!parsed) throw new Error('Invalid document');
      loadDocument(parsed, `Opened ${file.name}.`);
    } catch {
      setStatus('That file is not a valid XyQuiver document.');
    }
  };

  const switchTool = (next: EditorTool) => {
    cancelCanvasGesture();
    setTool(next);
    if (next === 'select') setConnectionMode('auto');
    if (next === 'arrow') setConnectionMode('arrow');
    if (next === 'cell') setConnectionMode('cell');
    setPendingNode(null);
    setPendingArrow(null);
    setStatus(
      next === 'object'
        ? 'Click the canvas to create an object.'
        : next === 'arrow'
          ? 'Drag between object or grid anchors to force a 1-cell.'
          : next === 'cell'
            ? 'Drag between objects or arrows to force a 2-cell.'
            : 'Quick draw: drag object-to-object for 1-cells, or to an arrow for 2-cells.',
    );
  };

  const chooseConnectionMode = (mode: ConnectionMode) => {
    cancelCanvasGesture();
    setConnectionMode(mode);
    setTool(mode === 'auto' ? 'select' : mode);
    setPendingNode(null);
    setPendingArrow(null);
    setStatus(
      mode === 'auto'
        ? 'Smart connection: endpoint dimensions choose 1-cell or 2-cell.'
        : mode === 'arrow'
          ? 'Forced 1-cell: drag between object or grid anchors.'
          : 'Forced 2-cell: drag between any two object or arrow anchors.',
    );
  };

  const copyXyPic = async () => {
    await navigator.clipboard.writeText(typora.text);
    setStatus(
      typora.warnings.length > 0
        ? `Copied with ${typora.warnings.length} warning(s): ${typora.warnings[0]}`
        : 'Typora-ready Xy-pic copied.',
    );
  };

  return (
    <main className="flex h-dvh min-h-[560px] flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-card/95 px-3 shadow-[0_1px_8px_rgb(36_31_27/4%)] backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="font-serif text-xl italic tracking-[-0.08em] text-primary"
            aria-hidden="true"
          >
            xy
          </div>
          <div className="min-w-0 leading-tight">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              XyQuiver
            </p>
            <h1 className="max-w-44 truncate text-sm font-medium tracking-[-0.01em] sm:max-w-64">
              {doc.title}
            </h1>
          </div>
        </div>

        <Separator
          orientation="vertical"
          className="mx-1 hidden h-6 sm:block"
        />

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            Examples
            <ChevronDown data-icon="inline-end" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {examples.map((example) => (
              <DropdownMenuItem
                key={example.id}
                onClick={() =>
                  loadDocument(
                    exampleDocuments[example.id],
                    `Loaded ${example.label}.`,
                  )
                }
              >
                {example.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => importRef.current?.click()}>
              <FolderOpen />
              Open XyQuiver JSON…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
            disabled={history.past.length === 0}
            onClick={undo}
          >
            <Undo2 />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Redo"
            title="Redo (Ctrl+Shift+Z)"
            disabled={history.future.length === 0}
            onClick={redo}
          >
            <Redo2 />
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="hidden lg:inline-flex"
            onClick={copyXyPic}
          >
            <Copy data-icon="inline-start" />
            Copy Xy-pic
          </Button>
          <Button
            variant={codeOpen ? 'secondary' : 'ghost'}
            size="sm"
            aria-pressed={codeOpen}
            onClick={() => setCodeOpen((open) => !open)}
          >
            <Code2 data-icon="inline-start" />
            <span className="hidden sm:inline">Code</span>
          </Button>
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Open inspector"
                  title="Inspector"
                />
              }
            >
              <SlidersHorizontal data-icon="inline-start" />
              <span className="hidden md:inline">Inspect</span>
            </SheetTrigger>
            <SheetContent className="gap-0 overflow-hidden bg-card sm:max-w-[340px]">
              <SheetHeader className="border-b pr-12">
                <SheetTitle>Inspector</SheetTitle>
                <SheetDescription>
                  Edit the selected cell without shrinking the canvas.
                </SheetDescription>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-auto">
                <Inspector
                  doc={doc}
                  selection={selection}
                  onPatchNode={patchNode}
                  onPatchArrow={patchArrow}
                  onPatchCell={patchCell}
                  onDelete={deleteSelected}
                />
              </div>
            </SheetContent>
          </Sheet>
          <ExportDialog doc={doc} onStatus={setStatus} />
        </div>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={handleImport}
        />
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-canvas-grid">
        <section className="absolute inset-0" aria-label="Diagram editor">
          <div className="absolute left-[78px] top-4 z-10 hidden items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:flex">
            <span className="font-semibold text-foreground">
              {tool === 'select'
                ? 'Quick draw · auto'
                : tool === 'object'
                  ? 'Place object'
                  : tool === 'arrow'
                    ? 'Force 1-cell'
                    : 'Force 2-cell'}
            </span>
            <span className="text-border">/</span>
            <span>
              {grid.columns.length}×{grid.rows.length} matrix ·{' '}
              {doc.nodes.length} objects · {doc.arrows.length} arrows ·{' '}
              {doc.cells.length} 2-cells
            </span>
          </div>

          <DiagramCanvas
            key={canvasCancelEpoch}
            doc={doc}
            selections={selections}
            editing={editing}
            tool={tool}
            connectionMode={connectionMode}
            pendingNode={pendingNode}
            pendingArrow={pendingArrow}
            onCanvasPoint={(point) => {
              if (tool === 'object') addNode(point);
              else if (tool !== 'select') {
                setPendingNode(null);
                setPendingArrow(null);
              }
            }}
            onSelect={selectElement}
            onMarqueeSelect={selectMarquee}
            onNodeAction={handleNodeAction}
            onArrowAction={handleArrowAction}
            onQuickNode={addNode}
            onQuickConnect={quickConnect}
            onMoveNodes={moveNodes}
            onSetArrowCurve={setArrowCurve}
            onBeginLabelEdit={(item) => {
              setSelections([item]);
              setEditing(item);
            }}
            onCommitLabel={commitLabel}
            onCancelLabelEdit={() => setEditing(null)}
            onStatus={setStatus}
          />

          <div className="pointer-events-none absolute bottom-3 left-[78px] z-10 max-w-[52vw] truncate rounded-md border bg-card/88 px-2.5 py-1.5 text-[10px] text-muted-foreground shadow-sm backdrop-blur">
            {status}
          </div>
        </section>

        <nav
          aria-label="Diagram tools"
          className="absolute left-3 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-1 rounded-xl border bg-card/92 p-1.5 shadow-[0_8px_28px_rgb(45_37_32/10%)] backdrop-blur"
        >
          {tools
            .filter(({ id }) => id === 'select' || id === 'object')
            .map(({ id, label, key, icon: Icon }) => (
              <Button
                key={id}
                variant={tool === id ? 'secondary' : 'ghost'}
                size="icon-lg"
                className={
                  tool === id
                    ? 'bg-accent text-primary shadow-none'
                    : 'text-muted-foreground'
                }
                aria-label={`${label} tool`}
                aria-pressed={tool === id}
                title={`${label} (${key})`}
                onClick={() => switchTool(id)}
              >
                <Icon />
              </Button>
            ))}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant={
                    tool === 'arrow' || tool === 'cell' ? 'secondary' : 'ghost'
                  }
                  size="icon-lg"
                  className={
                    tool === 'arrow' || tool === 'cell'
                      ? 'bg-accent text-primary shadow-none'
                      : 'text-muted-foreground'
                  }
                  aria-label={`Connection mode: ${
                    connectionMode === 'auto'
                      ? 'smart'
                      : connectionMode === 'arrow'
                        ? 'forced 1-cell'
                        : 'forced 2-cell'
                  }`}
                  title={`Connection mode: ${
                    connectionMode === 'auto'
                      ? 'Smart'
                      : connectionMode === 'arrow'
                        ? 'Force 1-cell'
                        : 'Force 2-cell'
                  } (A / T)`}
                />
              }
            >
              {connectionMode === 'auto' ? (
                <MousePointer2 />
              ) : connectionMode === 'cell' ? (
                <Sparkles />
              ) : (
                <ArrowRight />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="center" className="w-64">
              <DropdownMenuRadioGroup
                value={connectionMode}
                onValueChange={(value) =>
                  chooseConnectionMode(value as ConnectionMode)
                }
              >
                <DropdownMenuRadioItem value="auto" className="min-h-10">
                  <MousePointer2 />
                  Smart connection
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="min-h-10">
                  <ArrowRight />
                  Force connection dimension
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  <DropdownMenuRadioGroup
                    value={connectionMode}
                    onValueChange={(value) =>
                      chooseConnectionMode(value as ConnectionMode)
                    }
                  >
                    <DropdownMenuRadioItem value="arrow" className="min-h-10">
                      <ArrowRight />
                      1-cell →
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="cell" className="min-h-10">
                      <Sparkles />
                      2-cell ⇒
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
          <Separator className="my-2 w-7" />
          <Button
            variant="ghost"
            size="icon-lg"
            className="text-muted-foreground"
            aria-label="Copy raw Xy-pic"
            title="Copy raw Xy-pic"
            onClick={copyXyPic}
          >
            <Braces />
          </Button>
          <div className="mt-auto rounded-md border bg-muted/60 px-1.5 py-1 font-mono text-[9px] text-muted-foreground">
            {tools.find((item) => item.id === tool)?.key}
          </div>
        </nav>

        {codeOpen && (
          <section
            className="absolute bottom-3 left-[72px] right-3 z-30 h-[220px] overflow-hidden rounded-xl border border-[#312d36] bg-[#18171d] text-slate-100 shadow-[0_20px_60px_rgb(25_20_27/24%)]"
            aria-label="Generated code"
          >
            <Tabs defaultValue="typora" className="h-full gap-0">
              <div className="flex h-10 items-center border-b border-white/8 px-3">
                <TabsList variant="line" className="h-8 text-slate-400">
                  <TabsTrigger
                    value="typora"
                    className="text-xs text-slate-400 data-active:text-white"
                  >
                    Typora
                  </TabsTrigger>
                  <TabsTrigger
                    value="structure"
                    className="text-xs text-slate-400 data-active:text-white"
                  >
                    Structure
                  </TabsTrigger>
                </TabsList>
                <Badge
                  className="ml-auto border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                  variant="outline"
                >
                  XyJax compatible
                </Badge>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="ml-1 text-slate-400 hover:bg-white/8 hover:text-white"
                  aria-label="Close code panel"
                  onClick={() => setCodeOpen(false)}
                >
                  <PanelBottomClose />
                </Button>
              </div>
              <TabsContent value="typora" className="min-h-0 overflow-auto p-3">
                <pre className="font-mono text-[11px] leading-5 text-slate-300">
                  <code>{typora.text}</code>
                </pre>
              </TabsContent>
              <TabsContent
                value="structure"
                className="min-h-0 overflow-auto p-3"
              >
                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="rounded-lg bg-white/5 p-2">
                    <p className="text-lg font-semibold text-white">
                      {doc.nodes.length}
                    </p>
                    <p className="text-slate-400">objects</p>
                  </div>
                  <div className="rounded-lg bg-white/5 p-2">
                    <p className="text-lg font-semibold text-white">
                      {doc.arrows.length}
                    </p>
                    <p className="text-slate-400">1-cells</p>
                  </div>
                  <div className="rounded-lg bg-white/5 p-2">
                    <p className="text-lg font-semibold text-white">
                      {doc.cells.length}
                    </p>
                    <p className="text-slate-400">2-cells</p>
                  </div>
                </div>
                <p className="mt-3 text-[11px] leading-5 text-slate-400">
                  Parallel 2-cells compile to native \\xtwocell. Phantom anchors
                  and double arrows cover free-standing XY geometry.
                </p>
              </TabsContent>
            </Tabs>
          </section>
        )}
      </div>

      <output className="sr-only" aria-live="polite" aria-atomic="true">
        {status}
      </output>
    </main>
  );
}

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
  Check,
  ChevronDown,
  CirclePlus,
  Copy,
  Download,
  FileJson,
  FolderOpen,
  MousePointer2,
  Redo2,
  Sparkles,
  Trash2,
  Undo2,
} from 'lucide-react';

import { DiagramCanvas, type EditorTool } from '@/components/diagram-canvas';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  areParallel,
  cloneDocument,
  deleteSelection,
  displayTex,
  exampleDocuments,
  generateSvg,
  generateXyPic,
  snap,
  validateDocument,
  type ArrowId,
  type ArrowStroke,
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
  { id: 'twocell', label: 'Native 2-cell' },
  { id: 'parallel', label: 'Parallel deformation arrows' },
  { id: 'homotopy', label: 'Homotopy stabilization' },
  { id: 'snake', label: 'Snake lemma' },
  { id: 'blank', label: 'Blank diagram' },
] as const;

const storageKey = 'xyquiver:document:v1';
const greekLabels = ['\\alpha', '\\beta', '\\gamma', '\\delta', '\\eta'];
const arrowLabels = ['F', 'G', 'H', 'K', 'L', 'M'];

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
      <div className="space-y-5 p-4 text-xs leading-relaxed text-muted-foreground">
        <div className="rounded-xl border bg-muted/45 p-3">
          <p className="mb-1 font-medium text-foreground">Start drawing</p>
          <p>
            Choose Object, 1-cell, or 2-cell. For a native 2-cell, select two
            parallel arrows in order.
          </p>
        </div>
        <div className="space-y-2">
          <p className="font-medium text-foreground">Fast path</p>
          <ol className="list-inside list-decimal space-y-1.5">
            <li>Click Object twice</li>
            <li>Select 1-cell, then the two objects</li>
            <li>Repeat for a parallel arrow</li>
            <li>Select 2-cell, then both arrows</li>
          </ol>
        </div>
        <Separator />
        <div className="grid grid-cols-[1fr_auto] gap-y-2">
          <span>Select</span>
          <kbd className="rounded border bg-card px-1.5 font-mono">V</kbd>
          <span>Object</span>
          <kbd className="rounded border bg-card px-1.5 font-mono">O</kbd>
          <span>1-cell</span>
          <kbd className="rounded border bg-card px-1.5 font-mono">A</kbd>
          <span>2-cell</span>
          <kbd className="rounded border bg-card px-1.5 font-mono">T</kbd>
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
                onCommit={(value) =>
                  onPatchNode(node.id, { x: snap(Number(value) || node.x) })
                }
                inputMode="numeric"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="node-y">Y</Label>
              <DraftInput
                id="node-y"
                value={String(node.y)}
                onCommit={(value) =>
                  onPatchNode(node.id, { y: snap(Number(value) || node.y) })
                }
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
            <Label>Line</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {(['solid', 'dashed', 'dotted', 'double'] as ArrowStroke[]).map(
                (stroke) => (
                  <Button
                    key={stroke}
                    size="sm"
                    variant={arrow.stroke === stroke ? 'secondary' : 'outline'}
                    onClick={() => onPatchArrow(arrow.id, { stroke })}
                  >
                    {stroke}
                  </Button>
                ),
              )}
            </div>
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
                {displayTex(
                  doc.arrows.find((item) => item.id === cell.sourceArrow)?.label ?? '',
                )}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/35 p-2.5">
              <p className="text-[10px] text-muted-foreground">Target</p>
              <p className="mt-1 truncate font-serif text-sm">
                {displayTex(
                  doc.arrows.find((item) => item.id === cell.targetArrow)?.label ?? '',
                )}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-[11px] leading-relaxed text-indigo-950">
            Native Xy-pic mapping:{' '}
            <code className="font-mono">\\xtwocell[…]{'{}'}</code>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              onPatchCell(cell.id, {
                sourceArrow: cell.targetArrow,
                targetArrow: cell.sourceArrow,
              })
            }
          >
            <ArrowLeftRight data-icon="inline-start" />
            Reverse 2-cell
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
  const svg = useMemo(() => generateSvg(doc, { background }), [background, doc]);
  const json = useMemo(() => JSON.stringify(doc, null, 2), [doc]);

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    onStatus(`${label} copied to clipboard.`);
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
              <Button variant="outline" onClick={() => copy(xy.text, 'Xy-pic')}>
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
              True vector curves, arrowheads, and editable text; no raster image is embedded.
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
                  downloadText(json, 'xyquiver-diagram.json', 'application/json')
                }
              >
                <FileJson data-icon="inline-start" />
                Download .json
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter className="text-xs text-muted-foreground sm:justify-start">
          SVG bounds are cropped from diagram geometry, including curved arrows and labels.
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function XyQuiverShell() {
  const [history, setHistory] = useState<HistoryState>(() => ({
    past: [],
    present: cloneDocument(exampleDocuments.twocell),
    future: [],
  }));
  const [tool, setTool] = useState<EditorTool>('select');
  const [selection, setSelection] = useState<Selection | null>({
    kind: 'cell',
    id: 'c-alpha',
  });
  const [pendingNode, setPendingNode] = useState<NodeId | null>(null);
  const [pendingArrow, setPendingArrow] = useState<ArrowId | null>(null);
  const [status, setStatus] = useState('Ready.');
  const importRef = useRef<HTMLInputElement>(null);
  const dragStart = useRef<DiagramDocument | null>(null);
  const doc = history.present;
  const typora = useMemo(() => generateXyPic(doc, 'typora'), [doc]);

  const commit = useCallback(
    (update: (current: DiagramDocument) => DiagramDocument) => {
      setHistory((current) => {
        const next = update(current.present);
        if (JSON.stringify(next) === JSON.stringify(current.present)) return current;
        return {
          past: [...current.past.slice(-119), current.present],
          present: next,
          future: [],
        };
      });
    },
    [],
  );

  const undo = useCallback(() => {
    setHistory((current) => {
      const previous = current.past.at(-1);
      if (!previous) return current;
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future],
      };
    });
    setPendingNode(null);
    setPendingArrow(null);
    setStatus('Undid last change.');
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => {
      const next = current.future[0];
      if (!next) return current;
      return {
        past: [...current.past, current.present],
        present: next,
        future: current.future.slice(1),
      };
    });
    setStatus('Redid change.');
  }, []);

  const loadDocument = useCallback((next: DiagramDocument, message: string) => {
    setHistory({ past: [], present: cloneDocument(next), future: [] });
    setSelection(null);
    setPendingNode(null);
    setPendingArrow(null);
    setTool('select');
    setStatus(message);
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return;
      const restored = validateDocument(JSON.parse(stored));
      if (restored) {
        setHistory({ past: [], present: restored, future: [] });
        setSelection(null);
        setStatus('Restored local draft.');
      }
    } catch {
      setStatus('The saved draft could not be restored; the example is still available.');
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      localStorage.setItem(storageKey, JSON.stringify(doc));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [doc]);

  const deleteSelected = useCallback(() => {
    if (!selection) return;
    commit((current) => deleteSelection(current, selection));
    setSelection(null);
    setStatus('Deleted selected element.');
  }, [commit, selection]);

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
        setTool(nextTool);
        setPendingNode(null);
        setPendingArrow(null);
      }
      if (event.key === 'Escape') {
        setPendingNode(null);
        setPendingArrow(null);
        setSelection(null);
        setStatus('Cancelled current action.');
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [deleteSelected, redo, undo]);

  const patchNode = useCallback(
    (id: NodeId, patch: Partial<DiagramNode>) => {
      commit((current) => ({
        ...current,
        nodes: current.nodes.map((node) => (node.id === id ? { ...node, ...patch } : node)),
      }));
    },
    [commit],
  );

  const patchArrow = useCallback(
    (id: ArrowId, patch: Partial<DiagramArrow>) => {
      const cell = doc.cells.find(
        (item) => item.sourceArrow === id || item.targetArrow === id,
      );
      if (cell && (patch.source || patch.target)) {
        setStatus('Reverse or retarget both boundary arrows before changing this 2-cell.');
        return;
      }
      commit((current) => ({
        ...current,
        arrows: current.arrows.map((arrow) =>
          arrow.id === id ? { ...arrow, ...patch } : arrow,
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
      const label = labels[doc.nodes.filter((node) => !node.ghost).length % labels.length];
      const next: DiagramNode = {
        id: makeId('node'),
        label,
        x: snap(point.x),
        y: snap(point.y),
      };
      const occupied = doc.nodes.some(
        (node) => node.x === next.x && node.y === next.y,
      );
      if (occupied) {
        setStatus('That grid position already contains an object.');
        return;
      }
      commit((current) => ({ ...current, nodes: [...current.nodes, next] }));
      setSelection({ kind: 'node', id: next.id });
      setStatus(`Created object ${label}.`);
    },
    [commit, doc.nodes],
  );

  const handleNodeAction = useCallback(
    (id: NodeId) => {
      if (tool !== 'arrow') {
        setSelection({ kind: 'node', id });
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
      setSelection({ kind: 'arrow', id: nextId });
      setStatus(`Created 1-cell ${label}.`);
    },
    [commit, doc.arrows, pendingNode, tool],
  );

  const handleArrowAction = useCallback(
    (id: ArrowId) => {
      if (tool !== 'cell') {
        setSelection({ kind: 'arrow', id });
        return;
      }
      if (!pendingArrow) {
        setPendingArrow(id);
        setStatus('Choose a parallel target arrow for the 2-cell.');
        return;
      }
      const sourceArrow = doc.arrows.find((arrow) => arrow.id === pendingArrow);
      const targetArrow = doc.arrows.find((arrow) => arrow.id === id);
      if (!sourceArrow || !targetArrow || !areParallel(sourceArrow, targetArrow)) {
        setStatus('A native 2-cell requires two distinct arrows with the same source and target.');
        setPendingArrow(null);
        return;
      }
      const alreadyUsed = doc.cells.some(
        (cell) =>
          [cell.sourceArrow, cell.targetArrow].includes(sourceArrow.id) ||
          [cell.sourceArrow, cell.targetArrow].includes(targetArrow.id),
      );
      if (alreadyUsed) {
        setStatus('One of those arrows already bounds a native 2-cell.');
        setPendingArrow(null);
        return;
      }
      const nextId = makeId('cell');
      const label = greekLabels[doc.cells.length % greekLabels.length];
      commit((current) => {
        const source = current.arrows.find((arrow) => arrow.id === sourceArrow.id)!;
        const target = current.arrows.find((arrow) => arrow.id === targetArrow.id)!;
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
              label,
              color: '#5b4bc4',
            },
          ],
        };
      });
      setPendingArrow(null);
      setSelection({ kind: 'cell', id: nextId });
      setStatus(`Created native 2-cell ${displayTex(label)}.`);
    },
    [commit, doc.arrows, doc.cells, pendingArrow, tool],
  );

  const beginNodeDrag = useCallback(() => {
    dragStart.current = history.present;
  }, [history.present]);

  const moveNode = useCallback((id: NodeId, point: Point) => {
    setHistory((current) => ({
      ...current,
      present: {
        ...current.present,
        nodes: current.present.nodes.map((node) =>
          node.id === id ? { ...node, ...point } : node,
        ),
      },
    }));
  }, []);

  const endNodeDrag = useCallback(() => {
    const before = dragStart.current;
    dragStart.current = null;
    if (!before) return;
    setHistory((current) => {
      if (JSON.stringify(before) === JSON.stringify(current.present)) return current;
      return {
        past: [...current.past.slice(-119), before],
        present: current.present,
        future: [],
      };
    });
    setStatus('Moved object.');
  }, []);

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = validateDocument(JSON.parse(await file.text()));
      if (!parsed) throw new Error('Invalid document');
      loadDocument(parsed, `Opened ${file.name}.`);
    } catch {
      setStatus('That file is not a valid XyQuiver v1 document.');
    }
  };

  const switchTool = (next: EditorTool) => {
    setTool(next);
    setPendingNode(null);
    setPendingArrow(null);
    setStatus(
      next === 'object'
        ? 'Click the canvas to create an object.'
        : next === 'arrow'
          ? 'Choose a source object, then a target object.'
          : next === 'cell'
            ? 'Choose two parallel 1-cells.'
            : 'Select and drag diagram elements.',
    );
  };

  const copyXyPic = async () => {
    await navigator.clipboard.writeText(typora.text);
    setStatus('Typora-ready Xy-pic copied.');
  };

  return (
    <main className="flex h-dvh min-h-[620px] flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-13 shrink-0 items-center gap-2 border-b bg-card px-3 shadow-[0_1px_0_rgb(23_29_39/3%)]">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm">
            XY
          </div>
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-semibold tracking-[-0.01em]">
                XyQuiver
              </h1>
              <Badge variant="secondary" className="hidden xl:inline-flex">
                native 2-cells
              </Badge>
            </div>
            <p className="max-w-48 truncate text-[10px] text-muted-foreground">
              {doc.title}
            </p>
          </div>
        </div>

        <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            Examples
            <ChevronDown data-icon="inline-end" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Diagrams</DropdownMenuLabel>
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

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-1.5 text-[11px] text-muted-foreground lg:flex">
            <Check className="size-3.5 text-emerald-600" />
            Saved locally
          </div>
          <Button
            variant="outline"
            size="sm"
            className="hidden md:inline-flex"
            onClick={copyXyPic}
          >
            <Copy data-icon="inline-start" />
            Copy Xy-pic
          </Button>
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

      <div className="grid min-h-0 flex-1 grid-cols-[52px_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_178px] md:grid-cols-[52px_minmax(0,1fr)_280px]">
        <nav
          aria-label="Diagram tools"
          className="row-span-2 flex flex-col items-center gap-1 border-r bg-card py-3"
        >
          {tools.map(({ id, label, key, icon: Icon }) => (
            <Button
              key={id}
              variant={tool === id ? 'secondary' : 'ghost'}
              size="icon-lg"
              className={
                tool === id
                  ? 'relative text-primary shadow-[inset_3px_0_0_var(--primary)]'
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

        <section
          className="relative min-h-0 overflow-hidden bg-canvas-grid"
          aria-label="Diagram editor"
        >
          <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-lg border bg-card/90 px-2.5 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
            <span className="font-medium text-foreground">
              {tool === 'select'
                ? 'Select'
                : tool === 'object'
                  ? 'Place object'
                  : tool === 'arrow'
                    ? pendingNode
                      ? 'Choose target'
                      : 'Choose source'
                    : pendingArrow
                      ? 'Choose target 1-cell'
                      : 'Choose source 1-cell'}
            </span>
            <span>·</span>
            <span>
              {doc.nodes.length} objects · {doc.arrows.length} arrows ·{' '}
              {doc.cells.length} 2-cells
            </span>
          </div>

          <DiagramCanvas
            doc={doc}
            selection={selection}
            tool={tool}
            pendingNode={pendingNode}
            pendingArrow={pendingArrow}
            onCanvasPoint={(point) => {
              if (tool === 'object') addNode(point);
              else if (tool !== 'select') {
                setPendingNode(null);
                setPendingArrow(null);
              }
            }}
            onSelect={setSelection}
            onNodeAction={handleNodeAction}
            onArrowAction={handleArrowAction}
            onBeginNodeDrag={beginNodeDrag}
            onMoveNode={moveNode}
            onEndNodeDrag={endNodeDrag}
          />

          <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border bg-card/90 px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
            {tool === 'select'
              ? 'Drag objects · Delete removes the selection'
              : tool === 'object'
                ? 'Click an empty grid position'
                : tool === 'arrow'
                  ? 'Select source object, then target object'
                  : 'Select two parallel arrows for a native 2-cell'}
          </div>
        </section>

        <aside
          className="row-span-2 hidden min-h-0 overflow-auto border-l bg-card md:block"
          aria-label="Inspector"
        >
          <div className="sticky top-0 z-10 flex h-11 items-center justify-between border-b bg-card px-4">
            <h2 className="text-xs font-semibold">Inspector</h2>
            {typora.warnings.length > 0 ? (
              <Badge variant="destructive">{typora.warnings.length} warning</Badge>
            ) : (
              <Badge variant="outline">lossless XY</Badge>
            )}
          </div>
          <Inspector
            doc={doc}
            selection={selection}
            onPatchNode={patchNode}
            onPatchArrow={patchArrow}
            onPatchCell={patchCell}
            onDelete={deleteSelected}
          />
        </aside>

        <section
          className="min-h-0 border-t bg-[#121721] text-slate-100"
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
            </div>
            <TabsContent value="typora" className="min-h-0 overflow-auto p-3">
              <pre className="font-mono text-[11px] leading-5 text-slate-300">
                <code>{typora.text}</code>
              </pre>
            </TabsContent>
            <TabsContent value="structure" className="min-h-0 overflow-auto p-3">
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="rounded-lg bg-white/5 p-2">
                  <p className="text-lg font-semibold text-white">{doc.nodes.length}</p>
                  <p className="text-slate-400">objects</p>
                </div>
                <div className="rounded-lg bg-white/5 p-2">
                  <p className="text-lg font-semibold text-white">{doc.arrows.length}</p>
                  <p className="text-slate-400">1-cells</p>
                </div>
                <div className="rounded-lg bg-white/5 p-2">
                  <p className="text-lg font-semibold text-white">{doc.cells.length}</p>
                  <p className="text-slate-400">2-cells</p>
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-5 text-slate-400">
                Parallel 2-cells compile to native \\xtwocell. Phantom anchors and
                double arrows cover free-standing XY geometry.
              </p>
            </TabsContent>
          </Tabs>
        </section>
      </div>

      <output className="sr-only" aria-live="polite" aria-atomic="true">
        {status}
      </output>
      <div className="pointer-events-none fixed bottom-3 right-3 z-40 hidden max-w-sm rounded-lg border bg-card/95 px-3 py-2 text-[11px] text-muted-foreground shadow-lg backdrop-blur xl:block">
        {status}
      </div>
    </main>
  );
}

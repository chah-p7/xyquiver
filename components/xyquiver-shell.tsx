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
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  CirclePlus,
  Copy,
  Download,
  FileJson,
  FolderOpen,
  Grid3X3,
  MousePointer2,
  Redo2,
  SlidersHorizontal,
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
import { ArrowStylePopover } from '@/components/arrow-style-popover';
import { CellStylePopover } from '@/components/cell-style-popover';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  alignDocumentToSceneGrid,
  cellCreationConflict,
  cellBoundaryPaths,
  cellSourceAnchor,
  cellTargetAnchor,
  cloneDocument,
  constrainArrowCurve,
  deleteSelections,
  displayTex,
  exampleDocuments,
  exportMatrixAxes,
  generateXyPic,
  inferCellBoundaryPaths,
  isNativeParallelCell,
  migrateLegacyHomotopyLayout,
  migrateLegacyParallelDeformation,
  resolvedArrowLabelPosition,
  resolvedCellLabelPosition,
  resolveConnectionLevel,
  selectionKey,
  snapCurveLevel,
  snapPointToMatrix,
  validateDocument,
  type ArrowId,
  type CellAnchor,
  type CellLabelPosition,
  type DiagramArrow,
  type DiagramDocument,
  type DiagramNode,
  type DiagramTwoCell,
  type NodeId,
  type Point,
  type Selection,
} from '@/lib/diagram';
import { localizedDocumentTitle, ui, useUiLanguage } from '@/lib/i18n';
import { preloadXyJax, renderXyPicSvg } from '@/lib/xyjax-svg';

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
];

const examples = [
  { id: 'quasicategory', label: 'Quasi-category composition 2-simplex' },
  { id: 'showcase', label: 'Pasting of attached arrows' },
  { id: 'twocell', label: 'Parallel double arrow' },
  { id: 'parallel', label: 'Parallel deformation arrows' },
  { id: 'homotopy', label: 'Homotopy stabilization' },
  { id: 'snake', label: 'Snake lemma' },
  { id: 'blank', label: 'Blank diagram' },
] as const;

const storageKey = 'xyquiver:document:v4';
const snakeDeltaMigrationKey = 'xyquiver:migration:snake-delta-left:v1';
const homotopyLayoutMigrationKey =
  'xyquiver:migration:homotopy-compact-square:v1';
const parallelDeformationMigrationKey =
  'xyquiver:migration:parallel-native-attachments:v1';
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
  live = false,
  className,
  onFocus,
  ...props
}: Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'onBlur'> & {
  value: string;
  onCommit: (value: string) => void;
  live?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const commit = () => {
    if (draft !== value) onCommit(draft);
  };
  return (
    <Input
      {...props}
      className={className}
      value={focused ? draft : value}
      onFocus={(event) => {
        setFocused(true);
        setDraft(value);
        onFocus?.(event);
      }}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        if (live && next !== value) onCommit(next);
      }}
      onBlur={() => {
        if (!live) commit();
        setFocused(false);
        setDraft(value);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          if (!live) commit();
          event.currentTarget.blur();
        }
        if (event.key === 'Escape') {
          setDraft(value);
          setFocused(false);
          event.currentTarget.blur();
        }
      }}
    />
  );
}

function anchorName(doc: DiagramDocument, anchor: CellAnchor | null) {
  if (!anchor) return '—';
  if (anchor.kind === 'node') {
    return displayTex(
      doc.nodes.find((item) => item.id === anchor.id)?.label ?? 'object',
    );
  }
  if (anchor.kind === 'arrow') {
    return displayTex(
      doc.arrows.find((item) => item.id === anchor.id)?.label ?? '1-cell',
    );
  }
  return displayTex(
    doc.cells.find((item) => item.id === anchor.id)?.label ?? 'attached arrow',
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
  const language = useUiLanguage();
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
            {ui(language, '尚未选择', 'Nothing selected')}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed">
            {ui(
              language,
              '选择对象、顶点箭头或附着箭头，即可编辑 LaTeX 和几何属性。',
              'Select an object, vertex arrow, or attached arrow to edit its LaTeX and geometry.',
            )}
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
            {ui(language, '已选择', 'Selected')}
          </p>
          <p className="mt-0.5 text-sm font-medium">
            {node
              ? ui(language, '对象', 'Object')
              : arrow
                ? ui(language, '顶点箭头', 'Vertex arrow')
                : ui(language, '附着箭头', 'Attached arrow')}
          </p>
        </div>
        <Badge variant="outline" className="font-mono">
          {node ? ui(language, '顶点', 'vertex') : arrow ? 'V→V' : '↠'}
        </Badge>
      </div>

      {node && (
        <>
          <div className="space-y-2">
            <Label htmlFor="node-label">
              {ui(language, 'LaTeX 标签', 'LaTeX label')}
            </Label>
            <DraftInput
              id="node-label"
              value={node.label}
              onCommit={(label) => onPatchNode(node.id, { label })}
              live
              className="font-mono"
            />
            <p className="truncate font-serif text-sm text-muted-foreground">
              {ui(language, '预览', 'Preview')}：
              {displayTex(node.label) ||
                ui(language, '占位点', 'phantom anchor')}
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
              <p className="text-xs font-medium">
                {ui(language, '空占位点', 'Phantom anchor')}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {ui(
                  language,
                  '用于独立的 XY 路径',
                  'Useful for free-standing XY paths',
                )}
              </p>
            </div>
            <Switch
              checked={Boolean(node.ghost)}
              onCheckedChange={(checked) =>
                onPatchNode(node.id, { ghost: Boolean(checked) })
              }
              aria-label={ui(language, '切换空占位点', 'Toggle phantom anchor')}
            />
          </div>
        </>
      )}

      {arrow && (
        <>
          <div className="space-y-2">
            <Label htmlFor="arrow-label">
              {ui(language, 'LaTeX 标签', 'LaTeX label')}
            </Label>
            <DraftInput
              id="arrow-label"
              value={arrow.label}
              onCommit={(label) => onPatchArrow(arrow.id, { label })}
              live
              className="font-mono"
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{ui(language, '弯曲度', 'Curvature')}</Label>
              <span className="font-mono text-[11px] text-muted-foreground">
                {Math.round(arrow.curve)}
              </span>
            </div>
            <Slider
              value={[arrow.curve]}
              min={-220}
              max={220}
              step={1}
              onValueChange={(value) => {
                const next = Array.isArray(value) ? value[0] : value;
                onPatchArrow(arrow.id, { curve: snapCurveLevel(Number(next)) });
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>{ui(language, '箭头样式', 'Arrow style')}</Label>
            <ArrowStylePopover
              arrow={arrow}
              onPatch={(patch) => onPatchArrow(arrow.id, patch)}
            />
          </div>
          <div className="space-y-2">
            <Label>{ui(language, '标签位置', 'Label position')}</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  ['top', ArrowUp, ui(language, '上', 'Top')],
                  ['bottom', ArrowDown, ui(language, '下', 'Bottom')],
                  ['left', ArrowLeft, ui(language, '左', 'Left')],
                  ['right', ArrowRight, ui(language, '右', 'Right')],
                ] as const
              ).map(([position, Icon, label]) => (
                <Button
                  key={position}
                  size="sm"
                  variant={
                    resolvedArrowLabelPosition(arrow) === position
                      ? 'secondary'
                      : 'outline'
                  }
                  aria-label={label}
                  title={label}
                  onClick={() =>
                    onPatchArrow(arrow.id, {
                      labelPlacement: position as CellLabelPosition,
                      labelSide: position === 'bottom' ? 'right' : 'left',
                    })
                  }
                >
                  <Icon className="size-3.5" />
                </Button>
              ))}
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
            {ui(language, '反转方向', 'Reverse direction')}
          </Button>
        </>
      )}

      {cell && (
        <>
          <div className="space-y-2">
            <Label htmlFor="cell-label">
              {ui(language, 'LaTeX 标签', 'LaTeX label')}
            </Label>
            <DraftInput
              id="cell-label"
              value={cell.label}
              onCommit={(label) => onPatchCell(cell.id, { label })}
              live
              className="font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border bg-muted/35 p-2.5">
              <p className="text-[10px] text-muted-foreground">
                {ui(language, '源', 'Source')}
              </p>
              <p className="mt-1 truncate font-serif text-sm">
                {anchorName(doc, cellSourceAnchor(cell))}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/35 p-2.5">
              <p className="text-[10px] text-muted-foreground">
                {ui(language, '目标', 'Target')}
              </p>
              <p className="mt-1 truncate font-serif text-sm">
                {anchorName(doc, cellTargetAnchor(cell))}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>
              {ui(language, '附着箭头样式', 'Attached-arrow style')}
            </Label>
            <CellStylePopover
              cell={cell}
              onPatch={(patch) => onPatchCell(cell.id, patch)}
            />
          </div>
          <div className="space-y-2">
            <Label>{ui(language, '标签位置', 'Label position')}</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  ['top', ArrowUp, ui(language, '上', 'Top')],
                  ['bottom', ArrowDown, ui(language, '下', 'Bottom')],
                  ['left', ArrowLeft, ui(language, '左', 'Left')],
                  ['right', ArrowRight, ui(language, '右', 'Right')],
                ] as const
              ).map(([position, Icon, label]) => (
                <Button
                  key={position}
                  size="sm"
                  variant={
                    resolvedCellLabelPosition(cell) === position
                      ? 'secondary'
                      : 'outline'
                  }
                  aria-label={label}
                  title={label}
                  onClick={() =>
                    onPatchCell(cell.id, {
                      labelPosition: position as CellLabelPosition,
                    })
                  }
                >
                  <Icon className="size-3.5" />
                </Button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-[11px] leading-relaxed text-indigo-950">
            {isNativeParallelCell(doc, cell) ? (
              <>
                {ui(
                  language,
                  '箭头到箭头，默认导出为 Xy-pic 双线箭头',
                  'Arrow-to-arrow, exported as an Xy-pic double arrow by default',
                )}
              </>
            ) : cellBoundaryPaths(cell).source.length === 2 ||
              cellBoundaryPaths(cell).target.length === 2 ? (
              <>
                {ui(
                  language,
                  '复合边界，并在 Xy-pic 中使用精确命名的路径锚点',
                  'Composite boundary with an exact named path anchor in Xy-pic',
                )}
              </>
            ) : (
              <>
                {ui(
                  language,
                  '附着锚点之间的双线箭头',
                  'Double-line arrow between attached anchors',
                )}
              </>
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
            {ui(
              language,
              '交换源边界与目标边界',
              'Swap source and target boundaries',
            )}
          </Button>
        </>
      )}

      <Separator />
      <Button variant="destructive" className="w-full" onClick={onDelete}>
        <Trash2 data-icon="inline-start" />
        {ui(language, '删除所选内容', 'Delete selected')}
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
  const language = useUiLanguage();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'typora' | 'snippet' | 'latex'>('typora');
  const [background, setBackground] = useState(false);
  const xy = useMemo(() => generateXyPic(doc, mode), [doc, mode]);
  const nativeXy = useMemo(() => generateXyPic(doc, 'snippet'), [doc]);
  const [svg, setSvg] = useState('');
  const [svgLoading, setSvgLoading] = useState(false);
  const [svgError, setSvgError] = useState('');
  const json = useMemo(() => JSON.stringify(doc, null, 2), [doc]);

  useEffect(() => {
    const preloadTimer = window.setTimeout(() => {
      void preloadXyJax().catch(() => {
        // The export tab reports a useful error if the optional renderer is
        // still unavailable when the user actually asks for it.
      });
    }, 700);
    return () => window.clearTimeout(preloadTimer);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let settled = false;
    const loadingTimer = window.setTimeout(() => {
      if (cancelled) return;
      setSvgLoading(true);
      setSvgError('');
    }, 120);
    void renderXyPicSvg(nativeXy.text, {
      background,
      title: doc.title || 'XyQuiver diagram',
    })
      .then((result) => {
        if (!cancelled) {
          setSvg(result);
          setSvgError('');
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSvgError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        settled = true;
        window.clearTimeout(loadingTimer);
        if (!cancelled) setSvgLoading(false);
      });
    return () => {
      cancelled = true;
      if (!settled) window.clearTimeout(loadingTimer);
    };
  }, [background, doc.title, nativeXy.text, open]);

  const copy = async (
    value: string,
    label: string,
    warnings: string[] = [],
  ) => {
    await navigator.clipboard.writeText(value);
    onStatus(
      warnings.length > 0
        ? ui(
            language,
            `${label} 已复制，但有 ${warnings.length} 条警告：${warnings[0]}`,
            `${label} copied with ${warnings.length} warning(s): ${warnings[0]}`,
          )
        : ui(
            language,
            `${label} 已复制到剪贴板。`,
            `${label} copied to clipboard.`,
          ),
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) setSvgError('');
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <Download data-icon="inline-start" />
        {ui(language, '导出', 'Export')}
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {ui(language, '源码与导出', 'Source and export')}
          </DialogTitle>
          <DialogDescription>
            {ui(
              language,
              '在一个位置预览、复制或下载所有输出格式。',
              'Preview, copy, or download every output format from one place.',
            )}
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
                    ? ui(language, 'Typora / XyJax', 'Typora / XyJax')
                    : item === 'snippet'
                      ? ui(language, 'XY 片段', 'XY snippet')
                      : ui(language, '完整 LaTeX', 'Full LaTeX')}
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
                {ui(language, '复制', 'Copy')}
              </Button>
              <Button
                onClick={() =>
                  downloadText(xy.text, 'xyquiver-diagram.tex', 'text/x-tex')
                }
              >
                <Download data-icon="inline-start" />
                {ui(language, '下载 .tex', 'Download .tex')}
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="svg" className="min-h-0 space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">
                  {ui(language, '白色背景', 'White background')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {ui(
                    language,
                    '关闭时导出透明 SVG。',
                    'Off exports a transparent SVG.',
                  )}
                </p>
              </div>
              <Switch
                checked={background}
                onCheckedChange={(checked) => {
                  setBackground(Boolean(checked));
                  setSvgLoading(true);
                  setSvgError('');
                }}
                aria-label={ui(
                  language,
                  '切换 SVG 背景',
                  'Toggle SVG background',
                )}
              />
            </div>
            <div className="grid h-[35vh] place-items-center overflow-hidden rounded-xl border bg-canvas-grid p-4 [&_svg]:h-full [&_svg]:w-full">
              {svgLoading ? (
                <p className="text-sm text-muted-foreground">
                  {ui(
                    language,
                    '正在用 XyJax 原生渲染…',
                    'Rendering natively with XyJax…',
                  )}
                </p>
              ) : svgError ? (
                <div className="max-w-md rounded-lg border border-destructive/30 bg-destructive/6 p-3 text-sm text-destructive">
                  <p className="font-medium">
                    {ui(language, '原生渲染失败', 'Native rendering failed')}
                  </p>
                  <p className="mt-1 text-xs opacity-80">{svgError}</p>
                </div>
              ) : svg ? (
                <div
                  className="contents"
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
              ) : null}
            </div>
            {nativeXy.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-950">
                {nativeXy.warnings.join(' ')}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {ui(
                language,
                '由当前 Xy-pic 源码经 XyJax 的 SVG 输出器原生渲染，不使用画布自绘路径。',
                "Rendered natively from the current Xy-pic source by XyJax's SVG output, not from the editor paths.",
              )}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={!svg || svgLoading}
                onClick={() => copy(svg, 'SVG', nativeXy.warnings)}
              >
                <Copy data-icon="inline-start" />
                {ui(language, '复制 SVG', 'Copy SVG')}
              </Button>
              <Button
                disabled={!svg || svgLoading}
                onClick={() =>
                  downloadText(svg, 'xyquiver-diagram.svg', 'image/svg+xml')
                }
              >
                <Download data-icon="inline-start" />
                {ui(language, '下载 .svg', 'Download .svg')}
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
                {ui(language, '复制 JSON', 'Copy JSON')}
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
                {ui(language, '下载 .json', 'Download .json')}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter className="text-xs text-muted-foreground sm:justify-start">
          {ui(
            language,
            'SVG 使用 XyJax 的原生 Xy-pic 排版结果；编辑画布仍保留可拖拽的语义控制层。',
            "SVG uses XyJax's native Xy-pic layout; the editor keeps a semantic interaction layer for dragging.",
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function XyQuiverShell() {
  const language = useUiLanguage();
  const [history, setHistory] = useState<HistoryState>(() => ({
    past: [],
    present: cloneDocument(exampleDocuments.quasicategory),
    future: [],
  }));
  const [tool, setTool] = useState<EditorTool>('select');
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('auto');
  const [showGrid, setShowGrid] = useState(true);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [editing, setEditing] = useState<Selection | null>(null);
  const [pendingNode, setPendingNode] = useState<NodeId | null>(null);
  const [pendingArrow, setPendingArrow] = useState<ArrowId | null>(null);
  const [canvasCancelEpoch, setCanvasCancelEpoch] = useState(0);
  const [status, setStatus] = useState('');
  const importRef = useRef<HTMLInputElement>(null);
  const doc = history.present;
  const selection = selections.at(-1) ?? null;
  // Report the same filled logical grid that the Xy-pic exporter uses. Every
  // visible 40 px snap centre crossed by a long arrow is one matrix position.
  const grid = useMemo(() => exportMatrixAxes(doc), [doc]);
  const documentTitle = localizedDocumentTitle(doc.title, language);
  const visibleStatus =
    status ||
    ui(
      language,
      '拖动即可绘制，端点会自动判断层级；双击空白处创建对象。',
      'Drag to draw: endpoints infer the level; double-click empty space to create an object.',
    );

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
    setStatus(ui(language, '已撤销上一步。', 'Undid last change.'));
  }, [cancelCanvasGesture, language]);

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
    setStatus(ui(language, '已重做。', 'Redid change.'));
  }, [cancelCanvasGesture, language]);

  const loadDocument = useCallback(
    (next: DiagramDocument, message: string) => {
      cancelCanvasGesture();
      setHistory({
        past: [],
        present: alignDocumentToSceneGrid(next),
        future: [],
      });
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
    const restoredLanguage = /^zh(?:-|$)/i.test(navigator.language)
      ? 'zh'
      : 'en';
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return;
      let restored = validateDocument(JSON.parse(stored));
      if (restored) {
        if (!localStorage.getItem(homotopyLayoutMigrationKey)) {
          restored = migrateLegacyHomotopyLayout(restored);
          localStorage.setItem(homotopyLayoutMigrationKey, '1');
        }
        if (!localStorage.getItem(parallelDeformationMigrationKey)) {
          restored = migrateLegacyParallelDeformation(restored);
          localStorage.setItem(parallelDeformationMigrationKey, '1');
        }
        if (!localStorage.getItem(snakeDeltaMigrationKey)) {
          const delta = restored.arrows.find(
            (arrow) =>
              arrow.id === 's-delta' &&
              arrow.source === 's-ker-h' &&
              arrow.target === 's-coker-f',
          );
          if (
            restored.title === 'Snake lemma' &&
            restored.nodes.length === 24 &&
            restored.arrows.length === 30 &&
            delta &&
            delta.curve >= 200
          ) {
            delta.curve = 180;
          }
          localStorage.setItem(snakeDeltaMigrationKey, '1');
        }
        setHistory({
          past: [],
          present: alignDocumentToSceneGrid(restored),
          future: [],
        });
        setSelections([]);
        setStatus(
          ui(restoredLanguage, '已恢复本地草稿。', 'Restored local draft.'),
        );
      }
    } catch {
      setStatus(
        ui(
          restoredLanguage,
          '无法恢复保存的草稿，仍可使用示例图。',
          'The saved draft could not be restored; the example is still available.',
        ),
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
      ui(
        language,
        `已删除 ${count} 个所选元素。`,
        `Deleted ${count} selected ${count === 1 ? 'element' : 'elements'}.`,
      ),
    );
  }, [commit, language, selections]);

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
      if (
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        event.key.toLowerCase() === 'g'
      ) {
        event.preventDefault();
        setShowGrid((current) => {
          setStatus(
            current
              ? ui(language, '矩阵网格已隐藏。', 'Matrix grid hidden.')
              : ui(language, '矩阵网格已显示。', 'Matrix grid shown.'),
          );
          return !current;
        });
        return;
      }
      const shortcuts: Record<string, EditorTool> = {
        v: 'select',
        o: 'object',
        '1': 'select',
        '2': 'object',
      };
      const nextTool = shortcuts[event.key.toLowerCase()];
      if (nextTool) {
        cancelCanvasGesture();
        setTool(nextTool);
        setConnectionMode('auto');
        setPendingNode(null);
        setPendingArrow(null);
      }
      if (event.key === 'Escape') {
        cancelCanvasGesture();
        setPendingNode(null);
        setPendingArrow(null);
        setEditing(null);
        setSelections([]);
        setStatus(
          ui(language, '已取消当前操作。', 'Cancelled current action.'),
        );
      }
      if (event.key === 'Enter' && selection) {
        event.preventDefault();
        setEditing(selection);
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [cancelCanvasGesture, deleteSelected, language, redo, selection, undo]);

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
          ui(
            language,
            '请先同时反转或重定向两条边界箭头，再修改这条附着箭头。',
            'Reverse or retarget both boundary arrows before changing this attached arrow.',
          ),
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
    [commit, doc.cells, language],
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

  const _legacyChangeSelectionLevel = useCallback(
    (
      item: Extract<Selection, { kind: 'arrow' | 'cell' }>,
      level: 'arrow' | 'cell' | 'three',
      label: string,
    ) => {
      if (
        (item.kind === 'arrow' && level === 'arrow') ||
        (item.kind === 'cell' &&
          ((level === 'cell' &&
            (doc.cells.find((cell) => cell.id === item.id)?.level ?? 2) ===
              2) ||
            (level === 'three' &&
              doc.cells.find((cell) => cell.id === item.id)?.level === 3)))
      ) {
        return;
      }

      if (level === 'three') {
        setStatus(
          ui(
            language,
            '三胞腔需要两个二胞腔端点：请从一个二胞腔拖到另一个二胞腔。',
            'A 3-cell needs two 2-cell endpoints: drag from one 2-cell to another.',
          ),
        );
        return;
      }

      if (item.kind === 'arrow') {
        const arrow = doc.arrows.find((candidate) => candidate.id === item.id);
        if (!arrow) return;
        const referenced = doc.cells.some((cell) => {
          const source = cellSourceAnchor(cell);
          const target = cellTargetAnchor(cell);
          const paths = cellBoundaryPaths(cell);
          return (
            (source?.kind === 'arrow' && source.id === arrow.id) ||
            (target?.kind === 'arrow' && target.id === arrow.id) ||
            paths.source.includes(arrow.id) ||
            paths.target.includes(arrow.id)
          );
        });
        if (referenced) {
          setStatus(
            ui(
              language,
              '这条一胞腔正被另一个二胞腔引用，需先解除该附着关系。',
              'This 1-cell is referenced by another 2-cell; detach it first.',
            ),
          );
          return;
        }
        const nextId = makeId('cell');
        commit((current) => ({
          ...current,
          arrows: current.arrows.filter(
            (candidate) => candidate.id !== arrow.id,
          ),
          cells: [
            ...current.cells,
            {
              id: nextId,
              sourceAnchor: { kind: 'node', id: arrow.source },
              targetAnchor: { kind: 'node', id: arrow.target },
              sourcePath: [],
              targetPath: [],
              label,
              color: arrow.color,
              head: arrow.head === 'none' ? 'none' : 'arrow',
              stroke:
                arrow.stroke === 'dashed' || arrow.stroke === 'dotted'
                  ? arrow.stroke
                  : 'solid',
            },
          ],
        }));
        setSelections([{ kind: 'cell', id: nextId }]);
        setEditing(null);
        setStatus(
          ui(
            language,
            '已将所选一胞腔转换为二胞腔。',
            'Converted the selected 1-cell to a 2-cell.',
          ),
        );
        return;
      }

      const cell = doc.cells.find((candidate) => candidate.id === item.id);
      if (!cell) return;
      if ((cell.level ?? 2) === 3) {
        setStatus(
          ui(
            language,
            '三胞腔不能在不丢失二胞腔边界的情况下直接降阶。',
            'A 3-cell cannot be lowered without discarding its 2-cell boundaries.',
          ),
        );
        return;
      }
      const sourceAnchor = cellSourceAnchor(cell);
      const targetAnchor = cellTargetAnchor(cell);
      let source: NodeId | null = null;
      let target: NodeId | null = null;
      if (sourceAnchor?.kind === 'node' && targetAnchor?.kind === 'node') {
        source = sourceAnchor.id;
        target = targetAnchor.id;
      } else if (
        sourceAnchor?.kind === 'arrow' &&
        targetAnchor?.kind === 'arrow'
      ) {
        const sourceBoundary = doc.arrows.find(
          (arrow) => arrow.id === sourceAnchor.id,
        );
        const targetBoundary = doc.arrows.find(
          (arrow) => arrow.id === targetAnchor.id,
        );
        if (
          sourceBoundary &&
          targetBoundary &&
          areParallel(sourceBoundary, targetBoundary)
        ) {
          source = sourceBoundary.source;
          target = sourceBoundary.target;
        }
      }
      if (!source || !target || source === target) {
        setStatus(
          ui(
            language,
            '这个附着二胞腔没有唯一的一胞腔端点，无法无损转换。',
            'This attached 2-cell has no unique pair of 1-cell endpoints.',
          ),
        );
        return;
      }
      if (cell.head === 'reverse') [source, target] = [target, source];
      const nextId = makeId('arrow');
      commit((current) => {
        const existing = current.arrows.filter(
          (arrow) => arrow.source === source && arrow.target === target,
        );
        let arrows = current.arrows;
        if (existing.length === 1 && Math.abs(existing[0].curve) < 8) {
          arrows = arrows.map((arrow) =>
            arrow.id === existing[0].id ? { ...arrow, curve: 58 } : arrow,
          );
        }
        return {
          ...current,
          arrows: [
            ...arrows,
            {
              id: nextId,
              source: source!,
              target: target!,
              label,
              curve: existing.length === 0 ? 0 : -58 - existing.length * 34,
              labelSide: existing.length === 0 ? 'left' : 'right',
              stroke:
                cell.stroke === 'dashed' || cell.stroke === 'dotted'
                  ? cell.stroke
                  : 'solid',
              head: cell.head === 'none' ? 'none' : 'arrow',
              tail: 'none',
              color: cell.color,
            },
          ],
          cells: current.cells.filter((candidate) => candidate.id !== cell.id),
        };
      });
      setSelections([{ kind: 'arrow', id: nextId }]);
      setEditing(null);
      setStatus(
        ui(
          language,
          '已将所选二胞腔转换为一胞腔。',
          'Converted the selected 2-cell to a 1-cell.',
        ),
      );
    },
    [commit, doc, language],
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
        setStatus(
          ui(
            language,
            '该网格位置已经存在对象。',
            'That grid position already contains an object.',
          ),
        );
        return;
      }
      commit((current) => ({ ...current, nodes: [...current.nodes, next] }));
      const nextSelection: Selection = { kind: 'node', id: next.id };
      setSelections([nextSelection]);
      setEditing(nextSelection);
      setStatus(
        ui(language, `已创建对象 ${label}。`, `Created object ${label}.`),
      );
    },
    [commit, doc, language],
  );

  const handleNodeAction = useCallback(
    (id: NodeId) => {
      if (tool !== 'arrow') {
        setSelections([{ kind: 'node', id }]);
        return;
      }
      if (!pendingNode) {
        setPendingNode(id);
        setStatus(
          ui(
            language,
            '请选择一胞腔的目标对象。',
            'Choose the target object for the 1-cell.',
          ),
        );
        return;
      }
      if (pendingNode === id) {
        setStatus(
          ui(
            language,
            '自环请使用底层 XY 编辑器。',
            'Self-loops are reserved for the low-level XY editor.',
          ),
        );
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
      setStatus(
        ui(language, `已创建一胞腔 ${label}。`, `Created 1-cell ${label}.`),
      );
    },
    [commit, doc.arrows, language, pendingNode, tool],
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
          ui(
            language,
            '点击平行目标以创建原生二胞腔，或拖动以创建一般附着二胞腔。',
            'Click a parallel target for a native 2-cell, or drag for a general attached 2-cell.',
          ),
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
          ui(
            language,
            '点击流程要求两条箭头平行；一般二胞腔请在锚点之间拖动。',
            'The click workflow needs parallel arrows; drag between anchors for a general 2-cell.',
          ),
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
            ? ui(
                language,
                '这对二胞腔边界已经存在。',
                'That 2-cell boundary pair already exists.',
              )
            : ui(
                language,
                '其中一条箭头已经是原生二胞腔的边界。',
                'One of those arrows already bounds a native 2-cell.',
              ),
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
        const siblings = current.cells.filter((cell) => {
          const cellSource = cellSourceAnchor(cell);
          const cellTarget = cellTargetAnchor(cell);
          return (
            cellSource?.kind === 'arrow' &&
            cellTarget?.kind === 'arrow' &&
            cellSource.id === source.id &&
            cellTarget.id === target.id
          );
        });
        let cells = current.cells;
        if (siblings.length === 1 && Math.abs(siblings[0].curve ?? 0) < 1) {
          cells = cells.map((cell) =>
            cell.id === siblings[0].id ? { ...cell, curve: -45 } : cell,
          );
        }
        const curveLevels = [0, 45, -70, 70, -100, 100, -140, 140];
        return {
          ...current,
          arrows,
          cells: [
            ...cells,
            {
              id: nextId,
              sourceArrow: source.id,
              targetArrow: target.id,
              sourceAnchor: { kind: 'arrow', id: source.id, t: 0.5 },
              targetAnchor: { kind: 'arrow', id: target.id, t: 0.5 },
              sourcePath: [source.id],
              targetPath: [target.id],
              label,
              color: '#273244',
              shaft: 'double',
              head: 'arrow',
              stroke: 'solid',
              curve:
                siblings.length === 0
                  ? 0
                  : curveLevels[
                      Math.min(siblings.length, curveLevels.length - 1)
                    ],
            },
          ],
        };
      });
      setPendingArrow(null);
      const nextSelection: Selection = { kind: 'cell', id: nextId };
      setSelections([nextSelection]);
      setEditing(nextSelection);
      setStatus(
        ui(
          language,
          `已创建原生二胞腔 ${displayTex(label)}。`,
          `Created native 2-cell ${displayTex(label)}.`,
        ),
      );
    },
    [commit, doc, language, pendingArrow, tool],
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
        ui(
          language,
          `已移动 ${Object.keys(positions).length} 个对象。`,
          `Moved ${Object.keys(positions).length} ${Object.keys(positions).length === 1 ? 'object' : 'objects'}.`,
        ),
      );
    },
    [commit, language],
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
      setStatus(
        ui(
          language,
          `弯曲度已设为 ${Math.round(constrained)}。`,
          `Curvature set to ${Math.round(constrained)}.`,
        ),
      );
    },
    [commit, doc, language],
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
      setStatus(ui(language, 'LaTeX 标签已更新。', 'Updated LaTeX label.'));
    },
    [commit, language],
  );

  const quickConnect = useCallback(
    (source: CanvasAnchor, target: CanvasAnchor, requested: ConnectionMode) => {
      const connectionError = connectionValidationError(
        source,
        target,
        requested,
      );
      if (connectionError) {
        setStatus(
          ui(language, '请拖动到另一个锚点以创建连线。', connectionError),
        );
        return;
      }
      const anchorExists = (anchor: CanvasAnchor) =>
        anchor.kind === 'point' ||
        (anchor.kind === 'node'
          ? doc.nodes.some((node) => node.id === anchor.id)
          : anchor.kind === 'arrow'
            ? doc.arrows.some((arrow) => arrow.id === anchor.id)
            : doc.cells.some((cell) => cell.id === anchor.id));
      if (!anchorExists(source) || !anchorExists(target)) {
        setStatus(
          ui(
            language,
            '该手势引用的对象已经不存在。',
            'That gesture referenced an object that no longer exists.',
          ),
        );
        return;
      }
      const mode = resolveConnectionLevel(requested, source.kind, target.kind);
      const newNodes: DiagramNode[] = [];
      const resolveNode = (
        anchor: CanvasAnchor,
        index: number,
      ): NodeId | null => {
        if (anchor.kind === 'node') return anchor.id;
        if (anchor.kind === 'arrow' || anchor.kind === 'cell') return null;
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
          setStatus(
            ui(
              language,
              '请为普通箭头选择两个不同的顶点锚点。',
              'Choose two different vertex anchors for an ordinary arrow.',
            ),
          );
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
            ? ui(
                language,
                `已创建 ${newNodes.length} 个对象和普通箭头 ${label}。`,
                `Created ${newNodes.length} ${newNodes.length === 1 ? 'object' : 'objects'} and ordinary arrow ${label}.`,
              )
            : ui(
                language,
                `已创建普通箭头 ${label}。`,
                `Created ordinary arrow ${label}.`,
              ),
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
        setStatus(
          ui(
            language,
            '请为附着箭头选择两个不同的锚点。',
            'Choose two different anchors for an attached arrow.',
          ),
        );
        return;
      }
      const conflict = cellCreationConflict(doc, sourceAnchor, targetAnchor);
      if (conflict) {
        setStatus(
          conflict === 'duplicate'
            ? ui(
                language,
                '这对二胞腔边界已经存在。',
                'That 2-cell boundary pair already exists.',
              )
            : ui(
                language,
                '其中一条箭头已经是原生二胞腔的边界。',
                'One of those arrows already bounds a native 2-cell.',
              ),
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
        const sameAnchor = (left: CellAnchor, right: CellAnchor) =>
          left.kind === right.kind &&
          left.id === right.id &&
          (left.kind !== 'arrow' ||
            right.kind !== 'arrow' ||
            Math.abs((left.t ?? 0.5) - (right.t ?? 0.5)) < 1e-6);
        const siblings = current.cells.filter((cell) => {
          const existingSource = cellSourceAnchor(cell);
          const existingTarget = cellTargetAnchor(cell);
          return Boolean(
            existingSource &&
            existingTarget &&
            sameAnchor(existingSource, sourceAnchor) &&
            sameAnchor(existingTarget, targetAnchor),
          );
        });
        let cells = current.cells;
        if (siblings.length === 1 && Math.abs(siblings[0].curve ?? 0) < 1) {
          cells = cells.map((cell) =>
            cell.id === siblings[0].id ? { ...cell, curve: -45 } : cell,
          );
        }
        const parallelCurveLevels = [0, 45, -70, 70, -100, 100, -140, 140];
        const curve =
          siblings.length === 0
            ? 0
            : parallelCurveLevels[
                Math.min(siblings.length, parallelCurveLevels.length - 1)
              ];
        return {
          ...withNodes,
          arrows,
          cells: [
            ...cells,
            {
              id: nextId,
              sourceArrow: nativeParallel ? sourceArrow!.id : undefined,
              targetArrow: nativeParallel ? targetArrow!.id : undefined,
              sourceAnchor,
              targetAnchor,
              sourcePath: paths.source,
              targetPath: paths.target,
              label,
              color: '#273244',
              shaft: 'double',
              head: 'arrow' as const,
              stroke: 'solid' as const,
              curve,
            },
          ],
        };
      });
      const nextSelection: Selection = { kind: 'cell', id: nextId };
      setSelections([nextSelection]);
      setEditing(nextSelection);
      setStatus(
        nativeParallel
          ? ui(
              language,
              `已创建原生平行附着箭头 ${displayTex(label)}。`,
              `Created native parallel attached arrow ${displayTex(label)}.`,
            )
          : sourceAnchor.kind === 'node' && targetAnchor.kind === 'arrow'
            ? ui(
                language,
                `已创建从顶点到对边的附着箭头 ${displayTex(label)}。`,
                `Created attached arrow ${displayTex(label)} from the vertex to the opposite edge.`,
              )
            : ui(
                language,
                `已创建一般附着箭头 ${displayTex(label)}。`,
                `Created general attached arrow ${displayTex(label)}.`,
              ),
      );
    },
    [commit, doc, language],
  );

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = validateDocument(JSON.parse(await file.text()));
      if (!parsed) throw new Error('Invalid document');
      loadDocument(
        parsed,
        ui(language, `已打开 ${file.name}。`, `Opened ${file.name}.`),
      );
    } catch {
      setStatus(
        ui(
          language,
          '该文件不是有效的 XyQuiver 文档。',
          'That file is not a valid XyQuiver document.',
        ),
      );
    }
  };

  const switchTool = (next: EditorTool) => {
    cancelCanvasGesture();
    setTool(next);
    setConnectionMode('auto');
    setPendingNode(null);
    setPendingArrow(null);
    setStatus(
      next === 'object'
        ? ui(
            language,
            '点击画布创建对象。',
            'Click the canvas to create an object.',
          )
        : ui(
            language,
            '直接拖动连接：顶点之间为普通箭头，附着到箭头时自动使用双线。',
            'Drag to connect: vertex-to-vertex is ordinary; arrow attachments are double-line.',
          ),
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
              {ui(language, '交换图编辑器', 'Diagram editor')}
            </h1>
          </div>
        </div>

        <Separator
          orientation="vertical"
          className="mx-1 hidden h-6 sm:block"
        />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="max-w-52 justify-between"
              />
            }
          >
            <span className="truncate">{documentTitle}</span>
            <ChevronDown data-icon="inline-end" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {examples.map((example) => (
              <DropdownMenuItem
                key={example.id}
                onClick={() =>
                  loadDocument(
                    exampleDocuments[example.id],
                    ui(
                      language,
                      `已载入${localizedDocumentTitle(example.label, language)}。`,
                      `Loaded ${example.label}.`,
                    ),
                  )
                }
              >
                {localizedDocumentTitle(example.label, language)}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => importRef.current?.click()}>
              <FolderOpen />
              {ui(language, '打开 XyQuiver JSON…', 'Open XyQuiver JSON…')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={ui(language, '撤销', 'Undo')}
            title={ui(language, '撤销（Ctrl+Z）', 'Undo (Ctrl+Z)')}
            disabled={history.past.length === 0}
            onClick={undo}
          >
            <Undo2 />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={ui(language, '重做', 'Redo')}
            title={ui(language, '重做（Ctrl+Shift+Z）', 'Redo (Ctrl+Shift+Z)')}
            disabled={history.future.length === 0}
            onClick={redo}
          >
            <Redo2 />
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={ui(language, '打开检查器', 'Open inspector')}
                  title={ui(language, '检查器', 'Inspector')}
                />
              }
            >
              <SlidersHorizontal data-icon="inline-start" />
              <span className="hidden md:inline">
                {ui(language, '检查', 'Inspect')}
              </span>
            </SheetTrigger>
            <SheetContent className="gap-0 overflow-hidden bg-card sm:max-w-[340px]">
              <SheetHeader className="border-b pr-12">
                <SheetTitle>{ui(language, '检查器', 'Inspector')}</SheetTitle>
                <SheetDescription>
                  {ui(
                    language,
                    '在不缩小画布的情况下编辑所选元素。',
                    'Edit the selected cell without shrinking the canvas.',
                  )}
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
        <section
          className="absolute inset-0"
          aria-label={ui(language, '交换图编辑器', 'Diagram editor')}
        >
          <div className="absolute left-[78px] top-4 z-10 hidden items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:flex">
            <span className="font-semibold text-foreground">
              {tool === 'object'
                ? ui(language, '放置对象', 'Place object')
                : ui(
                    language,
                    '拖动连接 · 端点自动决定箭头形态',
                    'Drag to connect · endpoints choose the arrow form',
                  )}
            </span>
            <span className="text-border">/</span>
            <span>
              {grid.columns.length}×{grid.rows.length}{' '}
              {ui(language, '矩阵', 'matrix')} · {doc.nodes.length}{' '}
              {ui(language, '个对象', 'objects')} · {doc.arrows.length}{' '}
              {ui(language, '条箭头', 'arrows')} · {doc.cells.length}{' '}
              {ui(language, '条附着箭头', 'attached arrows')}
            </span>
          </div>

          <DiagramCanvas
            key={canvasCancelEpoch}
            doc={doc}
            selections={selections}
            editing={editing}
            tool={tool}
            connectionMode={connectionMode}
            showGrid={showGrid}
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
            onPatchNode={patchNode}
            onPatchArrow={patchArrow}
            onPatchCell={patchCell}
            onBeginLabelEdit={(item) => {
              setSelections([item]);
              setEditing(item);
            }}
            onCommitLabel={commitLabel}
            onCancelLabelEdit={() => setEditing(null)}
            onStatus={setStatus}
          />

          <div className="pointer-events-none absolute bottom-3 left-[78px] z-10 max-w-[52vw] truncate rounded-md border bg-card/88 px-2.5 py-1.5 text-[10px] text-muted-foreground shadow-sm backdrop-blur">
            {visibleStatus}
          </div>
        </section>

        <nav
          aria-label={ui(language, '交换图工具', 'Diagram tools')}
          className="absolute left-3 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-1 rounded-xl border bg-card/92 p-1.5 shadow-[0_8px_28px_rgb(45_37_32/10%)] backdrop-blur"
        >
          {tools.map(({ id, label, key, icon: Icon }) =>
            (() => {
              const localizedLabel =
                id === 'select'
                  ? ui(language, '选择', label)
                  : ui(language, '对象', label);
              return (
                <Button
                  key={id}
                  variant={tool === id ? 'secondary' : 'ghost'}
                  size="icon-lg"
                  className={
                    tool === id
                      ? 'bg-accent text-primary shadow-none'
                      : 'text-muted-foreground'
                  }
                  aria-label={`${localizedLabel}${ui(language, '工具', ' tool')}`}
                  aria-pressed={tool === id}
                  title={`${localizedLabel} (${key})`}
                  onClick={() => switchTool(id)}
                >
                  <Icon />
                </Button>
              );
            })(),
          )}
          <Separator className="my-2 w-7" />
          <Button
            variant={showGrid ? 'secondary' : 'ghost'}
            size="icon-lg"
            className={showGrid ? 'text-primary' : 'text-muted-foreground'}
            aria-label={
              showGrid
                ? ui(language, '隐藏矩阵网格', 'Hide matrix grid')
                : ui(language, '显示矩阵网格', 'Show matrix grid')
            }
            aria-pressed={showGrid}
            title={
              showGrid
                ? ui(language, '隐藏矩阵网格（G）', 'Hide matrix grid (G)')
                : ui(language, '显示矩阵网格（G）', 'Show matrix grid (G)')
            }
            onClick={() => {
              setShowGrid((current) => !current);
              setStatus(
                showGrid
                  ? ui(language, '矩阵网格已隐藏。', 'Matrix grid hidden.')
                  : ui(language, '矩阵网格已显示。', 'Matrix grid shown.'),
              );
            }}
          >
            <Grid3X3 />
          </Button>
          <div className="mt-auto rounded-md border bg-muted/60 px-1.5 py-1 font-mono text-[9px] text-muted-foreground">
            {tools.find((item) => item.id === tool)?.key}
          </div>
        </nav>
      </div>

      <output className="sr-only" aria-live="polite" aria-atomic="true">
        {visibleStatus}
      </output>
    </main>
  );
}

'use client';

import { ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import {
  resolvedCellHead,
  resolvedCellStroke,
  snapCurveLevel,
  type CellHead,
  type CellStroke,
  type DiagramTwoCell,
} from '@/lib/diagram';
import { ui, useUiLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

function CellStylePreview({
  stroke,
  head,
  level = 2,
  className,
}: {
  stroke: CellStroke;
  head: Exclude<CellHead, 'equality'>;
  level?: 2 | 3;
  className?: string;
}) {
  const dash =
    stroke === 'dashed' ? '8 5' : stroke === 'dotted' ? '1 6' : undefined;
  const reverse = head === 'reverse';
  const hasHead = head === 'arrow' || head === 'reverse';
  const lineStart = reverse && hasHead ? 24 : 16;
  const lineEnd = !reverse && hasHead ? 76 : 84;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 32"
      className={className ?? 'h-7 w-full'}
    >
      {stroke === 'none' ? (
        <text
          x="50"
          y="21"
          textAnchor="middle"
          fill="currentColor"
          fontFamily="serif"
          fontSize="15"
        >
          α
        </text>
      ) : (
        <>
          {(level === 3 ? [10, 16, 22] : [13, 19]).map((y) => (
            <path
              key={y}
              d={`M ${lineStart} ${y} L ${lineEnd} ${y}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeDasharray={dash}
            />
          ))}
          {head === 'arrow' && (
            <path
              d="M 76 9 L 85 16 L 76 23"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {head === 'reverse' && (
            <path
              d="M 24 9 L 15 16 L 24 23"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </>
      )}
    </svg>
  );
}

function CellStyleChoice({
  label,
  selected,
  stroke,
  head,
  level = 2,
  onSelect,
}: {
  label: string;
  selected: boolean;
  stroke: CellStroke;
  head: Exclude<CellHead, 'equality'>;
  level?: 2 | 3;
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
      <CellStylePreview
        stroke={stroke}
        head={head}
        level={level}
        className="h-6 w-full"
      />
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </Button>
  );
}

export function CellStylePopover({
  cell,
  onPatch,
  compact = false,
  side = 'left',
  align = 'start',
  sideOffset = 12,
}: {
  cell: DiagramTwoCell;
  onPatch: (patch: Partial<DiagramTwoCell>) => void;
  compact?: boolean;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
}) {
  const language = useUiLanguage();
  const level = cell.level ?? 2;
  const stroke = resolvedCellStroke(cell);
  const head = resolvedCellHead(cell);
  const curve = cell.curve ?? 0;
  const setStroke = (next: CellStroke) =>
    onPatch({
      stroke: next,
      head: next === 'none' ? 'none' : cell.head === 'equality' ? 'none' : head,
    });
  const setHead = (next: Exclude<CellHead, 'equality'>) =>
    onPatch({
      head: next,
      stroke: stroke === 'none' ? 'solid' : stroke,
    });

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size={compact ? 'sm' : 'default'}
            aria-label={ui(
              language,
              `打开${level}-胞腔样式菜单`,
              `Open ${level}-cell style menu`,
            )}
            title={ui(language, `${level}-胞腔样式`, `${level}-cell style`)}
            className={cn(
              compact
                ? 'h-8 min-w-28 flex-1 justify-between gap-1.5 rounded-lg bg-background px-2 shadow-none'
                : 'h-auto w-full justify-between gap-3 px-3 py-2',
            )}
          />
        }
      >
        {compact ? (
          <>
            <CellStylePreview
              stroke={stroke}
              head={head}
              level={level}
              className="h-6 min-w-20 flex-1"
            />
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          </>
        ) : (
          <>
            <span className="min-w-0 flex-1 text-left">
              <CellStylePreview
                stroke={stroke}
                head={head}
                level={level}
                className="h-7 w-full max-w-40"
              />
              <span className="block truncate text-[10px] text-muted-foreground">
                {ui(language, `层级 ${level}`, `Level ${level}`)} ·{' '}
                {ui(
                  language,
                  stroke === 'solid'
                    ? '实线'
                    : stroke === 'dashed'
                      ? '虚线'
                      : stroke === 'dotted'
                        ? '点线'
                        : '仅标签',
                  stroke,
                )}{' '}
                ·{' '}
                {ui(
                  language,
                  head === 'none'
                    ? '无箭头'
                    : head === 'reverse'
                      ? '指向源'
                      : '指向目标',
                  head === 'none' ? 'no head' : head,
                )}
              </span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </>
        )}
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        className="w-[352px] gap-4 rounded-xl p-4 shadow-xl"
      >
        <PopoverHeader>
          <div className="flex items-center gap-2">
            <PopoverTitle>
              {ui(language, `${level}-胞腔样式`, `${level}-cell style`)}
            </PopoverTitle>
            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-indigo-700">
              {ui(language, `层级 ${level}`, `Level ${level}`)}
            </span>
          </div>
          <PopoverDescription>
            {ui(
              language,
              '改变图形样式时，高阶边界数据保持不变。',
              `A ${level}-cell keeps its higher boundary data while its glyph changes.`,
            )}
          </PopoverDescription>
        </PopoverHeader>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {ui(language, '弯曲度', 'Curvature')}
            </p>
            <div className="flex items-center gap-2">
              <span className="min-w-8 text-right font-mono text-[10px] text-muted-foreground">
                {Math.round(curve)}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 px-1.5 text-[10px]"
                disabled={Math.abs(curve) < 1}
                onClick={() => onPatch({ curve: 0 })}
              >
                {ui(language, '归零', 'Reset')}
              </Button>
            </div>
          </div>
          <Slider
            value={[curve]}
            min={-220}
            max={220}
            step={1}
            aria-label={ui(
              language,
              `${level}-胞腔弯曲度`,
              `${level}-cell curvature`,
            )}
            onValueChange={(value) =>
              onPatch({
                curve: snapCurveLevel(
                  Array.isArray(value) ? value[0] : value,
                ),
              })
            }
          />
          <p className="text-[10px] leading-4 text-muted-foreground">
            {ui(
              language,
              '也可直接拖动画布上的圆点；双击圆点恢复直线。',
              'You can also drag the canvas handle; double-click it to reset.',
            )}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {ui(
              language,
              level === 3 ? '三线线身' : '双线线身',
              level === 3 ? 'Triple-line body' : 'Double-line body',
            )}
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {(['solid', 'dashed', 'dotted', 'none'] as const).map((value) => (
              <CellStyleChoice
                key={value}
                label={
                  value === 'none'
                    ? ui(language, '仅标签', 'Label only')
                    : value === 'solid'
                      ? ui(language, '实线', 'Solid')
                      : value === 'dashed'
                        ? ui(language, '虚线', 'Dashed')
                        : ui(language, '点线', 'Dotted')
                }
                selected={stroke === value}
                stroke={value}
                head={head}
                level={level}
                onSelect={() => setStroke(value)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {ui(language, '方向', 'Direction')}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <CellStyleChoice
              label={ui(language, '指向目标', 'To target')}
              selected={head === 'arrow' && stroke !== 'none'}
              stroke={stroke === 'none' ? 'solid' : stroke}
              head="arrow"
              level={level}
              onSelect={() => setHead('arrow')}
            />
            <CellStyleChoice
              label={ui(language, '指向源', 'To source')}
              selected={head === 'reverse' && stroke !== 'none'}
              stroke={stroke === 'none' ? 'solid' : stroke}
              head="reverse"
              level={level}
              onSelect={() => setHead('reverse')}
            />
            <CellStyleChoice
              label={ui(language, '无箭头（=）', 'No head (=)')}
              selected={head === 'none' && stroke !== 'none'}
              stroke={stroke === 'none' ? 'solid' : stroke}
              head="none"
              level={level}
              onSelect={() => setHead('none')}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

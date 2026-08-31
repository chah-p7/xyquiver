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
  resolvedCellShaft,
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
  shaft = 'double',
  className,
}: {
  stroke: CellStroke;
  head: Exclude<CellHead, 'equality'>;
  shaft?: 'single' | 'double';
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
          {(shaft === 'double' ? [13, 19] : [16]).map((y) => (
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
  shaft = 'double',
  onSelect,
}: {
  label: string;
  selected: boolean;
  stroke: CellStroke;
  head: Exclude<CellHead, 'equality'>;
  shaft?: 'single' | 'double';
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
        shaft={shaft}
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
  const stroke = resolvedCellStroke(cell);
  const head = resolvedCellHead(cell);
  const shaft = resolvedCellShaft(cell);
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
              '打开附着箭头样式菜单',
              'Open attached-arrow style menu',
            )}
            title={ui(language, '附着箭头样式', 'Attached-arrow style')}
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
              shaft={shaft}
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
                shaft={shaft}
                className="h-7 w-full max-w-40"
              />
              <span className="block truncate text-[10px] text-muted-foreground">
                {ui(
                  language,
                  shaft === 'double' ? '双线附着箭头' : '单线附着箭头',
                  shaft === 'double' ? 'Double attached arrow' : 'Single attached arrow',
                )}{' '}
                ·{' '}
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
              {ui(language, '附着箭头样式', 'Attached-arrow style')}
            </PopoverTitle>
            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-indigo-700">
              {ui(language, '双线', 'Double line')}
            </span>
          </div>
          <PopoverDescription>
            {ui(
              language,
              '改变图形样式时，高阶边界数据保持不变。',
              'Changing the glyph keeps both attachment endpoints unchanged.',
            )}
          </PopoverDescription>
        </PopoverHeader>

        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {ui(language, '线身数量', 'Shaft count')}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <CellStyleChoice
              label={ui(language, '单线', 'Single')}
              selected={shaft === 'single'}
              stroke={stroke === 'none' ? 'solid' : stroke}
              head={head}
              shaft="single"
              onSelect={() => onPatch({ shaft: 'single' })}
            />
            <CellStyleChoice
              label={ui(language, '双线', 'Double')}
              selected={shaft === 'double'}
              stroke={stroke === 'none' ? 'solid' : stroke}
              head={head}
              shaft="double"
              onSelect={() => onPatch({ shaft: 'double' })}
            />
          </div>
        </div>

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
              '附着箭头弯曲度',
              'Attached-arrow curvature',
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
              '双线线身',
              'Double-line body',
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
                shaft={shaft}
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
              shaft={shaft}
              onSelect={() => setHead('arrow')}
            />
            <CellStyleChoice
              label={ui(language, '指向源', 'To source')}
              selected={head === 'reverse' && stroke !== 'none'}
              stroke={stroke === 'none' ? 'solid' : stroke}
              head="reverse"
              shaft={shaft}
              onSelect={() => setHead('reverse')}
            />
            <CellStyleChoice
              label={ui(language, '无箭头（=）', 'No head (=)')}
              selected={head === 'none' && stroke !== 'none'}
              stroke={stroke === 'none' ? 'solid' : stroke}
              head="none"
              shaft={shaft}
              onSelect={() => setHead('none')}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

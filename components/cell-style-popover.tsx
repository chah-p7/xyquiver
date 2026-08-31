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
import {
  resolvedCellHead,
  resolvedCellStroke,
  type CellHead,
  type CellStroke,
  type DiagramTwoCell,
} from '@/lib/diagram';
import { cn } from '@/lib/utils';

function CellStylePreview({
  stroke,
  head,
  className,
}: {
  stroke: CellStroke;
  head: Exclude<CellHead, 'equality'>;
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
          {[13, 19].map((y) => (
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
  onSelect,
}: {
  label: string;
  selected: boolean;
  stroke: CellStroke;
  head: Exclude<CellHead, 'equality'>;
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
      <CellStylePreview stroke={stroke} head={head} className="h-6 w-full" />
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
  const stroke = resolvedCellStroke(cell);
  const head = resolvedCellHead(cell);
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
            aria-label="Open 2-cell style menu"
            title="2-cell style"
            className={cn(
              compact
                ? 'h-8 min-w-32 justify-between gap-1.5 rounded-lg bg-background px-2 shadow-none'
                : 'h-auto w-full justify-between gap-3 px-3 py-2',
            )}
          />
        }
      >
        {compact ? (
          <>
            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-indigo-700">
              Level 2
            </span>
            <CellStylePreview
              stroke={stroke}
              head={head}
              className="h-6 w-16"
            />
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          </>
        ) : (
          <>
            <span className="min-w-0 flex-1 text-left">
              <CellStylePreview
                stroke={stroke}
                head={head}
                className="h-7 w-full max-w-40"
              />
              <span className="block truncate text-[10px] text-muted-foreground">
                Level 2 · {stroke} · {head === 'none' ? 'no head' : head}
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
            <PopoverTitle>2-cell style</PopoverTitle>
            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-indigo-700">
              Level 2
            </span>
          </div>
          <PopoverDescription>
            A 2-cell keeps its higher boundary data while its glyph changes.
          </PopoverDescription>
        </PopoverHeader>

        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Double-line body
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {(['solid', 'dashed', 'dotted', 'none'] as const).map((value) => (
              <CellStyleChoice
                key={value}
                label={
                  value === 'none'
                    ? 'Label only'
                    : value[0].toUpperCase() + value.slice(1)
                }
                selected={stroke === value}
                stroke={value}
                head={head}
                onSelect={() => setStroke(value)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Direction
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <CellStyleChoice
              label="To target"
              selected={head === 'arrow' && stroke !== 'none'}
              stroke={stroke === 'none' ? 'solid' : stroke}
              head="arrow"
              onSelect={() => setHead('arrow')}
            />
            <CellStyleChoice
              label="To source"
              selected={head === 'reverse' && stroke !== 'none'}
              stroke={stroke === 'none' ? 'solid' : stroke}
              head="reverse"
              onSelect={() => setHead('reverse')}
            />
            <CellStyleChoice
              label="No head (=)"
              selected={head === 'none' && stroke !== 'none'}
              stroke={stroke === 'none' ? 'solid' : stroke}
              head="none"
              onSelect={() => setHead('none')}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

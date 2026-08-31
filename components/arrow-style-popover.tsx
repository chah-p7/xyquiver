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
  type ArrowHead,
  type ArrowStroke,
  type ArrowTail,
  type DiagramArrow,
} from '@/lib/diagram';
import { cn } from '@/lib/utils';

const arrowStrokeOptions: Array<{ value: ArrowStroke; label: string }> = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'double', label: 'Double shaft' },
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

export function ArrowStylePreview({
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

export function ArrowStylePopover({
  arrow,
  onPatch,
  compact = false,
  side = 'left',
  align = 'start',
  sideOffset = 12,
}: {
  arrow: DiagramArrow;
  onPatch: (patch: Partial<DiagramArrow>) => void;
  compact?: boolean;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size={compact ? 'sm' : 'default'}
            aria-label="Open arrow style menu"
            title="Arrow style"
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
            <ArrowStylePreview
              stroke={arrow.stroke}
              head={arrow.head}
              tail={arrow.tail}
              className="h-6 min-w-20 flex-1"
            />
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          </>
        ) : (
          <>
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
            <PopoverTitle>1-cell style</PopoverTitle>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-600">
              Level 1
            </span>
          </div>
          <PopoverDescription>
            Body styling does not change this morphism into a 2-cell.
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
                onSelect={() => onPatch({ stroke: option.value })}
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
                onSelect={() => onPatch({ tail: option.value })}
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
                onSelect={() => onPatch({ head: option.value })}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

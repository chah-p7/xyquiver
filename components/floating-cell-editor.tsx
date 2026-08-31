'use client';

import { useRef, useState } from 'react';

import { ArrowStylePopover } from '@/components/arrow-style-popover';
import { CellStylePopover } from '@/components/cell-style-popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  normalizeMathTex,
  type DiagramArrow,
  type DiagramTwoCell,
} from '@/lib/diagram';
import { ui, useUiLanguage } from '@/lib/i18n';

type LabelFace = 'math' | 'upright' | 'bold' | 'italic';
type DrawLevel = 'auto' | 'arrow' | 'cell';

const faceCommands: Record<Exclude<LabelFace, 'math'>, string> = {
  upright: 'mathrm',
  bold: 'mathbf',
  italic: 'mathit',
};

function splitLabelFace(value: string): { face: LabelFace; body: string } {
  const tex = normalizeMathTex(value);
  const match = tex.match(/^\\(mathrm|mathbf|mathit)\{([\s\S]*)\}$/);
  if (!match) return { face: 'math', body: tex };
  const face =
    match[1] === 'mathrm'
      ? 'upright'
      : match[1] === 'mathbf'
        ? 'bold'
        : 'italic';
  return { face, body: match[2] };
}

function applyLabelFace(value: string, face: LabelFace) {
  const { body } = splitLabelFace(value);
  return face === 'math' ? body : `\\${faceCommands[face]}{${body}}`;
}

export function FloatingCellEditor({
  item,
  connectionMode,
  onChooseLevel,
  onCommitLabel,
  onPatchArrow,
  onPatchCell,
}: {
  item:
    | { kind: 'arrow'; value: DiagramArrow }
    | { kind: 'cell'; value: DiagramTwoCell };
  connectionMode: DrawLevel;
  onChooseLevel: (level: DrawLevel) => void;
  onCommitLabel: (label: string) => void;
  onPatchArrow?: (patch: Partial<DiagramArrow>) => void;
  onPatchCell?: (patch: Partial<DiagramTwoCell>) => void;
}) {
  const language = useUiLanguage();
  const [draft, setDraft] = useState(item.value.label);
  const draftRef = useRef(item.value.label);
  const skipBlurCommit = useRef(false);
  const { face } = splitLabelFace(draft);
  const updateDraft = (next: string) => {
    draftRef.current = next;
    setDraft(next);
  };
  const commit = (next = draftRef.current) => {
    if (next !== item.value.label) onCommitLabel(next);
  };
  const chooseFace = (nextFace: LabelFace) => {
    const next = applyLabelFace(draftRef.current, nextFace);
    updateDraft(next);
    commit(next);
  };

  return (
    <div className="flex size-full flex-col gap-1.5 text-[#302d34]">
      <div className="rounded-xl border border-[#d9ced6] bg-[#fbfaf7]/97 p-1.5 shadow-[0_10px_30px_rgb(46_29_44/14%)] backdrop-blur">
        <div className="flex items-center gap-1.5">
          <span
            className={
              item.kind === 'cell'
                ? 'rounded bg-indigo-100 px-1.5 py-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-indigo-700'
                : 'rounded bg-slate-100 px-1.5 py-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-slate-600'
            }
          >
            {item.kind === 'arrow'
              ? ui(language, '1-胞腔', '1-CELL')
              : ui(language, '2-胞腔', '2-CELL')}
          </span>
          <Input
            aria-label={ui(
              language,
              `编辑${item.kind === 'arrow' ? '一胞腔' : '二胞腔'}的 LaTeX 标签`,
              `Edit ${item.kind === 'arrow' ? '1-cell' : '2-cell'} LaTeX label`,
            )}
            title={ui(
              language,
              '直接输入 LaTeX 数学源码，无需定界符',
              'LaTeX math source — delimiters are not required',
            )}
            placeholder="\\alpha_1"
            value={draft}
            onChange={(event) => updateDraft(event.target.value)}
            onBlur={() => {
              if (skipBlurCommit.current) {
                skipBlurCommit.current = false;
                return;
              }
              window.setTimeout(() => commit(), 0);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                skipBlurCommit.current = true;
                commit();
                event.currentTarget.blur();
              } else if (event.key === 'Escape') {
                skipBlurCommit.current = true;
                updateDraft(item.value.label);
                event.currentTarget.blur();
              }
            }}
            className="h-7 min-w-0 flex-1 rounded-lg bg-white/88 px-2 font-mono text-[11px]"
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <div
            className="flex items-center gap-0.5"
            aria-label={ui(language, '文字样式', 'Label style')}
          >
            {(
              [
                ['math', 'M', ui(language, '数学斜体', 'Math italic')],
                ['upright', 'T', ui(language, '正体文字', 'Upright text')],
                ['bold', 'B', ui(language, '数学粗体', 'Bold math')],
                ['italic', 'I', ui(language, '显式斜体', 'Explicit italic')],
              ] as const
            ).map(([value, label, title]) => (
              <Button
                key={value}
                type="button"
                size="icon-xs"
                variant={face === value ? 'secondary' : 'ghost'}
                aria-label={title}
                aria-pressed={face === value}
                title={title}
                className={
                  value === 'bold'
                    ? 'font-bold'
                    : value === 'italic' || value === 'math'
                      ? 'font-serif italic'
                      : 'font-serif not-italic'
                }
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => chooseFace(value)}
              >
                {label}
              </Button>
            ))}
          </div>

          {item.kind === 'arrow' && onPatchArrow && (
            <div
              className="flex items-center gap-0.5"
              aria-label={ui(language, '标签位置', 'Label side')}
            >
              <Button
                type="button"
                size="xs"
                variant={
                  item.value.labelSide === 'left' ? 'secondary' : 'ghost'
                }
                aria-pressed={item.value.labelSide === 'left'}
                title={ui(language, '标签置于上方或左侧', 'Label above / left')}
                onClick={() => onPatchArrow({ labelSide: 'left' })}
              >
                {ui(language, '上方', 'Above')}
              </Button>
              <Button
                type="button"
                size="xs"
                variant={
                  item.value.labelSide === 'right' ? 'secondary' : 'ghost'
                }
                aria-pressed={item.value.labelSide === 'right'}
                title={ui(
                  language,
                  '标签置于下方或右侧',
                  'Label below / right',
                )}
                onClick={() => onPatchArrow({ labelSide: 'right' })}
              >
                {ui(language, '下方', 'Below')}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 rounded-xl border border-[#d9ced6] bg-[#fbfaf7]/97 p-1.5 shadow-[0_8px_24px_rgb(46_29_44/12%)] backdrop-blur">
        <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-muted/65 p-0.5">
          <Button
            type="button"
            size="xs"
            variant={connectionMode === 'auto' ? 'secondary' : 'ghost'}
            aria-pressed={connectionMode === 'auto'}
            title={ui(
              language,
              '根据端点自动判断下一条连线的层级',
              'Infer the next cell level from its endpoints',
            )}
            onClick={() => onChooseLevel('auto')}
          >
            {ui(language, '自动', 'Auto')}
          </Button>
          <Button
            type="button"
            size="xs"
            variant={connectionMode === 'arrow' ? 'secondary' : 'ghost'}
            aria-pressed={connectionMode === 'arrow'}
            title={ui(
              language,
              '下一条连线绘制为一胞腔',
              'Draw the next connection as a 1-cell',
            )}
            onClick={() => onChooseLevel('arrow')}
          >
            {ui(language, '1-胞腔', '1-cell')}
          </Button>
          <Button
            type="button"
            size="xs"
            variant={connectionMode === 'cell' ? 'secondary' : 'ghost'}
            aria-pressed={connectionMode === 'cell'}
            title={ui(
              language,
              '下一条连线绘制为二胞腔',
              'Draw the next connection as a 2-cell',
            )}
            onClick={() => onChooseLevel('cell')}
          >
            {ui(language, '2-胞腔', '2-cell')}
          </Button>
        </div>

        {item.kind === 'arrow' && onPatchArrow ? (
          <ArrowStylePopover
            arrow={item.value}
            compact
            side="top"
            align="center"
            sideOffset={10}
            onPatch={onPatchArrow}
          />
        ) : item.kind === 'cell' && onPatchCell ? (
          <CellStylePopover
            cell={item.value}
            compact
            side="top"
            align="center"
            sideOffset={10}
            onPatch={onPatchCell}
          />
        ) : null}
      </div>
    </div>
  );
}

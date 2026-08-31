'use client';

import { useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';

import { ArrowStylePopover } from '@/components/arrow-style-popover';
import { CellStylePopover } from '@/components/cell-style-popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  normalizeMathTex,
  resolvedCellLabelPosition,
  type CellLabelPosition,
  type DiagramArrow,
  type DiagramTwoCell,
} from '@/lib/diagram';
import { ui, useUiLanguage } from '@/lib/i18n';

type LabelFace = 'math' | 'upright' | 'bold' | 'italic';

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
  onCommitLabel,
  onPreviewLabel,
  onPatchArrow,
  onPatchCell,
}: {
  item:
    | { kind: 'arrow'; value: DiagramArrow }
    | { kind: 'cell'; value: DiagramTwoCell };
  onCommitLabel: (label: string) => void;
  onPreviewLabel: (label: string | null) => void;
  onPatchArrow?: (patch: Partial<DiagramArrow>) => void;
  onPatchCell?: (patch: Partial<DiagramTwoCell>) => void;
}) {
  const language = useUiLanguage();
  const itemLabel =
    item.kind === 'arrow'
      ? ui(language, '顶点箭头', 'VERTEX ARROW')
      : ui(language, '附着箭头', 'ATTACHED ARROW');
  const [draft, setDraft] = useState(item.value.label);
  const draftRef = useRef(item.value.label);
  const skipBlurCommit = useRef(false);
  const { face } = splitLabelFace(draft);
  const updateDraft = (next: string) => {
    draftRef.current = next;
    setDraft(next);
    onPreviewLabel(next);
  };
  const commit = (next = draftRef.current) => {
    onPreviewLabel(null);
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
            {itemLabel}
          </span>
          <Input
            aria-label={ui(
              language,
              '编辑箭头的 LaTeX 标签',
              'Edit arrow LaTeX label',
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
                draftRef.current = item.value.label;
                setDraft(item.value.label);
                onPreviewLabel(null);
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
          {item.kind === 'cell' && onPatchCell && (
            <div
              className="flex items-center gap-0.5"
              aria-label={ui(language, '标签位置', 'Label position')}
            >
              {(
                [
                  ['top', ArrowUp, ui(language, '上方', 'Top')],
                  ['bottom', ArrowDown, ui(language, '下方', 'Bottom')],
                  ['left', ArrowLeft, ui(language, '左侧', 'Left')],
                  ['right', ArrowRight, ui(language, '右侧', 'Right')],
                ] as const
              ).map(([position, Icon, title]) => (
                <Button
                  key={position}
                  type="button"
                  size="icon-xs"
                  variant={
                    resolvedCellLabelPosition(item.value) === position
                      ? 'secondary'
                      : 'ghost'
                  }
                  aria-label={title}
                  aria-pressed={
                    resolvedCellLabelPosition(item.value) === position
                  }
                  title={title}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() =>
                    onPatchCell({
                      labelPosition: position as CellLabelPosition,
                    })
                  }
                >
                  <Icon className="size-3.5" />
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center rounded-xl border border-[#d9ced6] bg-[#fbfaf7]/97 p-1.5 shadow-[0_8px_24px_rgb(46_29_44/12%)] backdrop-blur">
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

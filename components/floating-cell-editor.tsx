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
type DrawLevel = 'auto' | 'arrow' | 'cell' | 'three';

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
  onChangeLevel,
  onCommitLabel,
  onPreviewLabel,
  onPatchArrow,
  onPatchCell,
}: {
  item:
    | { kind: 'arrow'; value: DiagramArrow }
    | { kind: 'cell'; value: DiagramTwoCell };
  onChangeLevel: (level: Exclude<DrawLevel, 'auto'>, label: string) => void;
  onCommitLabel: (label: string) => void;
  onPreviewLabel: (label: string | null) => void;
  onPatchArrow?: (patch: Partial<DiagramArrow>) => void;
  onPatchCell?: (patch: Partial<DiagramTwoCell>) => void;
}) {
  const language = useUiLanguage();
  const itemLevel = item.kind === 'arrow' ? 1 : (item.value.level ?? 2);
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
              itemLevel >= 2
                ? 'rounded bg-indigo-100 px-1.5 py-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-indigo-700'
                : 'rounded bg-slate-100 px-1.5 py-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-slate-600'
            }
          >
            {ui(language, `${itemLevel}-胞腔`, `${itemLevel}-CELL`)}
          </span>
          <Input
            aria-label={ui(
              language,
              `编辑${itemLevel === 1 ? '一' : itemLevel === 2 ? '二' : '三'}胞腔的 LaTeX 标签`,
              `Edit ${itemLevel}-cell LaTeX label`,
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
        </div>
      </div>

      <div className="flex items-center gap-1.5 rounded-xl border border-[#d9ced6] bg-[#fbfaf7]/97 p-1.5 shadow-[0_8px_24px_rgb(46_29_44/12%)] backdrop-blur">
        <div
          className="flex shrink-0 items-center gap-0.5 rounded-lg bg-muted/65 p-0.5"
          aria-label={ui(
            language,
            '所选连线的层级',
            'Selected connection level',
          )}
        >
          <Button
            type="button"
            size="xs"
            variant={itemLevel === 1 ? 'secondary' : 'ghost'}
            className={
              itemLevel === 1
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : undefined
            }
            aria-pressed={itemLevel === 1}
            title={ui(
              language,
              '将当前所选内容转换为一胞腔',
              'Convert the selected connection to a 1-cell',
            )}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => {
              if (itemLevel === 1) {
                commit();
                return;
              }
              onPreviewLabel(null);
              onChangeLevel('arrow', draftRef.current);
            }}
          >
            {ui(language, '1-胞腔', '1-cell')}
          </Button>
          <Button
            type="button"
            size="xs"
            variant={itemLevel === 2 ? 'secondary' : 'ghost'}
            className={
              itemLevel === 2
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : undefined
            }
            aria-pressed={itemLevel === 2}
            title={ui(
              language,
              '将当前所选内容转换为二胞腔',
              'Convert the selected connection to a 2-cell',
            )}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => {
              if (itemLevel === 2) {
                commit();
                return;
              }
              onPreviewLabel(null);
              onChangeLevel('cell', draftRef.current);
            }}
          >
            {ui(language, '2-胞腔', '2-cell')}
          </Button>
          <Button
            type="button"
            size="xs"
            variant={itemLevel === 3 ? 'secondary' : 'ghost'}
            className={
              itemLevel === 3
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : undefined
            }
            aria-pressed={itemLevel === 3}
            title={ui(
              language,
              '三胞腔以两个二胞腔为端点；请从一个二胞腔拖到另一个。',
              'A 3-cell connects two 2-cells; drag from one 2-cell to another.',
            )}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => {
              if (itemLevel === 3) {
                commit();
                return;
              }
              onPreviewLabel(null);
              onChangeLevel('three', draftRef.current);
            }}
          >
            {ui(language, '3-胞腔', '3-cell')}
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

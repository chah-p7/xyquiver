'use client';

import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { normalizeMathTex, type DiagramNode } from '@/lib/diagram';
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

export function FloatingNodeEditor({
  node,
  onCommitLabel,
  onPreviewLabel,
  onPatch,
}: {
  node: DiagramNode;
  onCommitLabel: (label: string) => void;
  onPreviewLabel: (label: string | null) => void;
  onPatch: (patch: Partial<DiagramNode>) => void;
}) {
  const language = useUiLanguage();
  const [draft, setDraft] = useState(node.label);
  const draftRef = useRef(node.label);
  const skipBlurCommit = useRef(false);
  const { face } = splitLabelFace(draft);
  const updateDraft = (next: string) => {
    draftRef.current = next;
    setDraft(next);
    onPreviewLabel(next);
  };
  const commit = (next = draftRef.current) => {
    onPreviewLabel(null);
    if (next !== node.label) onCommitLabel(next);
  };
  const chooseFace = (nextFace: LabelFace) => {
    const next = applyLabelFace(draftRef.current, nextFace);
    updateDraft(next);
    commit(next);
  };

  return (
    <div className="size-full rounded-xl border border-[#d9ced6] bg-[#fbfaf7]/97 p-1.5 text-[#302d34] shadow-[0_10px_30px_rgb(46_29_44/14%)] backdrop-blur">
      <div className="flex items-center gap-1.5">
        <span
          className="rounded bg-amber-100 px-1.5 py-1 text-[9px] font-semibold tracking-[0.04em] text-amber-800"
          title={ui(
            language,
            '拖动对象本体移动；拖动两侧圆点创建连线',
            'Drag the object to move it; drag a side handle to connect',
          )}
        >
          {ui(language, '对象', 'OBJECT')}
        </span>
        <Input
          aria-label={ui(
            language,
            '编辑对象的 LaTeX 标签',
            'Edit object LaTeX label',
          )}
          title={ui(
            language,
            '直接输入 LaTeX 数学源码，无需定界符',
            'LaTeX math source — delimiters are not required',
          )}
          placeholder="\\mathcal{C}"
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
              draftRef.current = node.label;
              setDraft(node.label);
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

        <Button
          type="button"
          size="xs"
          variant={node.ghost ? 'secondary' : 'ghost'}
          aria-pressed={Boolean(node.ghost)}
          title={ui(language, '切换为空占位点', 'Toggle phantom anchor')}
          onClick={() => onPatch({ ghost: !node.ghost })}
        >
          {ui(language, '占位点', 'Phantom')}
        </Button>
      </div>
    </div>
  );
}

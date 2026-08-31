'use client';

import { useSyncExternalStore } from 'react';

export type UiLanguage = 'zh' | 'en';

function systemLanguage(): UiLanguage {
  if (typeof navigator === 'undefined') return 'en';
  const preferred = navigator.languages?.[0] ?? navigator.language;
  return /^zh(?:-|$)/i.test(preferred) ? 'zh' : 'en';
}

function subscribeLanguage(change: () => void) {
  window.addEventListener('languagechange', change);
  return () => window.removeEventListener('languagechange', change);
}

export function useUiLanguage(): UiLanguage {
  return useSyncExternalStore(subscribeLanguage, systemLanguage, () => 'en');
}

export function ui(language: UiLanguage, zh: string, en: string) {
  return language === 'zh' ? zh : en;
}

const chineseDocumentTitles: Record<string, string> = {
  'Quasi-category composition 2-simplex': '拟范畴复合二单形',
  'Pasting of 2-cells': '二胞腔粘合',
  'Native 2-cell': '原生二胞腔',
  'Parallel deformation arrows': '平行形变箭头',
  'Homotopy stabilization': '同伦稳定化',
  'Snake lemma': '蛇引理',
  'Blank diagram': '空白图',
};

export function localizedDocumentTitle(title: string, language: UiLanguage) {
  return language === 'zh' ? (chineseDocumentTitles[title] ?? title) : title;
}

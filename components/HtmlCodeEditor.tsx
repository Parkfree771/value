'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { sanitizeHtmlMode, sanitizeCssForHtmlMode, scopeCssSelectors, ALLOWED_IMPORT_DOMAINS } from '@/utils/sanitizeHtml';
import styles from './HtmlCodeEditor.module.css';

export interface HtmlCodeEditorHandle {
  getValue: () => string;
  flush: () => void;
  /** 현재 커서 위치에 텍스트(예: <img ...>)를 삽입 */
  insertAtCursor: (text: string) => void;
}

interface HtmlCodeEditorProps {
  value: string;
  onChange: (html: string) => void;
  onPreviewUpdate?: (html: string, css: string) => void;
  onReady?: (api: HtmlCodeEditorHandle) => void;
  placeholder?: string;
  editorOnly?: boolean;
}

export default function HtmlCodeEditor({ value, onChange, onPreviewUpdate, onReady, placeholder, editorOnly }: HtmlCodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewCss, setPreviewCss] = useState('');
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const onChangeDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const isExternalUpdate = useRef(false);

  // 항상 최신 콜백을 가리키는 refs (CodeMirror 클로저 안에서 stale 방지)
  const onChangeRef = useRef(onChange);
  const onPreviewUpdateRef = useRef(onPreviewUpdate);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onPreviewUpdateRef.current = onPreviewUpdate; }, [onPreviewUpdate]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // CodeMirror 초기화
  useEffect(() => {
    if (!mounted || !editorRef.current) return;

    let view: any;

    const initEditor = async () => {
      const { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection } = await import('@codemirror/view');
      const { EditorState } = await import('@codemirror/state');
      const { html } = await import('@codemirror/lang-html');
      const { oneDark } = await import('@codemirror/theme-one-dark');
      const { defaultKeymap, history, historyKeymap, indentWithTab } = await import('@codemirror/commands');
      const { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, foldKeymap, indentOnInput } = await import('@codemirror/language');
      const { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap } = await import('@codemirror/autocomplete');
      const { highlightSelectionMatches, searchKeymap } = await import('@codemirror/search');

      const isDark = document.documentElement.classList.contains('dark');

      const updateListener = EditorView.updateListener.of((update: any) => {
        if (update.docChanged && !isExternalUpdate.current) {
          const newValue = update.state.doc.toString();

          // onChange를 디바운스해 키 입력마다 부모가 리렌더되지 않게 함
          if (onChangeDebounceRef.current) clearTimeout(onChangeDebounceRef.current);
          onChangeDebounceRef.current = setTimeout(() => {
            onChangeRef.current(newValue);
          }, 200);

          if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
          previewDebounceRef.current = setTimeout(() => {
            updatePreview(newValue);
          }, 300);
        }
      });

      const state = EditorState.create({
        doc: value || placeholder || '',
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          drawSelection(),
          history(),
          foldGutter(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          autocompletion(),
          highlightSelectionMatches(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          html(),
          keymap.of([
            ...defaultKeymap,
            ...historyKeymap,
            ...foldKeymap,
            ...closeBracketsKeymap,
            ...completionKeymap,
            ...searchKeymap,
            indentWithTab,
          ]),
          EditorView.lineWrapping,
          ...(isDark ? [oneDark] : []),
          updateListener,
          EditorView.theme({
            '&': { height: '100%', fontSize: '13px' },
            '.cm-scroller': { overflow: 'auto', fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace" },
            '.cm-content': { padding: '12px 0' },
            '.cm-gutters': { minWidth: '40px' },
          }),
        ],
      });

      view = new EditorView({
        state,
        parent: editorRef.current!,
      });

      viewRef.current = view;
      updatePreview(value || '');

      // 부모에 flush API 노출 — 폼 제출 시 디바운스 미반영 값 회수
      if (onReady) {
        onReady({
          getValue: () => viewRef.current?.state.doc.toString() ?? '',
          flush: () => {
            if (onChangeDebounceRef.current) {
              clearTimeout(onChangeDebounceRef.current);
              onChangeDebounceRef.current = undefined;
            }
            const v = viewRef.current?.state.doc.toString();
            if (v != null) onChangeRef.current(v);
          },
          insertAtCursor: (text: string) => {
            const v = viewRef.current;
            if (!v) return;
            const { from, to } = v.state.selection.main;
            v.dispatch({
              changes: { from, to, insert: text },
              selection: { anchor: from + text.length },
              scrollIntoView: true,
            });
            v.focus();
          },
        });
      }
    };

    initEditor();

    return () => {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
      if (onChangeDebounceRef.current) clearTimeout(onChangeDebounceRef.current);
      view?.destroy();
      viewRef.current = null;
    };
  }, [mounted]);

  // 외부에서 value 변경 시 에디터 동기화 (수정 모드 로드)
  useEffect(() => {
    if (!viewRef.current || !mounted) return;
    const currentDoc = viewRef.current.state.doc.toString();
    if (currentDoc !== value && value) {
      isExternalUpdate.current = true;
      viewRef.current.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
      });
      isExternalUpdate.current = false;
      updatePreview(value);
    }
  }, [value, mounted]);

  const updatePreview = useCallback((rawHtml: string) => {
    // <link rel="stylesheet" href="..."> → @import url('...') 자동 변환
    // 허용된 폰트 도메인의 <link>만 @import로 변환, 나머지는 제거
    const linkImports: string[] = [];
    const htmlWithoutLinks = rawHtml.replace(
      /<link\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi,
      (fullMatch, href: string) => {
        // rel="stylesheet"인 경우만 처리
        if (!/rel\s*=\s*["']stylesheet["']/i.test(fullMatch)) return '';
        const isAllowed = ALLOWED_IMPORT_DOMAINS.some(domain => href.includes(domain));
        if (isAllowed) {
          linkImports.push(`@import url('${href}');`);
        }
        return '';
      }
    );

    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    const cssMatches: string[] = [];
    // link에서 변환된 @import를 CSS 맨 앞에 추가
    if (linkImports.length) cssMatches.push(linkImports.join('\n'));
    let match;
    while ((match = styleRegex.exec(htmlWithoutLinks)) !== null) {
      cssMatches.push(match[1]);
    }
    const htmlOnly = htmlWithoutLinks.replace(styleRegex, '');

    const sanitizedHtml = sanitizeHtmlMode(htmlOnly);
    const sanitizedCss = sanitizeCssForHtmlMode(cssMatches.join('\n'));

    // @import를 먼저 분리 (scopeCssSelectors가 url() 안의 세미콜론을 깨뜨리는 것 방지)
    const importStatements: string[] = [];
    const cssWithoutImports = sanitizedCss.replace(
      /@import\s+url\s*\([^)]*\)\s*;|@import\s+(['"])[^'"]*\1\s*;|@import\b[^;]*;/gi,
      (m) => { importStatements.push(m); return ''; }
    );
    const scopedCss = importStatements.join('\n') + (importStatements.length ? '\n' : '') + scopeCssSelectors(cssWithoutImports, 'html-preview-scope');

    // editorOnly 모드에서는 로컬 previewHtml/Css가 사용되지 않음 → 불필요한 setState 생략
    if (!editorOnly) {
      setPreviewHtml(sanitizedHtml);
      setPreviewCss(scopedCss);
    }

    onPreviewUpdateRef.current?.(sanitizedHtml, scopedCss);
  }, [editorOnly]);

  if (!mounted) {
    return (
      <div className={styles.editorStandalone}>
        <div className={styles.panelHeader}>
          <span className={styles.panelLabel}>HTML / CSS</span>
        </div>
        <div style={{ flex: 1 }} />
      </div>
    );
  }

  // editorOnly 모드: 코드 에디터만 렌더링, 프리뷰는 외부에서 처리
  if (editorOnly) {
    return (
      <div className={styles.editorStandalone}>
        <div className={styles.panelHeader}>
          <span className={styles.panelLabel}>HTML / CSS</span>
          <span className={styles.panelHint}>{'<style>'} 태그로 CSS 작성 가능</span>
        </div>
        <div ref={editorRef} className={styles.editorMount} />
      </div>
    );
  }

  // 기본 모드: 좌우 split
  return (
    <div className={styles.container}>
      <div className={styles.editorPanel}>
        <div className={styles.panelHeader}>
          <span className={styles.panelLabel}>HTML / CSS</span>
          <span className={styles.panelHint}>{'<style>'} 태그로 CSS 작성 가능</span>
        </div>
        <div ref={editorRef} className={styles.editorMount} />
      </div>

      <div className={styles.divider} />

      <div className={styles.previewPanel}>
        <div className={styles.panelHeader}>
          <span className={styles.panelLabel}>미리보기</span>
          <span className={styles.panelHint}>실제 표시될 결과</span>
        </div>
        <div className={styles.previewContent}>
          {previewCss && (
            <style dangerouslySetInnerHTML={{ __html: previewCss }} />
          )}
          <div
            className="article-content max-w-none html-preview-scope"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>
    </div>
  );
}

/** 프리뷰 전용 컴포넌트 — 외부에서 html/css를 받아 렌더링 */
export function HtmlPreviewPanel({ html, css, className }: { html: string; css: string; className?: string }) {
  return (
    <div className={`${styles.previewStandalone} ${className || ''}`}>
      <div className={styles.panelHeader}>
        <span className={styles.panelLabel}>미리보기</span>
        <span className={styles.panelHint}>실제 표시될 결과</span>
      </div>
      <div className={styles.previewContent}>
        {css && (
          <style dangerouslySetInnerHTML={{ __html: css }} />
        )}
        <div
          className="article-content max-w-none html-preview-scope"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}

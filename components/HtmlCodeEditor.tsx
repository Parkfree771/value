'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { sanitizeHtmlMode, sanitizeCssForHtmlMode, scopeCssSelectors } from '@/utils/sanitizeHtml';
import styles from './HtmlCodeEditor.module.css';

interface HtmlCodeEditorProps {
  value: string;
  onChange: (html: string) => void;
  onPreviewUpdate?: (html: string, css: string) => void;
  placeholder?: string;
  editorOnly?: boolean;
}

export default function HtmlCodeEditor({ value, onChange, onPreviewUpdate, placeholder, editorOnly }: HtmlCodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewCss, setPreviewCss] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const isExternalUpdate = useRef(false);

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
          onChange(newValue);

          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
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
    };

    initEditor();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
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
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    const cssMatches: string[] = [];
    let match;
    while ((match = styleRegex.exec(rawHtml)) !== null) {
      cssMatches.push(match[1]);
    }
    const htmlOnly = rawHtml.replace(styleRegex, '');

    const sanitizedHtml = sanitizeHtmlMode(htmlOnly);
    const sanitizedCss = sanitizeCssForHtmlMode(cssMatches.join('\n'));

    // @import를 먼저 분리 (scopeCssSelectors가 url() 안의 세미콜론을 깨뜨리는 것 방지)
    const importStatements: string[] = [];
    const cssWithoutImports = sanitizedCss.replace(
      /@import\s+url\s*\([^)]*\)\s*;|@import\s+(['"])[^'"]*\1\s*;|@import\b[^;]*;/gi,
      (m) => { importStatements.push(m); return ''; }
    );
    const scopedCss = importStatements.join('\n') + (importStatements.length ? '\n' : '') + scopeCssSelectors(cssWithoutImports, 'html-preview-scope');

    setPreviewHtml(sanitizedHtml);
    setPreviewCss(scopedCss);

    if (onPreviewUpdate) {
      onPreviewUpdate(sanitizedHtml, scopedCss);
    }
  }, [onPreviewUpdate]);

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

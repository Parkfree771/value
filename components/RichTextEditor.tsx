'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import ImageResize from 'tiptap-extension-resize-image';
import styles from './RichTextEditor.module.css';

// 에디터용 한국어 폰트 동적 로드 (글쓰기 페이지에서만 로드됨)
const EDITOR_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&family=Nanum+Gothic:wght@400;700&family=Nanum+Myeongjo:wght@400;700&display=swap';
if (typeof window !== 'undefined' && !document.querySelector(`link[href="${EDITOR_FONTS_URL}"]`)) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = EDITOR_FONTS_URL;
  document.head.appendChild(link);
}

// 커스텀 FontSize 확장 — TextStyle을 확장하여 font-size 스타일 속성 + 커맨드 추가
// 출력: <span style="font-size: 18px">텍스트</span>
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

const FontSizeExtension = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize?.replace(/['"]/g, '') || null,
        renderHTML: (attributes) => {
          if (!attributes.fontSize) return {};
          return { style: `font-size: ${attributes.fontSize}` };
        },
      },
    };
  },
  addCommands() {
    return {
      ...this.parent?.(),
      setFontSize:
        (size: string) =>
        ({ chain }: any) => {
          return chain().setMark('textStyle', { fontSize: size }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }: any) => {
          return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
        },
    };
  },
});

// 폰트 패밀리 목록 (Google Fonts로 로드됨)
const FONT_FAMILIES = [
  { label: '기본', value: '' },
  { label: 'Noto Sans KR', value: 'Noto Sans KR, sans-serif' },
  { label: '나눔고딕', value: 'Nanum Gothic, sans-serif' },
  { label: '나눔명조', value: 'Nanum Myeongjo, serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: 'Courier New, monospace' },
];

// 프리셋 폰트 크기
const FONT_SIZES = [
  { label: '10', value: '10px' },
  { label: '12', value: '12px' },
  { label: '14', value: '14px' },
  { label: '16', value: '16px' },
  { label: '18', value: '18px' },
  { label: '20', value: '20px' },
  { label: '24', value: '24px' },
  { label: '28', value: '28px' },
  { label: '32', value: '32px' },
  { label: '36', value: '36px' },
  { label: '48', value: '48px' },
];

// 프리셋 글자 색상
const TEXT_COLORS = [
  '#000000', '#374151', '#DC2626', '#EA580C', '#CA8A04',
  '#16A34A', '#2563EB', '#7C3AED', '#DB2777', '#FFFFFF',
];

// 프리셋 배경 색상
const BG_COLORS = [
  '#FEF08A', '#FECACA', '#FED7AA', '#BBF7D0',
  '#BFDBFE', '#DDD6FE', '#FBCFE8', '#E5E7EB',
];

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onEditorReady?: (editor: Editor) => void;
}

/**
 * Tiptap 에디터 내부 컴포넌트
 * useEditor 훅은 반드시 브라우저에서만 실행되어야 하므로
 * 외부 래퍼(RichTextEditor)에서 마운트 확인 후 렌더링한다.
 */
function TiptapEditor({ value, onChange, placeholder, onEditorReady }: RichTextEditorProps) {
  const isInternalUpdate = useRef(false);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const textColorRef = useRef<HTMLDivElement>(null);
  const bgColorRef = useRef<HTMLDivElement>(null);

  // 팔레트 외부 클릭 시 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (textColorRef.current && !textColorRef.current.contains(e.target as Node)) {
        setShowTextColorPicker(false);
      }
      if (bgColorRef.current && !bgColorRef.current.contains(e.target as Node)) {
        setShowBgColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Underline,
      TextAlign.configure({
        types: ['paragraph'],
      }),
      FontSizeExtension,
      FontFamily,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || '내용을 입력하세요...',
      }),
      ImageResize,
    ],
    content: value || '',
    onUpdate: ({ editor: ed }) => {
      isInternalUpdate.current = true;
      onChange(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class: `${styles.prosemirror} article-content`,
      },
    },
  });

  // 외부에서 value가 변경되면 에디터에 반영 (수정모드 로드 등)
  useEffect(() => {
    if (!editor) return;
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const currentHTML = editor.getHTML();
    const isEmpty = currentHTML === '<p></p>' || currentHTML === '';
    const valueIsEmpty = !value || value === '<p></p>' || value === '';

    if (isEmpty && valueIsEmpty) return;
    if (currentHTML !== value) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  // editor 인스턴스를 부모에 전달
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL을 입력하세요', previousUrl);

    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={styles.wrapper}>
      {/* 툴바 */}
      <div className={styles.toolbar}>
        {/* 폰트 패밀리 */}
        <select
          className={styles.fontFamilySelect}
          title="폰트"
          value={editor.getAttributes('textStyle').fontFamily || ''}
          onChange={(e) => {
            if (e.target.value) {
              editor.chain().focus().setFontFamily(e.target.value).run();
            } else {
              editor.chain().focus().unsetFontFamily().run();
            }
          }}
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font.label} value={font.value} style={font.value ? { fontFamily: font.value } : undefined}>
              {font.label}
            </option>
          ))}
        </select>

        {/* 폰트 크기 */}
        <select
          className={styles.fontSizeSelect}
          title="폰트 크기"
          value={editor.getAttributes('textStyle').fontSize || ''}
          onChange={(e) => {
            if (e.target.value) {
              editor.chain().focus().setFontSize(e.target.value).run();
            } else {
              editor.chain().focus().unsetFontSize().run();
            }
          }}
        >
          <option value="">크기</option>
          {FONT_SIZES.map((size) => (
            <option key={size.value} value={size.value}>
              {size.label}
            </option>
          ))}
        </select>

        <div className={styles.separator} />

        {/* 기본 서식 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`${styles.btn} ${editor.isActive('bold') ? styles.btnActive : ''}`}
          title="굵게"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`${styles.btn} ${editor.isActive('italic') ? styles.btnActive : ''}`}
          title="기울임"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`${styles.btn} ${editor.isActive('underline') ? styles.btnActive : ''}`}
          title="밑줄"
        >
          <u>U</u>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`${styles.btn} ${editor.isActive('strike') ? styles.btnActive : ''}`}
          title="취소선"
        >
          <s>S</s>
        </button>

        <div className={styles.separator} />

        {/* 글자 색상 */}
        <div className={styles.colorPickerWrap} ref={textColorRef}>
          <button
            type="button"
            className={styles.btn}
            onClick={() => { setShowTextColorPicker(!showTextColorPicker); setShowBgColorPicker(false); }}
            title="글자 색"
          >
            <span style={{
              borderBottom: `3px solid ${editor.getAttributes('textStyle').color || '#000000'}`,
              lineHeight: 1,
              fontWeight: 700,
              fontSize: '14px',
            }}>A</span>
          </button>
          {showTextColorPicker && (
            <div className={styles.colorPalette}>
              <div className={styles.colorGrid}>
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={styles.colorSwatch}
                    style={{ background: color, border: color === '#FFFFFF' ? '1px solid #d1d5db' : 'none' }}
                    onClick={() => {
                      editor.chain().focus().setColor(color).run();
                      setShowTextColorPicker(false);
                    }}
                    title={color}
                  />
                ))}
              </div>
              <div className={styles.colorCustomRow}>
                <span className={styles.colorCustomLabel}>직접 선택</span>
                <input
                  type="color"
                  className={styles.colorInput}
                  value={editor.getAttributes('textStyle').color || '#000000'}
                  onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                />
              </div>
            </div>
          )}
        </div>

        {/* 배경 색상 */}
        <div className={styles.colorPickerWrap} ref={bgColorRef}>
          <button
            type="button"
            className={styles.btn}
            onClick={() => { setShowBgColorPicker(!showBgColorPicker); setShowTextColorPicker(false); }}
            title="배경 색"
          >
            <span className={styles.colorTextHighlight}>A</span>
          </button>
          {showBgColorPicker && (
            <div className={styles.colorPalette}>
              <div className={styles.colorGrid}>
                {BG_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={styles.colorSwatch}
                    style={{ background: color }}
                    onClick={() => {
                      editor.chain().focus().toggleHighlight({ color }).run();
                      setShowBgColorPicker(false);
                    }}
                    title={color}
                  />
                ))}
              </div>
              <div className={styles.colorCustomRow}>
                <span className={styles.colorCustomLabel}>직접 선택</span>
                <input
                  type="color"
                  className={styles.colorInput}
                  defaultValue="#ffff00"
                  onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
                />
              </div>
            </div>
          )}
        </div>

        <div className={styles.separator} />

        {/* 정렬 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`${styles.btn} ${editor.isActive({ textAlign: 'left' }) ? styles.btnActive : ''}`}
          title="왼쪽 정렬"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`${styles.btn} ${editor.isActive({ textAlign: 'center' }) ? styles.btnActive : ''}`}
          title="가운데 정렬"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`${styles.btn} ${editor.isActive({ textAlign: 'right' }) ? styles.btnActive : ''}`}
          title="오른쪽 정렬"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className={styles.separator} />

        {/* 리스트 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`${styles.btn} ${editor.isActive('bulletList') ? styles.btnActive : ''}`}
          title="불릿 리스트"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" />
            <circle cx="4" cy="6" r="1.5" fill="currentColor" /><circle cx="4" cy="12" r="1.5" fill="currentColor" /><circle cx="4" cy="18" r="1.5" fill="currentColor" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`${styles.btn} ${editor.isActive('orderedList') ? styles.btnActive : ''}`}
          title="번호 리스트"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="10" y1="6" x2="20" y2="6" /><line x1="10" y1="12" x2="20" y2="12" /><line x1="10" y1="18" x2="20" y2="18" />
            <text x="3" y="8" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">1</text>
            <text x="3" y="14" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">2</text>
            <text x="3" y="20" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">3</text>
          </svg>
        </button>

        {/* 링크 */}
        <button
          type="button"
          onClick={setLink}
          className={`${styles.btn} ${editor.isActive('link') ? styles.btnActive : ''}`}
          title="링크"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </button>

        <div className={styles.separator} />

        {/* 서식 제거 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          className={styles.btn}
          title="서식 제거"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h7.5M15.5 4L9.5 20M17 4l-4 8" /><line x1="18" y1="20" x2="4" y2="6" />
          </svg>
        </button>

        {/* 실행 취소 / 다시 실행 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className={styles.btn}
          title="실행 취소"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className={styles.btn}
          title="다시 실행"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
          </svg>
        </button>
      </div>

      {/* 에디터 본문 */}
      <EditorContent editor={editor} className={styles.editorContent} />
    </div>
  );
}

/**
 * RichTextEditor 래퍼
 * Next.js에서 Tiptap v3의 useEditor는 window.next 존재 여부로 SSR을 감지하므로,
 * 브라우저 마운트가 완료된 후에만 TiptapEditor를 렌더링한다.
 * 이는 Tiptap + Next.js 공식 권장 패턴이다.
 */
export default function RichTextEditor(props: RichTextEditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // SSR/hydration 중에는 에디터 자리만 잡아두는 스켈레톤 렌더
    return (
      <div className={styles.wrapper}>
        <div className={styles.toolbar} style={{ minHeight: '42px' }} />
        <div className={styles.editorContent} style={{ minHeight: '400px' }} />
      </div>
    );
  }

  return <TiptapEditor {...props} />;
}

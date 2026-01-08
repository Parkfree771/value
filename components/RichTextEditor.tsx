'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { useEffect, useState, useImperativeHandle, forwardRef } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export interface RichTextEditorRef {
  insertImage: (url: string) => void;
}

// 폰트 크기 커스텀 extension
const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: element => element.style.fontSize || null,
        renderHTML: attributes => {
          if (!attributes.fontSize) {
            return {};
          }
          return {
            style: `font-size: ${attributes.fontSize}`,
          };
        },
      },
    };
  },
});

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({ content, onChange, placeholder }, ref) => {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: false, // 코드 블록 비활성화
      }),
      Underline,
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none min-h-[300px] px-4 py-3 focus:outline-none',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // 외부에서 이미지 삽입할 수 있도록 ref 노출
  useImperativeHandle(ref, () => ({
    insertImage: (url: string) => {
      if (editor) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    },
  }));

  if (!editor) {
    return (
      <div className="w-full min-h-[300px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">에디터 로딩 중...</p>
      </div>
    );
  }

  const setFontSize = (size: string) => {
    if (size) {
      editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
    }
  };

  const setTextColor = (color: string) => {
    editor.chain().focus().setColor(color).run();
  };

  const setHighlight = (color: string) => {
    if (color === 'none') {
      editor.chain().focus().unsetHighlight().run();
    } else {
      editor.chain().focus().setHighlight({ color }).run();
    }
  };

  const addLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl('');
      setShowLinkInput(false);
    }
  };

  const removeLink = () => {
    editor.chain().focus().unsetLink().run();
  };

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-700">
      {/* 툴바 */}
      <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600">

        {/* 폰트 크기 */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">크기:</label>
          <select
            onChange={(e) => setFontSize(e.target.value)}
            className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            defaultValue=""
          >
            <option value="" disabled>선택</option>
            <option value="12px">12px</option>
            <option value="14px">14px</option>
            <option value="16px">16px</option>
            <option value="18px">18px</option>
            <option value="20px">20px</option>
            <option value="24px">24px</option>
            <option value="28px">28px</option>
            <option value="32px">32px</option>
            <option value="36px">36px</option>
          </select>
        </div>

        <div className="w-px h-8 bg-gray-300 dark:bg-gray-600" />

        {/* 제목 스타일 */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`px-2 py-1 text-xs rounded font-semibold transition-colors ${
              editor.isActive('heading', { level: 1 })
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
            }`}
            title="제목 1"
          >
            H1
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-2 py-1 text-xs rounded font-semibold transition-colors ${
              editor.isActive('heading', { level: 2 })
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
            }`}
            title="제목 2"
          >
            H2
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`px-2 py-1 text-xs rounded font-semibold transition-colors ${
              editor.isActive('heading', { level: 3 })
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
            }`}
            title="제목 3"
          >
            H3
          </button>
        </div>

        <div className="w-px h-8 bg-gray-300 dark:bg-gray-600" />

        {/* Bold, Italic, Underline, Strike */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`px-2 py-1 text-xs rounded font-bold transition-colors ${
              editor.isActive('bold')
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
            }`}
            title="굵게 (Ctrl+B)"
          >
            B
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`px-2 py-1 text-xs rounded italic transition-colors ${
              editor.isActive('italic')
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
            }`}
            title="기울임 (Ctrl+I)"
          >
            I
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`px-2 py-1 text-xs rounded underline transition-colors ${
              editor.isActive('underline')
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
            }`}
            title="밑줄 (Ctrl+U)"
          >
            U
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`px-2 py-1 text-xs rounded line-through transition-colors ${
              editor.isActive('strike')
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
            }`}
            title="취소선"
          >
            S
          </button>
        </div>

        <div className="w-px h-8 bg-gray-300 dark:bg-gray-600" />

        {/* 텍스트 색상 */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">글자색:</label>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setTextColor('#000000')}
              className="w-6 h-6 rounded border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
              style={{ backgroundColor: '#000000' }}
              title="검정"
            />
            <button
              type="button"
              onClick={() => setTextColor('#dc2626')}
              className="w-6 h-6 rounded border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
              style={{ backgroundColor: '#dc2626' }}
              title="빨강"
            />
            <button
              type="button"
              onClick={() => setTextColor('#2563eb')}
              className="w-6 h-6 rounded border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
              style={{ backgroundColor: '#2563eb' }}
              title="파랑"
            />
            <button
              type="button"
              onClick={() => setTextColor('#16a34a')}
              className="w-6 h-6 rounded border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
              style={{ backgroundColor: '#16a34a' }}
              title="초록"
            />
            <button
              type="button"
              onClick={() => setTextColor('#ea580c')}
              className="w-6 h-6 rounded border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
              style={{ backgroundColor: '#ea580c' }}
              title="주황"
            />
          </div>
        </div>

        <div className="w-px h-8 bg-gray-300 dark:bg-gray-600" />

        {/* 배경색 */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">배경색:</label>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setHighlight('none')}
              className="w-6 h-6 rounded flex items-center justify-center text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-gray-300 dark:border-gray-600"
              title="배경색 제거"
            >
              ✕
            </button>
            <button
              type="button"
              onClick={() => setHighlight('#fef08a')}
              className="w-6 h-6 rounded border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
              style={{ backgroundColor: '#fef08a' }}
              title="노랑 형광펜"
            />
            <button
              type="button"
              onClick={() => setHighlight('#bfdbfe')}
              className="w-6 h-6 rounded border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
              style={{ backgroundColor: '#bfdbfe' }}
              title="파랑 형광펜"
            />
            <button
              type="button"
              onClick={() => setHighlight('#bbf7d0')}
              className="w-6 h-6 rounded border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
              style={{ backgroundColor: '#bbf7d0' }}
              title="초록 형광펜"
            />
            <button
              type="button"
              onClick={() => setHighlight('#fecaca')}
              className="w-6 h-6 rounded border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
              style={{ backgroundColor: '#fecaca' }}
              title="빨강 형광펜"
            />
          </div>
        </div>

        <div className="w-px h-8 bg-gray-300 dark:bg-gray-600" />

        {/* 정렬 */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">정렬:</label>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={`px-2 py-1 text-sm rounded transition-colors ${
                editor.isActive({ textAlign: 'left' })
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
              }`}
              title="왼쪽 정렬"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 4h16v2H2V4zm0 4h10v2H2V8zm0 4h16v2H2v-2zm0 4h10v2H2v-2z"/>
              </svg>
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={`px-2 py-1 text-sm rounded transition-colors ${
                editor.isActive({ textAlign: 'center' })
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
              }`}
              title="가운데 정렬"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 4h16v2H2V4zm3 4h10v2H5V8zm-3 4h16v2H2v-2zm3 4h10v2H5v-2z"/>
              </svg>
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={`px-2 py-1 text-sm rounded transition-colors ${
                editor.isActive({ textAlign: 'right' })
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
              }`}
              title="오른쪽 정렬"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 4h16v2H2V4zm6 4h10v2H8V8zm-6 4h16v2H2v-2zm6 4h10v2H8v-2z"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="w-px h-8 bg-gray-300 dark:bg-gray-600" />

        {/* 리스트 */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              editor.isActive('bulletList')
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
            }`}
            title="글머리 기호 목록"
          >
            • 목록
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              editor.isActive('orderedList')
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
            }`}
            title="번호 매기기 목록"
          >
            1. 목록
          </button>
        </div>

        <div className="w-px h-8 bg-gray-300 dark:bg-gray-600" />

        {/* 인용 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            editor.isActive('blockquote')
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
          }`}
          title="인용"
        >
          &quot;
        </button>

        <div className="w-px h-8 bg-gray-300 dark:bg-gray-600" />

        {/* 링크 */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setShowLinkInput(!showLinkInput)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              editor.isActive('link')
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
            }`}
            title="링크 추가"
          >
            🔗
          </button>

          {editor.isActive('link') && (
            <button
              type="button"
              onClick={removeLink}
              className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
              title="링크 제거"
            >
              🔗✕
            </button>
          )}
        </div>

        <div className="w-px h-8 bg-gray-300 dark:bg-gray-600" />

        {/* 실행 취소/다시 실행 */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="px-2 py-1 text-xs rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-gray-300 dark:border-gray-600"
            title="실행 취소 (Ctrl+Z)"
          >
            ↶
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="px-2 py-1 text-xs rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-gray-300 dark:border-gray-600"
            title="다시 실행 (Ctrl+Y)"
          >
            ↷
          </button>
        </div>
      </div>

      {/* 링크 입력 UI */}
      {showLinkInput && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 flex gap-2">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            onKeyPress={(e) => e.key === 'Enter' && addLink()}
          />
          <button
            type="button"
            onClick={addLink}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            추가
          </button>
          <button
            type="button"
            onClick={() => setShowLinkInput(false)}
            className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            취소
          </button>
        </div>
      )}

      {/* 에디터 영역 */}
      <div className="bg-white dark:bg-gray-700">
        <EditorContent editor={editor} />
      </div>

      {/* 스타일링 */}
      <style jsx global>{`
        .ProseMirror {
          min-height: 300px;
          padding: 1rem;
          color: #111827;
          background: white;
        }

        .dark .ProseMirror {
          color: #f9fafb;
          background: #374151;
        }

        .ProseMirror:focus {
          outline: none;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          content: '${placeholder || '리포트 본문을 입력하세요...'}';
          color: #9ca3af;
          pointer-events: none;
          height: 0;
          float: left;
        }

        .dark .ProseMirror p.is-editor-empty:first-child::before {
          color: #6b7280;
        }

        .ProseMirror h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 0.67em 0;
          line-height: 1.2;
        }

        .ProseMirror h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 0.83em 0;
          line-height: 1.3;
        }

        .ProseMirror h3 {
          font-size: 1.17em;
          font-weight: bold;
          margin: 1em 0;
          line-height: 1.4;
        }

        .ProseMirror p {
          margin: 0.5em 0;
        }

        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 1em 0;
        }

        .ProseMirror ul {
          list-style-type: disc;
        }

        .ProseMirror ol {
          list-style-type: decimal;
        }

        .ProseMirror li {
          margin: 0.25em 0;
        }

        .ProseMirror blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #6b7280;
          font-style: italic;
        }

        .dark .ProseMirror blockquote {
          border-left-color: #4b5563;
          color: #9ca3af;
        }

        .ProseMirror pre {
          background: #1f2937;
          color: #f9fafb;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          font-family: 'Courier New', Courier, monospace;
          font-size: 0.875em;
          line-height: 1.5;
          margin: 1em 0;
        }

        .ProseMirror code {
          background-color: #f3f4f6;
          padding: 0.2em 0.4em;
          border-radius: 0.25rem;
          font-size: 0.875em;
          font-family: 'Courier New', Courier, monospace;
        }

        .dark .ProseMirror code {
          background-color: #1f2937;
          color: #f9fafb;
        }

        .ProseMirror pre code {
          background: none;
          padding: 0;
          color: inherit;
          font-size: inherit;
        }

        .ProseMirror strong {
          font-weight: bold;
        }

        .ProseMirror em {
          font-style: italic;
        }

        .ProseMirror u {
          text-decoration: underline;
        }

        .ProseMirror s {
          text-decoration: line-through;
        }

        .ProseMirror a {
          color: #2563eb;
          text-decoration: underline;
          cursor: pointer;
        }

        .dark .ProseMirror a {
          color: #60a5fa;
        }

        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1em 0;
        }

        .ProseMirror mark {
          border-radius: 0.2em;
          padding: 0.1em 0.2em;
        }

        .ProseMirror ::selection {
          background: #bfdbfe;
        }

        .dark .ProseMirror ::selection {
          background: #1e40af;
        }

        /* 텍스트 정렬 */
        .ProseMirror [style*="text-align: left"] {
          text-align: left;
        }

        .ProseMirror [style*="text-align: center"] {
          text-align: center;
        }

        .ProseMirror [style*="text-align: right"] {
          text-align: right;
        }
      `}</style>
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;

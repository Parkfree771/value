'use client';

import { useCallback } from 'react';
import DefaultEditor, {
  Toolbar,
  BtnBold,
  BtnItalic,
  BtnUnderline,
  BtnStrikeThrough,
  BtnBulletList,
  BtnNumberedList,
  BtnLink,
  BtnClearFormatting,
  Separator,
  ContentEditableEvent,
} from 'react-simple-wysiwyg';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const handleChange = useCallback((e: ContentEditableEvent) => {
    onChange(e.target.value);
  }, [onChange]);

  // 툴바 버튼: 텍스트 색상
  const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    document.execCommand('foreColor', false, e.target.value);
  }, []);

  // 툴바 버튼: 배경 색상
  const handleBgColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    document.execCommand('hiliteColor', false, e.target.value);
  }, []);

  // 정렬
  const align = useCallback((alignment: string) => {
    document.execCommand(alignment === 'left' ? 'justifyLeft' : alignment === 'center' ? 'justifyCenter' : alignment === 'right' ? 'justifyRight' : 'justifyLeft');
  }, []);

  // 글자 크기
  const handleFontSize = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    document.execCommand('fontSize', false, e.target.value);
  }, []);

  return (
    <div className="rich-text-editor-wrapper">
      <DefaultEditor
        value={value}
        onChange={handleChange}
        containerProps={{
          style: {
            minHeight: '400px',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            overflow: 'hidden',
          },
        }}
      >
        <Toolbar>
          {/* 글자 크기 */}
          <select
            onChange={handleFontSize}
            defaultValue="3"
            title="글자 크기"
            style={{
              height: '28px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              padding: '0 4px',
              fontSize: '13px',
              cursor: 'pointer',
              background: 'transparent',
            }}
          >
            <option value="1">아주 작게</option>
            <option value="2">작게</option>
            <option value="3">보통</option>
            <option value="4">크게</option>
            <option value="5">아주 크게</option>
            <option value="6">매우 크게</option>
          </select>
          <Separator />

          {/* 기본 서식 */}
          <BtnBold />
          <BtnItalic />
          <BtnUnderline />
          <BtnStrikeThrough />
          <Separator />

          {/* 색상 */}
          <label title="글자 색" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', padding: '0 4px' }}>
            <span style={{ fontSize: '13px', marginRight: '2px' }}>A</span>
            <input
              type="color"
              onChange={handleColorChange}
              defaultValue="#000000"
              style={{ width: '20px', height: '20px', border: 'none', cursor: 'pointer', padding: 0 }}
            />
          </label>
          <label title="배경 색" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', padding: '0 4px' }}>
            <span style={{ fontSize: '13px', marginRight: '2px', backgroundColor: '#ffff00', padding: '0 2px' }}>A</span>
            <input
              type="color"
              onChange={handleBgColorChange}
              defaultValue="#ffff00"
              style={{ width: '20px', height: '20px', border: 'none', cursor: 'pointer', padding: 0 }}
            />
          </label>
          <Separator />

          {/* 정렬 */}
          <button type="button" onClick={() => align('left')} title="왼쪽 정렬"
            style={{ padding: '2px 6px', cursor: 'pointer', background: 'transparent', border: 'none' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/>
            </svg>
          </button>
          <button type="button" onClick={() => align('center')} title="가운데 정렬"
            style={{ padding: '2px 6px', cursor: 'pointer', background: 'transparent', border: 'none' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
            </svg>
          </button>
          <button type="button" onClick={() => align('right')} title="오른쪽 정렬"
            style={{ padding: '2px 6px', cursor: 'pointer', background: 'transparent', border: 'none' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <Separator />

          {/* 리스트 & 링크 */}
          <BtnBulletList />
          <BtnNumberedList />
          <BtnLink />
          <Separator />

          {/* 서식 제거 */}
          <BtnClearFormatting />
        </Toolbar>
      </DefaultEditor>

      {placeholder && !value && (
        <div
          style={{
            position: 'absolute',
            top: '52px',
            left: '16px',
            color: '#9ca3af',
            fontSize: '14px',
            pointerEvents: 'none',
          }}
        />
      )}

      <style>{`
        .rich-text-editor-wrapper {
          position: relative;
        }
        .rich-text-editor-wrapper [contenteditable] {
          min-height: 400px;
          padding: 12px 16px;
          font-size: 14px;
          line-height: 1.7;
          outline: none;
        }
        .rich-text-editor-wrapper [contenteditable] ul {
          list-style-type: disc;
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .rich-text-editor-wrapper [contenteditable] ol {
          list-style-type: decimal;
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .rich-text-editor-wrapper [contenteditable] li {
          margin: 0.25em 0;
        }
        .rich-text-editor-wrapper [contenteditable]:empty::before {
          content: '${placeholder || '내용을 입력하세요...'}';
          color: #9ca3af;
        }
        .rsw-toolbar {
          padding: 6px 8px !important;
          gap: 2px;
          flex-wrap: wrap;
          border-bottom: 1px solid #e5e7eb !important;
        }
        .rsw-btn {
          width: 28px !important;
          height: 28px !important;
        }
        .rsw-separator {
          margin: 0 4px !important;
        }
        .rsw-ce {
          min-height: 400px !important;
          padding: 12px 16px !important;
        }

        /* 다크모드 */
        .dark .rich-text-editor-wrapper [contenteditable] {
          background: #374151;
          color: #f3f4f6;
        }
        .dark .rich-text-editor-wrapper [contenteditable]:empty::before {
          color: #6b7280;
        }
        .dark .rsw-toolbar {
          background: #1f2937 !important;
          border-bottom-color: #4b5563 !important;
        }
        .dark .rsw-btn {
          color: #d1d5db !important;
        }
        .dark .rsw-btn:hover {
          background: #374151 !important;
        }
        .dark .rsw-editor {
          border-color: #4b5563 !important;
        }
        .dark .rsw-ce {
          background: #374151 !important;
          color: #f3f4f6 !important;
        }
      `}</style>
    </div>
  );
}

import React, { useRef, useMemo } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// @ts-ignore
window.katex = katex;

interface QuestionRichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onImageUpload?: (file: File) => Promise<string>;
}

export default function QuestionRichEditor({ 
  value, 
  onChange, 
  placeholder = 'Enter your question here...',
  onImageUpload 
}: QuestionRichEditorProps) {
  const quillRef = useRef<ReactQuill>(null);

  // Custom image handler
  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (file && onImageUpload) {
        try {
          const url = await onImageUpload(file);
          const quill = quillRef.current?.getEditor();
          if (quill) {
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, 'image', url);
          }
        } catch (error) {
          console.error('Image upload failed:', error);
        }
      } else if (file) {
        // Fallback to base64 if no upload handler
        const reader = new FileReader();
        reader.onload = (e) => {
          const quill = quillRef.current?.getEditor();
          if (quill && e.target?.result) {
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, 'image', e.target.result);
          }
        };
        reader.readAsDataURL(file);
      }
    };
  };

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        ['link', 'image', 'formula'],
        ['code-block'],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    },
    formula: true
  }), [onImageUpload]);

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet', 'indent',
    'link', 'image', 'formula',
    'code-block'
  ];

  return (
    <div className="question-rich-editor">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        className="bg-white dark:bg-navy-dark text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-navy-border"
      />
    </div>
  );
}

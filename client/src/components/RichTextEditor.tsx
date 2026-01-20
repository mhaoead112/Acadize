import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './RichTextEditor.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write your essay answer here...',
  maxLength
}) => {
  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'header': [1, 2, 3, false] }],
      ['link'],
      ['clean']
    ]
  };

  const formats = [
    'bold', 'italic', 'underline',
    'list', 'bullet',
    'header',
    'link'
  ];

  const handleChange = (content: string) => {
    // Strip HTML tags for length calculation
    const textContent = content.replace(/<[^>]*>/g, '');
    if (maxLength && textContent.length > maxLength) return;
    onChange(content);
  };

  // Calculate text length without HTML tags
  const textLength = value.replace(/<[^>]*>/g, '').length;

  return (
    <div className="rich-text-editor">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        className="dark:bg-navy-dark dark:text-white bg-white text-slate-900"
      />
      {maxLength && (
        <p className={`text-xs mt-2 ${
          textLength > maxLength * 0.9 
            ? 'dark:text-orange-400 text-orange-600 font-bold' 
            : 'dark:text-slate-500 text-slate-600'
        }`}>
          {textLength} / {maxLength} characters
          {textLength > maxLength * 0.9 && textLength < maxLength && ' (approaching limit)'}
        </p>
      )}
    </div>
  );
};

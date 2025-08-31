import React, { useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import MessageActions from './MessageActions.jsx';

export default function MessageBubble({ message }) {
  const ref = useRef();

  useEffect(() => {
    if (ref.current) {
      const codeBlocks = ref.current.querySelectorAll('pre code');
      codeBlocks.forEach((block) => hljs.highlightElement(block));
    }
  }, [message]);

  const isUser = message.role === 'user' || message.sender === 'user' || message.from === 'user';
  const alignment = isUser ? 'items-end text-right' : 'items-start text-left';
  const bg = isUser ? 'bg-blue-500 text-white' : 'bg-gray-200';

  let content;
  if (message.type === 'file' && message.file) {
    content = (
      <a href={message.file.path} target="_blank" rel="noopener noreferrer" className="underline">
        {message.file.originalname}
      </a>
    );
  } else {
    const html = DOMPurify.sanitize(marked.parse(message.content || message.message || ''));
    content = <div dangerouslySetInnerHTML={{ __html: html }} />;
  }

  return (
    <div className={`relative flex ${alignment} group`}>
      {!isUser && <MessageActions message={message} />}
      <div ref={ref} className={`max-w-xl p-2 rounded shadow ${bg}`}>
        {content}
      </div>
    </div>
  );
}

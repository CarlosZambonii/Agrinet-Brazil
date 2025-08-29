import React, { useState } from 'react';
import { useStore } from '../store.js';

export default function InputBox() {
  const { dispatch } = useStore();
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);

  const send = async () => {
    if (!text && !file) return;
    try {
      const payload = { from: 'user', to: 'assistant', content: text, type: file ? 'file' : 'text' };
      const res = await fetch('/messages', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      });
      const msg = await res.json();
      dispatch({ type: 'ADD_MESSAGE', message: msg });
      setText('');
      setFile(null);
    } catch (e) {
      console.error(e);
    }
  };

  const voice = () => {
    if (!('webkitSpeechRecognition' in window)) return;
    const rec = new webkitSpeechRecognition();
    rec.lang = 'en-US';
    rec.onresult = (e) => {
      setText((t) => t + e.results[0][0].transcript);
    };
    rec.start();
  };

  return (
    <div className="p-2 border-t flex items-center space-x-2">
      <input
        type="file"
        className="hidden"
        id="file-input"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <button onClick={() => document.getElementById('file-input').click()} className="p-2" title="Attach">
        📎
      </button>
      {file && (
        <span className="text-sm" title={file.name}>{file.name}</span>
      )}
      <button onClick={voice} className="p-2" title="Voice input">🎤</button>
      <textarea
        className="flex-1 border rounded p-2"
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
      />
      <button onClick={send} className="p-2" title="Send">
        📨
      </button>
    </div>
  );
}

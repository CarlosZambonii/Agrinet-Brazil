import React, { useState } from 'react';
import { useStore } from '../store.js';

export default function TopBar() {
  const { dispatch } = useStore();
  const [title, setTitle] = useState('New Chat');
  const [model, setModel] = useState('Agrinet');

  return (
    <div className="flex items-center justify-between p-2 border-b">
      <input
        className="text-lg font-semibold flex-1 mr-2 bg-transparent"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <select value={model} onChange={(e) => setModel(e.target.value)} className="border rounded p-1">
        <option>Agrinet</option>
        <option>Agrinet-2</option>
        <option>Agrinet-3</option>
      </select>
      <button className="ml-2 p-2" onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}>
        ☰
      </button>
    </div>
  );
}

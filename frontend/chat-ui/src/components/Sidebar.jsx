import React, { useState } from 'react';
import { useStore } from '../store.js';

export default function Sidebar() {
  const { dispatch } = useStore();
  const [conversations] = useState([]); // placeholder

  return (
    <div className="w-60 border-r p-2 flex flex-col">
      <button
        className="mb-2 p-2 border rounded"
        onClick={() => dispatch({ type: 'SET_MESSAGES', messages: [] })}
      >
        New Chat
      </button>
      <div className="flex-1 overflow-y-auto">
        {conversations.map((c) => (
          <div key={c.id} className="p-2 border-b">
            {c.title}
          </div>
        ))}
      </div>
      <button
        className="mt-2 p-2 border rounded"
        onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
      >
        Close
      </button>
    </div>
  );
}

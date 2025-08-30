import React, { useEffect, useRef } from 'react';
import { useStore } from '../store';
import MessageBubble from './MessageBubble.jsx';

export default function ChatWindow() {
  const { state, dispatch } = useStore();
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  useEffect(() => {
    if (!state.currentConversation) return;
    const events = new EventSource(`/stream/${state.currentConversation.id}`);
    events.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'token') {
          dispatch({ type: 'APPEND_MESSAGE_CONTENT', id: data.id, content: data.token });
        } else if (data.type === 'message') {
          dispatch({ type: 'UPSERT_MESSAGE', message: data.message });
        }
      } catch (err) {
        console.error(err);
      }
    };
    return () => events.close();
  }, [state.currentConversation, dispatch]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {state.messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

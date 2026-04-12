'use client';

export function Modal({ id, maxWidth = '540px', onClose, children }) {
  return (
    <div
      className="overlay"
      onClick={e => { if (e.target === e.currentTarget && onClose) onClose(); }}
    >
      <div className="modal" style={{ maxWidth }}>
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ title, onClose }) {
  return (
    <div className="modal-hdr">
      <div className="modal-title">{title}</div>
      <button className="close-btn" onClick={onClose}>×</button>
    </div>
  );
}

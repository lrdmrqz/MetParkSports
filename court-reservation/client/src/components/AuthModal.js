const AuthModal = ({ title, subtitle, onClose, children }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-modal" onClick={(e) => e.stopPropagation()}>
        {onClose && (
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        )}
        <h2 className="modal-title">{title}</h2>
        {subtitle && <p className="modal-sub">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
};

export default AuthModal;

const Card = ({ title, children, className = '' }) => {
  return (
    <div className={`bg-white rounded-2xl shadow-card border border-slate-200/80 p-6 mb-6 ${className}`}>
      {title && (
        <div className="mb-4 pb-4 border-b border-slate-100">
          <h3 className="text-lg font-bold font-display text-slate-900">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;

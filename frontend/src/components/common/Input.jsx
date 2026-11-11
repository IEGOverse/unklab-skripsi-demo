const Input = ({ label, type = 'text', value, onChange, placeholder, required, className = '' }) => {
  return (
    <div className={`mb-4 ${className}`}>
      {label && <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">{label}</label>}
      <input
        type={type}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 outline-none transition-all"
      />
    </div>
  );
};

export default Input;

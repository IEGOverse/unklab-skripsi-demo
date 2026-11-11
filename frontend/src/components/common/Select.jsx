const Select = ({ label, value, onChange, options, required, className = '' }) => {
  return (
    <div className={`mb-4 ${className}`}>
      {label && <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">{label}</label>}
      <select
        value={value || ''}
        onChange={onChange}
        required={required}
        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 outline-none transition-all cursor-pointer"
      >
        <option value="">-- Pilih --</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
};

export default Select;

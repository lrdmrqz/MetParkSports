const FormField = ({ label, error, ok, hint, children }) => (
  <div className="field">
    <label>{label}</label>
    {children}
    {error ? (
      <div className="field-msg bad">{error}</div>
    ) : ok ? (
      <div className="field-msg good">{ok}</div>
    ) : hint ? (
      <div className="field-msg">{hint}</div>
    ) : null}
  </div>
);

export default FormField;

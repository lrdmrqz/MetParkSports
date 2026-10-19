import { passwordRules } from "../tools/validators";

const PasswordChecklist = ({ password }) => (
  <ul className="checklist">
    {passwordRules(password).map((rule) => (
      <li key={rule.label} className={rule.ok ? "ok" : ""}>
        <span>{rule.ok ? "✓" : "○"}</span> {rule.label}
      </li>
    ))}
  </ul>
);

export default PasswordChecklist;

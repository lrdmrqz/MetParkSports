import { useRef } from "react";

const PinInput = ({ value, onChange }) => {
  const refs = useRef([]);
  const chars = Array.from({ length: 6 }, (_, i) => value[i] || "");

  const handleChange = (i, e) => {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...chars];
    next[i] = digit;
    onChange(next.join(""));
    if (digit && i < 5) refs.current[i + 1].focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !chars[i] && i > 0) {
      const next = [...chars];
      next[i - 1] = "";
      onChange(next.join(""));
      refs.current[i - 1].focus();
    }
  };

  const handlePaste = (e) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (digits) {
      e.preventDefault();
      onChange(digits);
      refs.current[Math.min(digits.length, 5)].focus();
    }
  };

  return (
    <div className="pin-row">
      {chars.map((char, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          className="pin-box"
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={char}
          aria-label={`PIN digit ${i + 1}`}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
        />
      ))}
    </div>
  );
};

export default PinInput;

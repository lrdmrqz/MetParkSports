import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { message } from "antd";
import AuthModal from "./AuthModal";
import FormField from "./FormField";
import PasswordChecklist from "./PasswordChecklist";
import { useAuth } from "../auth/AuthContext";
import { getErrorMessage, securityQuestions } from "../tools/helpers";
import { isPasswordValid, isPhone, useEmailCheck } from "../tools/validators";
import { EyeTwoTone, EyeInvisibleOutlined } from "@ant-design/icons";

const RegisterModal = ({ onClose }) => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    securityQuestion: securityQuestions[0],
    securityAnswer: "",
  });
  const [touched, setTouched] = useState({}); 
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const emailState = useEmailCheck(form.email); 

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });
  const handleBlur = (e) => setTouched({ ...touched, [e.target.name]: true });

  const errors = {
    name: form.name.trim().length < 2 ? "Enter your full name" : "",
    email: !form.email
      ? "Email is required"
      : emailState === "invalid"
        ? "Enter a valid email address"
        : emailState === "taken"
          ? "This email is already registered"
          : "",
    phone: !isPhone(form.phone) ? "Use a mobile number like 09171234567" : "",
    password: isPasswordValid(form.password)
      ? ""
      : "The password must follow all the rules below",
    confirm: form.confirm !== form.password ? "Passwords do not match" : "",
    securityAnswer: form.securityAnswer.trim() ? "" : "Enter your answer",
  };
  const valid =
    Object.values(errors).every((e) => !e) && emailState === "available";

  const show = (field) => (touched[field] || form[field] ? errors[field] : "");

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    try {
      const { confirm, ...data } = form;
      await register(data);
      message.success("Account created!");
      navigate("/my-reservations");
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthModal
      title="Create Your Account"
      subtitle="Join MetParkSports and start booking now."
      onClose={onClose}
    >
      <form autoComplete="off" onSubmit={handleRegister} noValidate>
        <FormField label="Full name" error={show("name")}>
          <input
            name="name"
            placeholder="Enter your full name"
            value={form.name}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </FormField>
        <FormField
          label="Email address"
          error={show("email")}
          ok={emailState === "available" ? "Email is available" : ""}
          hint={emailState === "checking" ? "Checking..." : ""}
        >
          <input
            name="email"
            type="email"
            autoComplete="off"
            placeholder="Enter your email address"
            value={form.email}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </FormField>
        
        <FormField label="Phone (optional)" error={show("phone")}>
          <div className="phone-input-wrapper">
            <span className="phone-prefix">+63</span>
            <input
              name="phone"
              type="tel"
              autoComplete="off"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              placeholder="9171234567"
              value={form.phone}
              onChange={(e) => {
                const numbersOnly = e.target.value.replace(/\D/g, "");
                setForm({ ...form, phone: numbersOnly });
              }}
              onBlur={handleBlur}
            />
          </div>
        </FormField>
        
        <FormField
          label="Password"
          error={touched.password ? errors.password : ""}
        >
          <div className="password-input-wrapper">
            <input
              name="password"
              autoComplete="new-password"
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 characters, with special character"
              value={form.password}
              onChange={handleChange}
              onBlur={handleBlur}
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeTwoTone twoToneColor="#1769F5" />
              ) : (
                <EyeInvisibleOutlined />
              )}
            </button>
          </div>
        </FormField>
        <PasswordChecklist password={form.password} />
        <FormField label="Confirm password" error={show("confirm")}>
          <div className="password-input-wrapper">
            <input
              name="confirm"
              autoComplete="new-password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Re-enter your password"
              value={form.confirm}
              onChange={handleChange}
              onBlur={handleBlur}
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={
                showConfirmPassword
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
            >
              {showConfirmPassword ? (
                <EyeTwoTone twoToneColor="#1769F5" />
              ) : (
                <EyeInvisibleOutlined />
              )}
            </button>
          </div>
        </FormField>
        <FormField label="Security question (used if you forget your password)">
          <select
            name="securityQuestion"
            value={form.securityQuestion}
            onChange={handleChange}
          >
            {securityQuestions.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Your answer" error={show("securityAnswer")}>
          <input
            name="securityAnswer"
            placeholder="Your answer"
            autoComplete="off"
            value={form.securityAnswer}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </FormField>
        <button type="submit" className="glass-btn" disabled={!valid || busy}>
          Register
        </button>
      </form>

      <p className="modal-hint">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </AuthModal>
  );
};

export default RegisterModal;

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { message } from "antd";
import AuthModal from "./AuthModal";
import FormField from "./FormField";
import PinInput from "./PinInput";
import { useAuth } from "../auth/AuthContext";
import { getErrorMessage, homePath } from "../tools/helpers";
import { isPin } from "../tools/validators";
import { EyeTwoTone, EyeInvisibleOutlined } from "@ant-design/icons";

const LoginModal = ({ onClose, staff = false }) => {
  const { login, verifyPin } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ identifier: "", password: "" });
  const [pinToken, setPinToken] = useState(""); 
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const finish = (user, mustChangePin) => {
    message.success(`Welcome back, ${user.name}!`);
    navigate(mustChangePin ? "/set-pin" : homePath(user.role));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await login(form.identifier, form.password);
      if (data.pinRequired) setPinToken(data.pinToken);
      else finish(data.user, false);
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handlePin = async (e) => {
    e.preventDefault();
    if (!isPin(pin)) return message.error("Enter all 6 digits of your PIN");
    setBusy(true);
    try {
      const data = await verifyPin(pinToken, pin);
      finish(data.user, data.mustChangePin);
    } catch (error) {
      message.error(getErrorMessage(error));
      setPin("");
    } finally {
      setBusy(false);
    }
  };

  if (pinToken) {
    return (
      <AuthModal
        title="Enter your PIN"
        subtitle="Type the 6-digit PIN of your account."
        onClose={onClose}
      >
        <form onSubmit={handlePin}>
          <PinInput value={pin} onChange={setPin} />
          <button type="submit" className="glass-btn" disabled={busy}>
            Verify PIN
          </button>
        </form>
        <p className="modal-hint">
          Forgot your PIN? <b>Ask an admin to reset it.</b>
        </p>
        <p className="modal-note">
          5 wrong attempts lock your account for several minutes.
        </p>
        <p className="modal-hint">
          <a
            href="#back"
            onClick={(e) => {
              e.preventDefault();
              setPinToken("");
              setPin("");
            }}
          >
            Back
          </a>
        </p>
      </AuthModal>
    );
  }

  return (
    <AuthModal
      title={staff ? "Staff Login" : "Welcome Back"}
      subtitle={
        staff
          ? "Access your staff or admin dashboard."
          : "Log in to your account."
      }
      onClose={onClose}
    >
      <form onSubmit={handleLogin} autoComplete="off">
        <FormField label="Email or username">
          <input
            name="identifier"
            autoComplete="off"
            readOnly
            onFocus={(e) => e.target.removeAttribute("readonly")}
            placeholder="Enter your email or username"
            value={form.identifier}
            onChange={handleChange}
            required
          />
        </FormField>

        <FormField label="Password">
          <div className="password-input-wrapper">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              readOnly
              onFocus={(e) => e.target.removeAttribute("readonly")}
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              required
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeTwoTone twoToneColor="#1769F5" />
              ) : (
                <EyeInvisibleOutlined />
              )}
            </button>
          </div>
        </FormField>
    
        <div className="modal-row">
          <label className="remember">
            <input type="checkbox" /> Remember me
          </label>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        <button type="submit" className="glass-btn" disabled={busy}>
          {staff ? "Continue" : "Login"}
        </button>
      </form>

      {!staff && (
        <p className="modal-hint">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      )}
    </AuthModal>
  );
};

export default LoginModal;

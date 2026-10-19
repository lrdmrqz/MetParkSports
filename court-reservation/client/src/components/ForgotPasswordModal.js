import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { message } from "antd";
import AuthModal from "./AuthModal";
import FormField from "./FormField";
import PasswordChecklist from "./PasswordChecklist";
import PinInput from "./PinInput";
import api from "../api";
import { getErrorMessage } from "../tools/helpers";
import { isPasswordValid, isPin } from "../tools/validators";


const ForgotPasswordModal = ({ onClose }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState("");
  const [method, setMethod] = useState(""); 
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [pin, setPin] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleFind = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/auth/forgot-password", { identifier });
      setMethod(response.data.method);
      setQuestion(response.data.securityQuestion || "");
      setStep(2);
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const proofOk = method === "pin" ? isPin(pin) : answer.trim().length > 0;
  const canReset =
    proofOk && isPasswordValid(newPassword) && newPassword === confirm;

  const handleReset = async (e) => {
    e.preventDefault();
    if (!canReset) return;
    try {
      await api.post("/auth/reset-password", {
        identifier,
        securityAnswer: answer,
        pin,
        newPassword,
      });
      message.success("Password reset! Please log in.");
      navigate("/login");
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  return (
    <AuthModal title="Forgot password" onClose={onClose}>
      {step === 1 && (
        <form onSubmit={handleFind} autoComplete="off">
          <FormField label="Enter your email or username">
            <input
              type="text"
              name="identifier"
              autoComplete="off"
              placeholder="Email or username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </FormField>
          <button type="submit" className="glass-btn">
            Next
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleReset}>
          {method === "question" ? (
            <>
              <p className="modal-question">{question}</p>
              <FormField label="Your answer">
                <input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                />
              </FormField>
            </>
          ) : (
            <>
              <p className="modal-question">
                Enter the 6-digit PIN of your account.
              </p>
              <PinInput value={pin} onChange={setPin} />
              <p className="modal-note">
                Forgot your PIN too? Ask an admin to reset it.
              </p>
            </>
          )}

          <FormField label="New password" autoComplete="off">
            <input
              autoComplete="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </FormField>
          <PasswordChecklist password={newPassword} />

          <FormField
            label="Confirm new password" autoComplete="off"
            error={
              confirm && confirm !== newPassword ? "Passwords do not match" : ""
            }
          >
            <input
              autoComplete="new-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </FormField>

          <button type="submit" className="glass-btn" disabled={!canReset}>
            Reset password
          </button>
        </form>
      )}

      <p className="modal-hint">
        <Link to="/login">Back to login</Link>
      </p>
    </AuthModal>
  );
};

export default ForgotPasswordModal;

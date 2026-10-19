import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import AuthModal from "./AuthModal";
import PinInput from "./PinInput";
import api from "../api";
import { useAuth } from "../auth/AuthContext";
import { getErrorMessage, homePath } from "../tools/helpers";
import { isPin } from "../tools/validators";

const SetPinModal = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isPin(pin)) return message.error("The PIN must be exactly 6 digits");
    if (pin !== confirm) return message.error("The two PINs do not match");
    try {
      await api.put("/auth/change-pin", { newPin: pin });
      updateUser({ mustChangePin: false });
      message.success("Your new PIN is saved");
      navigate(homePath(user.role));
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  return (
    <AuthModal title="Choose your PIN" subtitle="Your PIN was set by an admin. Choose a new 6-digit PIN that only you know.">
      <form onSubmit={handleSave}>
        <label className="pin-label">New PIN</label>
        <PinInput value={pin} onChange={setPin} />
        <label className="pin-label">Confirm new PIN</label>
        <PinInput value={confirm} onChange={setConfirm} />
        <button type="submit" className="glass-btn">Save PIN</button>
      </form>
    </AuthModal>
  );
};

export default SetPinModal;

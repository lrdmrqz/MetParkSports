import { useState, useEffect } from "react";
import { message } from "antd";
import api from "../api";
import { useAuth } from "../auth/AuthContext";
import FormField from "../components/FormField";
import PasswordChecklist from "../components/PasswordChecklist";
import PinInput from "../components/PinInput";
import { getErrorMessage, securityQuestions } from "../tools/helpers";
import { isPasswordValid, isPhone, isPin } from "../tools/validators";

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [account, setAccount] = useState(null);
  const [profile, setProfile] = useState({ name: "", phone: "", securityQuestion: securityQuestions[0], securityAnswer: "" });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pins, setPins] = useState({ currentPin: "", newPin: "" });

  useEffect(() => {
    api
      .get("/auth/me")
      .then((response) => {
        const data = response.data;
        setAccount(data);
        setProfile({
          name: data.name,
          phone: data.phone || "",
          securityQuestion: data.securityQuestion || securityQuestions[0],
          securityAnswer: "",
        });
      })
      .catch((error) => message.error(getErrorMessage(error)));
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put("/auth/profile", profile);
      setAccount(response.data);
      updateUser({ name: response.data.name });
      setProfile({ ...profile, securityAnswer: "" });
      message.success("Profile updated");
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    try {
      await api.put("/auth/change-password", {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      message.success("Password changed");
      setPasswords({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const savePin = async (e) => {
    e.preventDefault();
    try {
      await api.put("/auth/change-pin", pins);
      message.success("PIN changed");
      setPins({ currentPin: "", newPin: "" });
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  if (!account) return <div className="page-pad"><p>Loading...</p></div>;

  const isCustomer = user.role === "user";
  const passwordOk = isPasswordValid(passwords.newPassword) && passwords.newPassword === passwords.confirm && passwords.currentPassword;

  return (
    <div className="page-pad narrow">
      <h1 className="page-title">My Profile</h1>

      <div className="panel">
        <h3>Account information</h3>
        <div className="kv"><span>Email</span><b>{account.email}</b></div>
        {account.username && <div className="kv"><span>Username</span><b>{account.username}</b></div>}
        <div className="kv"><span>Role</span><b>{account.role === "user" ? "Customer" : account.role === "staff" ? "Staff" : "Admin"}</b></div>
        <div className="kv"><span>Member since</span><b>{new Date(account.createdAt).toLocaleDateString()}</b></div>
      </div>

      <form className="panel" onSubmit={saveProfile}>
        <h3>Edit profile</h3>
        <FormField label="Full name" error={profile.name.trim().length < 2 ? "Enter your full name" : ""}>
          <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
        </FormField>
        <FormField label="Phone" error={!isPhone(profile.phone) ? "Use a mobile number like 09171234567" : ""}>
          <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
        </FormField>
        {isCustomer && (
          <>
            <FormField label="Security question">
              <select value={profile.securityQuestion} onChange={(e) => setProfile({ ...profile, securityQuestion: e.target.value })}>
                {securityQuestions.map((q) => <option key={q} value={q}>{q}</option>)}
              </select>
            </FormField>
            <FormField label="New answer (leave blank to keep your current answer)">
              <input value={profile.securityAnswer} onChange={(e) => setProfile({ ...profile, securityAnswer: e.target.value })} />
            </FormField>
          </>
        )}
        <button className="btn-blue" disabled={profile.name.trim().length < 2 || !isPhone(profile.phone)}>Save changes</button>
      </form>

      <form className="panel" onSubmit={savePassword}>
        <h3>Change password</h3>
        <FormField label="Current password">
          <input type="password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} />
        </FormField>
        <FormField label="New password">
          <input type="password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} />
        </FormField>
        <PasswordChecklist password={passwords.newPassword} />
        <FormField label="Confirm new password" error={passwords.confirm && passwords.confirm !== passwords.newPassword ? "Passwords do not match" : ""}>
          <input type="password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} />
        </FormField>
        <button className="btn-blue" disabled={!passwordOk}>Change password</button>
      </form>

      {!isCustomer && (
        <form className="panel" onSubmit={savePin}>
          <h3>Change PIN</h3>
          <label className="label">Current PIN</label>
          <PinInput value={pins.currentPin} onChange={(v) => setPins({ ...pins, currentPin: v })} />
          <label className="label">New PIN</label>
          <PinInput value={pins.newPin} onChange={(v) => setPins({ ...pins, newPin: v })} />
          <button className="btn-blue" disabled={!isPin(pins.currentPin) || !isPin(pins.newPin)} style={{ marginTop: 16 }}>Change PIN</button>
        </form>
      )}
    </div>
  );
};

export default Profile;

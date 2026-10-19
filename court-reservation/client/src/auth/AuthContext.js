import { createContext, useContext, useState } from "react";
import api from "../api";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const saveSession = (data) => {
    sessionStorage.setItem("token", data.token);
    sessionStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
  };

  const login = async (identifier, password) => {
    const response = await api.post("/auth/login", { identifier, password });
    if (!response.data.pinRequired) saveSession(response.data);
    return response.data;
  };

  const verifyPin = async (pinToken, pin) => {
    const response = await api.post("/auth/verify-pin", { pinToken, pin });
    saveSession({
      token: response.data.token,
      user: { ...response.data.user, mustChangePin: response.data.mustChangePin },
    });
    return response.data;
  };

  const register = async (form) => {
    const response = await api.post("/auth/register", form);
    saveSession(response.data);
    return response.data.user;
  };

  const updateUser = (changes) => {
    const updated = { ...user, ...changes };
    sessionStorage.setItem("user", JSON.stringify(updated));
    setUser(updated);
  };

  const logout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, verifyPin, register, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

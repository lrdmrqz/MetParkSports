import { useState, useEffect } from "react";
import api from "../api";

export const passwordRules = (password = "") => [
  { label: "At least 8 characters", ok: password.length >= 8 },
  { label: "1 uppercase letter", ok: /[A-Z]/.test(password) },
  { label: "1 lowercase letter", ok: /[a-z]/.test(password) },
  { label: "1 number", ok: /\d/.test(password) },
  { label: "1 special character (!@#$%^&*)", ok: /[^A-Za-z0-9]/.test(password) },
];

export const isPasswordValid = (password) => passwordRules(password).every((rule) => rule.ok);

export const isEmail = (email = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// mobile
export const isPhone = (phone = "") =>
  !phone || /^(09\d{9}|9\d{9})$/.test(String(phone).trim());

export const isPin = (pin = "") => /^\d{6}$/.test(pin);

// Payment reference
export const isReference = (ref = "") => /^[A-Za-z0-9-]{6,30}$/.test(ref);

//check if email is taken
export const useEmailCheck = (email) => {
  const [state, setState] = useState("idle");

  useEffect(() => {
    if (!email) {
      setState("idle");
      return;
    }
    if (!isEmail(email)) {
      setState("invalid");
      return;
    }
    setState("checking");
    const timer = setTimeout(() => {
      api
        .get("/auth/check-email", { params: { email } })
        .then((response) => setState(response.data.available ? "available" : "taken"))
        .catch(() => setState("idle"));
    }, 500);
    return () => clearTimeout(timer);
  }, [email]);

  return state;
};

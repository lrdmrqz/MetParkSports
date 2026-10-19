import { useState, useEffect } from "react";
import api from "../api";

const useRules = () => {
  const [rules, setRules] = useState({
    advanceBookingDays: 2,
    doorChargePerHead: 50,
    openTime: "07:00",
    closeTime: "24:00",
    downpaymentPercent: 50,
    unpaidExpiryHours: 12,
    refundDaysBefore: 3,
    paymentMethods: ["GCash", "Maya", "Bank transfer"],
  });

  useEffect(() => {
    api
      .get("/rules")
      .then((response) => setRules(response.data))
      .catch(() => {}); 
  }, []);

  return rules;
};

export default useRules;

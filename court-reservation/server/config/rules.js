module.exports = {
  advanceBookingDays: 1, 
  doorChargePerHead: 50,
  openTime: "07:00", 
  closeTime: "24:00", 

  downpaymentPercent: 50, 
  unpaidExpiryHours: 12, 
  refundDaysBefore: 3, 

  pinMaxAttempts: 5, 
  pinLockMinutes: [1, 5, 15, 30],

  paymentMethods: ["GCash", "Maya", "Bank transfer"],
};

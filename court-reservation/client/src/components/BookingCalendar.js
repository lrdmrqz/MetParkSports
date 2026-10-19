import { useState, useEffect } from "react";
import api from "../api";

const pad = (n) => String(n).padStart(2, "0");
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const BookingCalendar = ({ courtId, value, onChange, minDate }) => {
  const [month, setMonth] = useState((value || minDate).slice(0, 7)); 
  const [info, setInfo] = useState({ totalHours: 17, booked: {} });

  useEffect(() => {
    if (!courtId) return;
    api
      .get(`/reservations/calendar/${courtId}`, { params: { month } })
      .then((response) => setInfo(response.data))
      .catch(() => {});
  }, [courtId, month]);

  const [year, monthNumber] = month.split("-").map(Number);
  const firstWeekday = new Date(year, monthNumber - 1, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, monthNumber, 0).getDate();

  const moveMonth = (step) => {
    const d = new Date(year, monthNumber - 1 + step, 1);
    setMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  };

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(<span key={`blank-${i}`} />);
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${month}-${pad(day)}`;
    const booked = info.booked[date] || 0;
    let state = "free";
    if (date < minDate) state = "off";
    else if (booked >= info.totalHours) state = "full";
    else if (booked > 0) state = "part";

    cells.push(
      <button
        type="button"
        key={date}
        className={`cal-day ${state} ${date === value ? "selected" : ""}`}
        disabled={state === "off" || state === "full"}
        onClick={() => onChange(date)}
        title={state === "full" ? "Fully booked" : state === "part" ? "Partly booked" : state === "free" ? "Vacant" : "Not available"}
      >
        {day}
      </button>
    );
  }

  return (
    <div className="calendar">
      <div className="cal-head">
        <button type="button" onClick={() => moveMonth(-1)} disabled={month <= minDate.slice(0, 7)} aria-label="Previous month">‹</button>
        <b>{monthNames[monthNumber - 1]} {year}</b>
        <button type="button" onClick={() => moveMonth(1)} aria-label="Next month">›</button>
      </div>
      <div className="cal-grid cal-weekdays">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="cal-grid">{cells}</div>
      <div className="cal-legend">
        <span><i className="free" /> Vacant</span>
        <span><i className="part" /> Partly booked</span>
        <span><i className="full" /> Fully booked</span>
        <span><i className="selected" /> Selected</span>
      </div>
    </div>
  );
};

export default BookingCalendar;

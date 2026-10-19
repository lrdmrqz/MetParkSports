import { hourLabel } from "../tools/helpers";

const toMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const HourPicker = ({ openTime, closeTime, booked, value, onChange }) => {
  const firstHour = toMinutes(openTime) / 60;
  const lastHour = toMinutes(closeTime) / 60; 

  const isReserved = (h) =>
    booked.some((slot) => toMinutes(slot.startTime) < (h + 1) * 60 && toMinutes(slot.endTime) > h * 60);

  const pick = (h) => {
    if (value && h === value.end) onChange({ start: value.start, end: h + 1 }); 
    else onChange({ start: h, end: h + 1 });
  };

  const buttons = [];
  for (let h = firstHour; h < lastHour; h++) {
    const reserved = isReserved(h);
    const selected = value && h >= value.start && h < value.end;
    buttons.push(
      <button
        type="button"
        key={h}
        disabled={reserved}
        className={`hour ${reserved ? "reserved" : selected ? "selected" : "vacant"}`}
        onClick={() => pick(h)}
      >
        {hourLabel(h)}
        <small>{reserved ? "Reserved" : selected ? "Selected" : "Vacant"}</small>
      </button>
    );
  }

  return <div className="hour-grid">{buttons}</div>;
};

export default HourPicker;

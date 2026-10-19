import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { message } from "antd";
import api from "../api";
import useRules from "../tools/useRules";
import BookingCalendar from "../components/BookingCalendar";
import HourPicker from "../components/HourPicker";
import FormField from "../components/FormField";
import { addDaysString, formatDate, formatPeso, getErrorMessage, hourLabel } from "../tools/helpers";
import { isReference } from "../tools/validators";

const pad = (n) => String(n).padStart(2, "0");
const steps = ["Court", "Equipment", "Price Summary", "Payment"];

const Book = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rules = useRules();
  const minDate = addDaysString(rules.advanceBookingDays);

  const [step, setStep] = useState(1);
  const [courts, setCourts] = useState([]);
  const [equipment, setEquipment] = useState([]);

  const [sport, setSport] = useState("");
  const [courtId, setCourtId] = useState("");
  const [date, setDate] = useState("");
  const [booked, setBooked] = useState([]); 
  const [hours, setHours] = useState(null); 
  const [players, setPlayers] = useState(1);
  
  const [equipmentId, setEquipmentId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState([]); 
  
  const [option, setOption] = useState("downpayment");
  const [notes, setNotes] = useState("");
  
  const [method, setMethod] = useState("GCash");
  const [reference, setReference] = useState("");
  const [referenceTouched, setReferenceTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  
  const [done, setDone] = useState(null);

  
  useEffect(() => {
    Promise.all([api.get("/courts"), api.get("/equipment")])
      .then(([courtsResponse, equipmentResponse]) => {
        const list = courtsResponse.data;
        setCourts(list);
        setEquipment(equipmentResponse.data.filter((e) => e.status === "available" && e.stock > 0 && !e.name.toLowerCase().includes("shoes")));
        const wanted = list.find((c) => c._id === searchParams.get("courtId"));
        const first = wanted || list.find((c) => c.status === "available");
        if (first) {
          setSport(first.sport);
          setCourtId(first._id);
        }
      })
      .catch((error) => message.error(getErrorMessage(error)));
  }, [searchParams]);

  const court = courts.find((c) => c._id === courtId);
  const sportList = [...new Set(courts.map((c) => c.sport))];
  const courtsOfSport = courts.filter((c) => c.sport === sport && c.status === "available");
  const equipmentOfSport = equipment.filter((e) => e.sport === sport || e.sport === "All");

  
  useEffect(() => {
    if (!courtId || !date) return setBooked([]);
    api
      .get(`/reservations/availability/${courtId}`, { params: { date } })
      .then((response) => setBooked(response.data))
      .catch((error) => message.error(getErrorMessage(error)));
  }, [courtId, date]);

  const changeSport = (e) => {
    const newSport = e.target.value;
    const first = courts.find((c) => c.sport === newSport && c.status === "available");
    setSport(newSport);
    setCourtId(first ? first._id : "");
    setHours(null);
    setAdded([]);
    setEquipmentId("");
  };

  const changeCourt = (e) => {
    setCourtId(e.target.value);
    setHours(null);
  };


  const hoursCount = hours ? hours.end - hours.start : 0;
  const courtFee = court ? hoursCount * court.hourlyRate : 0;
  const lines = added.map((a) => ({ ...a, fee: a.equipment.pricePerHour * hoursCount * a.quantity }));
  const equipmentFee = lines.reduce((sum, l) => sum + l.fee, 0);
  const doorCharge = (parseInt(players) || 0) * rules.doorChargePerHead;
  const total = courtFee + equipmentFee + doorCharge;
  const payNow = option === "full" ? total : Math.ceil((total * rules.downpaymentPercent) / 100);

  const addEquipment = () => {
    const item = equipment.find((e) => e._id === equipmentId);
    const qty = parseInt(quantity);
    if (!item || !qty || qty < 1) return message.error("Choose the equipment and the quantity");
    if (qty > item.stock) return message.error(`We only have ${item.stock} ${item.name}`);
    const existing = added.find((a) => a.equipment._id === item._id);
    if (existing) {
      setAdded(added.map((a) => (a.equipment._id === item._id ? { ...a, quantity: Math.min(a.quantity + qty, item.stock) } : a)));
    } else {
      setAdded([...added, { equipment: item, quantity: qty }]);
    }
    setEquipmentId("");
    setQuantity(1);
  };

  const step1Ok = court && date && hours && parseInt(players) >= 1;
  const counter = method === "Pay at the counter";
  const referenceError = !counter && !isReference(reference) ? "Use 6-30 letters, numbers or dashes" : "";

  const submit = async () => {
    setBusy(true);
    try {
      const response = await api.post("/reservations", {
        courtId,
        date,
        startTime: `${pad(hours.start)}:00`,
        endTime: `${pad(hours.end)}:00`,
        players,
        notes,
        equipment: added.map((a) => ({ equipmentId: a.equipment._id, quantity: a.quantity })),
        paymentOption: option,
        paymentMethod: method,
        paymentReference: reference,
      });
      setDone(response.data);
      setStep(5);
      window.scrollTo({ top: 0 });
    } catch (error) {
      message.error(getErrorMessage(error));
      
      if (error.response?.status === 409) setStep(1);
    } finally {
      setBusy(false);
    }
  };

  if (courts.length === 0) return <div className="page-pad"><p>Loading...</p></div>;

  if (step === 5 && done) {
    return (
      <div className="page-pad">
        <div className="done-card">
          <div className="done-check">✓</div>
          <h1>Reservation submitted</h1>
          <span className="pill" style={{ background: counter ? "#FDE9E7" : "#FFF1D6", color: counter ? "#9B2A1B" : "#8A4B00" }}>
            {counter ? "Awaiting payment" : "Pending verification"}
          </span>
          <p className="muted">
            {counter
              ? `Please pay at the counter within ${rules.unpaidExpiryHours} hours, or the slot is released.`
              : "Staff will verify your payment shortly. You can follow the status in My Reservations."}
          </p>

          <div className="tracker">
            {["Submitted", "Verification", "Confirmed", "Completed"].map((label, i) => (
              <div key={label} className={i === 0 ? "done" : i === 1 ? "now" : ""}><span>{i === 0 ? "✓" : ""}</span>{label}</div>
            ))}
          </div>

          <div className="kv"><span>Reservation no.</span><b>{done.refNo}</b></div>
          <div className="kv"><span>Court</span><b>{done.court.name}</b></div>
          <div className="kv"><span>Date</span><b>{formatDate(done.date)}</b></div>
          <div className="kv"><span>Time</span><b>{hourLabel(hours.start)} - {hourLabel(hours.end)}</b></div>
          <div className="kv"><span>People</span><b>{done.players}</b></div>
          {done.equipment.length > 0 && (
            <div className="kv"><span>Equipment</span><b>{done.equipment.map((e) => `${e.name} × ${e.quantity}`).join(", ")}</b></div>
          )}

          <div className="sum-box">
            <div className="kv"><span>Total</span><b>{formatPeso(done.totalPrice)}</b></div>
            <div className="kv"><span>To pay now ({done.paymentOption === "full" ? "full payment" : `${rules.downpaymentPercent}% downpayment`})</span><b>{formatPeso(done.paymentDeclared)}</b></div>
            <div className="kv"><span>Balance, paid at the venue on your game day</span><b>{formatPeso(done.totalPrice - done.paymentDeclared)}</b></div>
          </div>

          <p className="info-box">
            Cancel at least {rules.refundDaysBefore} days before your game to get your payment back.
            Reservations without a payment are released after {rules.unpaidExpiryHours} hours.
          </p>

          <div className="center-buttons">
            <button className="btn-blue" onClick={() => navigate("/my-reservations")}>Go to My Reservations</button>
            <button className="btn-line" onClick={() => window.location.assign("/book")}>Book another court</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-pad">
      <h1 className="page-title">Book a Court</h1>

      {/* Steps */}
      <div className="stepper">
        {steps.map((label, i) => (
          <div key={label} className={`step ${i + 1 < step ? "done" : i + 1 === step ? "now" : ""}`}>
            <span>{i + 1 < step ? "✓" : i + 1}</span>{label}
          </div>
        ))}
      </div>

      {/* ---------- Step 1: court, day, hours ---------- */}
      {step === 1 && (
        <div className="two-col">
          <div className="panel">
            <div className="row2">
              <FormField label="Type of court">
                <select value={sport} onChange={changeSport}>
                  {sportList.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormField>
              <FormField label="Court">
                <select value={courtId} onChange={changeCourt}>
                  {courtsOfSport.length === 0 && <option value="">No court available</option>}
                  {courtsOfSport.map((c) => <option key={c._id} value={c._id}>{c.name} ({formatPeso(c.hourlyRate)}/hr)</option>)}
                </select>
              </FormField>
            </div>

            <label className="label">Date (at least {rules.advanceBookingDays} days from today)</label>
            <BookingCalendar courtId={courtId} value={date} minDate={minDate} onChange={(d) => { setDate(d); setHours(null); }} />
          </div>

          <div className="panel">
            <b>Time slot</b>
            {!date || !court ? (
              <p className="muted">{court ? "Choose a date on the calendar first." : "Choose a court that is available first."}</p>
            ) : (
              <>
                <p className="muted">{formatDate(date)}. Click an hour, then click the next hour to book longer.</p>
                <HourPicker openTime={court.openTime} closeTime={court.closeTime} booked={booked} value={hours} onChange={setHours} />
              </>
            )}

            <FormField
              label="Number of people (players + non-players)"
              error={parseInt(players) >= 1 && parseInt(players) <= 100 ? "" : "Enter a number from 1 to 100"}
            >
              <input type="number" min="1" max="100" value={players} onChange={(e) => setPlayers(e.target.value)} />
            </FormField>
          </div>
        </div>
      )}

      {/* ---------- Step 2: equipment ---------- */}
      {step === 2 && (
        <div className="two-col">
          <div className="panel">
            <h3>Add equipment</h3>
            <p className="muted">Optional. Rent what you need for your game.</p>
            <div className="eq-row">
              <FormField label="Equipment">
                <select value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>
                  <option value="">Select equipment</option>
                  {equipmentOfSport.map((e) => (
                    <option key={e._id} value={e._id}>{e.name} - {formatPeso(e.pricePerHour)}/hr</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Quantity">
                <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </FormField>
              <button className="btn-blue" onClick={addEquipment}>Add</button>
            </div>

            <b className="block">Added equipment</b>
            {added.length === 0 && <p className="muted">Nothing added yet.</p>}
            {lines.map((l) => (
              <div className="line" key={l.equipment._id}>
                <span>{l.equipment.name} × {l.quantity} ({hoursCount} hr)</span>
                <span>
                  <b>{formatPeso(l.fee)}</b>
                  <button className="link-red" onClick={() => setAdded(added.filter((a) => a.equipment._id !== l.equipment._id))}>Remove</button>
                </span>
              </div>
            ))}
          </div>
          <SummaryCard court={court} date={date} hours={hours} players={players} courtFee={courtFee} equipmentFee={equipmentFee} doorCharge={doorCharge} total={total} rules={rules} />
        </div>
      )}

      {/* ---------- Step 3: price summary ---------- */}
      {step === 3 && (
        <div className="two-col">
          <div className="panel">
            <h3>Price summary</h3>
            <div className="kv"><span>{court.name} ({hoursCount} hr × {formatPeso(court.hourlyRate)})</span><b>{formatPeso(courtFee)}</b></div>
            {lines.map((l) => (
              <div className="kv" key={l.equipment._id}><span>{l.equipment.name} × {l.quantity}</span><b>{formatPeso(l.fee)}</b></div>
            ))}
            <div className="kv"><span>Door charge ({parseInt(players) || 0} × {formatPeso(rules.doorChargePerHead)})</span><b>{formatPeso(doorCharge)}</b></div>
            <div className="kv total"><span>Total</span><b>{formatPeso(total)}</b></div>

            <FormField label="How much do you want to pay now?">
              <select value={option} onChange={(e) => setOption(e.target.value)}>
                <option value="downpayment">{rules.downpaymentPercent}% downpayment - {formatPeso(Math.ceil((total * rules.downpaymentPercent) / 100))}</option>
                <option value="full">Pay in full - {formatPeso(total)}</option>
              </select>
            </FormField>
            <FormField label="Notes (optional)">
              <textarea rows="2" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </FormField>
            <p className="info-box">
              You are required to pay at least {rules.downpaymentPercent}% of the total amount.
              The balance is paid at the venue on your game day.
            </p>
          </div>
          <SummaryCard court={court} date={date} hours={hours} players={players} courtFee={courtFee} equipmentFee={equipmentFee} doorCharge={doorCharge} total={total} rules={rules} />
        </div>
      )}

      {/* ---------- Step 4: payment ---------- */}
      {step === 4 && (
        <div className="two-col">
          <div className="panel">
            <h3>Payment</h3>
            <div className="pay-now">Amount to pay now <b>{formatPeso(payNow)}</b></div>

            <FormField label="Payment method">
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                {rules.paymentMethods.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </FormField>

            {counter ? (
              <p className="info-box warn">
                Pay at the counter within {rules.unpaidExpiryHours} hours. If there is no payment by then, the reservation is released.
              </p>
            ) : (
              <FormField
                label="Reference number"
                error={referenceTouched ? referenceError : ""}
                ok={reference && !referenceError ? "Valid reference number" : ""}
                hint="Send the payment first, then type the reference number of your receipt."
              >
                <input
                  value={reference}
                  placeholder="Enter reference number"
                  onChange={(e) => setReference(e.target.value)}
                  onBlur={() => setReferenceTouched(true)}
                />
              </FormField>
            )}
          </div>
          <SummaryCard court={court} date={date} hours={hours} players={players} courtFee={courtFee} equipmentFee={equipmentFee} doorCharge={doorCharge} total={total} rules={rules} />
        </div>
      )}

      {/* ---------- Back / Next ---------- */}
      <div className="step-buttons">
        {step > 1 ? <button className="btn-line" onClick={() => setStep(step - 1)}>Back</button> : <Link to="/courts" className="btn-line">Cancel</Link>}
        {step < 4 && (
          <button className="btn-blue" disabled={step === 1 && !step1Ok} onClick={() => setStep(step + 1)}>
            Next: {steps[step]}
          </button>
        )}
        {step === 4 && (
          <button className="btn-blue" disabled={busy || (!counter && !!referenceError)} onClick={submit}>
            {busy ? "Submitting..." : "Submit reservation"}
          </button>
        )}
      </div>
    </div>
  );
};


const SummaryCard = ({ court, date, hours, players, courtFee, equipmentFee, doorCharge, total, rules }) => (
  <div className="panel summary">
    <h3>Your reservation</h3>
    <div className="kv"><span>Court</span><b>{court ? court.name : "-"}</b></div>
    <div className="kv"><span>Date</span><b>{date ? formatDate(date) : "-"}</b></div>
    <div className="kv"><span>Time</span><b>{hours ? `${hourLabel(hours.start)} - ${hourLabel(hours.end)}` : "-"}</b></div>
    <div className="kv"><span>People</span><b>{parseInt(players) || 0}</b></div>
    <hr />
    <div className="kv"><span>Court fee</span><b>{formatPeso(courtFee)}</b></div>
    <div className="kv"><span>Equipment</span><b>{formatPeso(equipmentFee)}</b></div>
    <div className="kv"><span>Door charge ({formatPeso(rules.doorChargePerHead)} per head)</span><b>{formatPeso(doorCharge)}</b></div>
    <div className="kv total"><span>Total</span><b>{formatPeso(total)}</b></div>
  </div>
);

export default Book;

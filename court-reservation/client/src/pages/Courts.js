import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Modal, message } from "antd";
import api from "../api";
import { useAuth } from "../auth/AuthContext";
import { formatPeso, formatTime, getErrorMessage, sportColors, sports } from "../tools/helpers";

const courtImage = `${process.env.PUBLIC_URL}/images/court.jpg`;
const heroImage = `${process.env.PUBLIC_URL}/images/hero.jpg`;


const Courts = () => {
  const [searchParams] = useSearchParams();
  const [courts, setCourts] = useState([]);
  const [sport, setSport] = useState(searchParams.get("sport") || "All");
  const [details, setDetails] = useState(null); 
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/courts")
      .then((response) => setCourts(response.data))
      .catch((error) => message.error(getErrorMessage(error)));
  }, []);

  const visible = sport === "All" ? courts : courts.filter((c) => c.sport === sport);

  const bookCourt = (court) => {
    if (!user) return navigate("/login");
    if (user.role !== "user") return message.info("Only customers can book a court.");
    navigate(`/book?courtId=${court._id}`);
  };

  return (
    <div>
      <div className="banner" style={{ backgroundImage: `linear-gradient(rgba(7,22,48,0.6), rgba(7,22,48,0.85)), url(${heroImage})` }}>
        <h1>Book Your Court</h1>
        <p>Choose from our available courts and equipment.</p>
      </div>

      <div className="browse">
        {/* Filter */}
        <aside className="filter-card">
          <b>Sport</b>
          {["All", ...sports].map((s) => (
            <label key={s} className="radio">
              <input type="radio" name="sport" checked={sport === s} onChange={() => setSport(s)} /> {s}
            </label>
          ))}
        </aside>

        {/* Cards */}
        <div className="browse-grid">
          {visible.length === 0 && <p>No courts found.</p>}
          {visible.map((court) => (
            <div className="item-card" key={court._id}>
              <div
                className="item-photo"
                style={{ backgroundImage: `linear-gradient(transparent 40%, ${sportColors[court.sport] || "#12335b"}cc), url(${courtImage})` }}
              >
                <span>{court.sport}</span>
              </div>
              <div className="item-body">
                <h3>{court.name}</h3>
                <p className="item-price">{formatPeso(court.hourlyRate)} <small>/ hr</small></p>
                {court.status === "maintenance" && <p className="item-warn">Under maintenance</p>}
                <div className="item-buttons">
                  <button className="btn-blue" disabled={court.status !== "available"} onClick={() => bookCourt(court)}>
                    Book Now
                  </button>
                  <button className="btn-line" onClick={() => setDetails(court)}>View Details</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={!!details} onCancel={() => setDetails(null)} footer={null} title={details?.name}>
        {details && (
          <div className="details">
            <p><b>Sport:</b> {details.sport}</p>
            <p><b>Location:</b> {details.location}</p>
            <p><b>Hours:</b> {formatTime(details.openTime)} - {formatTime(details.closeTime)}</p>
            <p><b>Rate:</b> {formatPeso(details.hourlyRate)} per hour</p>
            {details.description && <p>{details.description}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Courts;

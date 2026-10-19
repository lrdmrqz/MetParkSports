import { useState, useEffect } from "react";
import { message } from "antd";
import api from "../api";
import { formatPeso, getErrorMessage, sports } from "../tools/helpers";

const heroImage = `${process.env.PUBLIC_URL}/images/hero.jpg`;
const paddleImage = `${process.env.PUBLIC_URL}/images/paddle.png`;
const racketImage = `${process.env.PUBLIC_URL}/images/racket.png`;
const shuttlecockImage = `${process.env.PUBLIC_URL}/images/shuttlecock.png`;
const basketballImage = `${process.env.PUBLIC_URL}/images/basketball.png`;
const volleyballImage = `${process.env.PUBLIC_URL}/images/volleyball.png`;

const Equipment = () => {
  const [items, setItems] = useState([]);
  const [sport, setSport] = useState("All");

  useEffect(() => {
    api
      .get("/equipment")
      .then((response) => setItems(response.data))
      .catch((error) => message.error(getErrorMessage(error)));
  }, []);

  const equipmentItems = items.filter(
    (item) => !item.name.toLowerCase().includes("shoes"),
  );

  const visible =
    sport === "All"
      ? equipmentItems
      : equipmentItems.filter((i) => i.sport === sport || i.sport === "All");

  return (
    <div>
      <div
        className="banner"
        style={{
          backgroundImage: `linear-gradient(rgba(7,22,48,0.6), rgba(7,22,48,0.85)), url(${heroImage})`,
        }}
      >
        <h1>Equipment</h1>
        <p>
          Rent what you need for your game. You can add equipment when you book
          a court.
        </p>
      </div>

      <div className="browse">
        <aside className="filter-card">
          <b>Sport</b>
          {["All", ...sports].map((s) => (
            <label key={s} className="radio">
              <input
                type="radio"
                name="sport"
                checked={sport === s}
                onChange={() => setSport(s)}
              />{" "}
              {s}
            </label>
          ))}
        </aside>

        <div className="browse-grid">
          {visible.length === 0 && <p>No equipment found.</p>}

          {visible.map((item) => (
            <div className="item-card" key={item._id}>
              <img
                className="equipment-image"
                src={
                  item.name.toLowerCase().includes("racket")
                    ? racketImage
                    : item.name.toLowerCase().includes("shuttlecock")
                      ? shuttlecockImage
                      : item.name.toLowerCase().includes("basketball")
                        ? basketballImage
                        : item.name.toLowerCase().includes("pickleball")
                          ? paddleImage
                          : volleyballImage
                }
                alt={item.name}
              />

              <div className="item-body">
                <span className="tag">
                  {item.sport === "All" ? "All sports" : item.sport}
                </span>
                <h3>{item.name}</h3>
                <p className="item-price">
                  {formatPeso(item.pricePerHour)} <small>/ hour</small>
                </p>
                <p className="muted">{item.description}</p>
                <p className="muted">
                  {item.status === "available"
                    ? `${item.stock} in stock`
                    : "Not available"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Equipment;

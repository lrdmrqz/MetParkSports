import { useEffect } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import SiteNav from "../components/SiteNav";
import Logo from "../components/Logo";
import LoginModal from "../components/LoginModal";
import RegisterModal from "../components/RegisterModal";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import SetPinModal from "../components/SetPinModal";
import { sportColors } from "../tools/helpers";

const heroImage = `${process.env.PUBLIC_URL}/images/hero.jpg`;
const courtImage = `${process.env.PUBLIC_URL}/images/court.jpg`;

const arenas = ["Basketball", "Volleyball", "Badminton", "Pickleball"];

const features = [
  { title: "Easy Booking", text: "Quick and simple reservation process." },
  { title: "Quality Facilities", text: "Well-maintained courts and equipment." },
  { title: "Secure Payments", text: "Pay a 50% downpayment, verified by our staff." },
  { title: "Flexible Schedules", text: "Pick your hours on the calendar. Open 7:00 AM to 12:00 midnight." },
];


const Landing = ({ modal = null }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const section = document.getElementById(location.hash.slice(1));
      if (section) section.scrollIntoView({ behavior: "smooth" });
    }
  }, [location.hash]);

  
  if (modal === "setpin" && (!user || !user.mustChangePin)) return <Navigate to="/" />;

  const closeModal = () => navigate("/");

  // Visitors log in first. Customers go to the booking page.
  const handleBookNow = () => {
    if (!user) return navigate("/login");
    navigate(user.role === "user" ? "/book" : "/courts");
  };

  const heroStyle = {
    backgroundImage: `linear-gradient(rgba(7,22,48,0.55), rgba(7,22,48,0.85)), url(${heroImage})`,
  };

  return (
    <div className="landing">
      
      <header className="hero" style={heroStyle}>
        <SiteNav overlay />
        <div className="hero-copy">
          <h1>
            Play More.<br />Book Faster.<br />
            <span>MetParkSports.</span>
          </h1>
          <p>Reserve your court, rent equipment, and enjoy your favorite sports, all in one place.</p>
          <div className="hero-buttons">
            <button className="btn-blue big" onClick={handleBookNow}>Book Now</button>
            <button className="btn-outline-light big" onClick={() => document.getElementById("arena").scrollIntoView({ behavior: "smooth" })}>
              Learn More
            </button>
          </div>
        </div>
      </header>

      <section id="arena" className="section">
        <h2>Choose Your Court</h2>
        <p className="section-sub">World-class courts and facilities for every sport.</p>
        <div className="arena-grid">
          {arenas.map((sport) => (
            <Link
              key={sport}
              to={`/courts?sport=${sport}`}
              className="arena-card"
              style={{ backgroundImage: `linear-gradient(transparent 30%, ${sportColors[sport]}ee), url(${courtImage})` }}
            >
              <b>{sport}</b>
              <span>Book Now →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section alt">
        <h2>Why MetParkSports?</h2>
        <div className="feature-grid">
          {features.map((f) => (
            <div className="feature" key={f.title}>
              <div className="feature-icon" />
              <b>{f.title}</b>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- About ---------- */}
      <section id="about" className="section about">
        <img src={courtImage} alt="MET Park indoor court" />
        <div>
          <h2>Introducing MET Park Pasay</h2>
          <p>
            Met Park is a modern mixed-use development located in Pasay City, Metro Manila.
            Designed to bring together residential spaces, business establishments, shopping
            destinations, and leisure experiences, Met Park offers a vibrant environment where
            people can live, work, and connect. It is a 36-hectare master-planned development by
            Federal Land, Inc., located in the Bay Area of Pasay City.
          </p>
          <p>
            <b>Address:</b> Metrobank Ave., Met Park, Pasay City 1308<br />
            <b>Open:</b> 7:00 AM to 12:00 midnight
          </p>
        </div>
      </section>

      {/* ---------- Ready to play ---------- */}
      <section className="cta" style={heroStyle}>
        <h2>Ready to Play?</h2>
        <p>Your next game is just a few clicks away.</p>
        <button className="btn-blue big" onClick={handleBookNow}>Book Now</button>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="footer">
        <div className="footer-grid">
          <div>
            <Logo />
            <p className="footer-tag">Play More. Book Faster.</p>
          </div>
          <div>
            <b>Quick Links</b>
            <Link to="/">Home</Link>
            <Link to="/courts">Courts</Link>
            <Link to="/equipment">Equipment</Link>
            <Link to="/#about">About</Link>
          </div>
          <div>
            <b>Follow Us</b>
            <a href="https://metpark.ph/" target="_blank" rel="noreferrer">metpark.ph</a>
            <a href="https://www.facebook.com/metparksportscenter/" target="_blank" rel="noreferrer">Facebook</a>
            <a href="https://www.instagram.com/metparksportscenter" target="_blank" rel="noreferrer">Instagram</a>
            <Link to="/staff-login" className="staff-link">Staff login</Link>
          </div>
        </div>
        <div className="footer-note">
          © 2026 MetParkSports. All rights reserved. Student project. MET Park Sports Center is
          used only as a sample target client and is not affiliated with this project.
        </div>
      </footer>

      {/* ---------- Glass pop-ups ---------- */}
      {modal === "login" && <LoginModal onClose={closeModal} />}
      {modal === "staff" && <LoginModal onClose={closeModal} staff />}
      {modal === "register" && <RegisterModal onClose={closeModal} />}
      {modal === "forgot" && <ForgotPasswordModal onClose={closeModal} />}
      {modal === "setpin" && <SetPinModal />}
    </div>
  );
};

export default Landing;

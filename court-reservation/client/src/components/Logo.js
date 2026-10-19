const Logo = ({ dark = false }) => (
  <span className={`logo ${dark ? "logo-dark" : ""}`}>
    <span className="logo-m">M</span>etPark Sports
  </span>
);

export default Logo;

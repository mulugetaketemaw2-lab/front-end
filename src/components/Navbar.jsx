import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const Navbar = ({ user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    onLogout();
    navigate("/login");
  };

  // Get department name in Amharic
  const getDepartmentName = () => {
    const departments = {
      super_admin: "ዋና አስተዳዳሪ",
      admin: "አስተዳዳሪ",
      sebsabi: "ሰብሳቢ",
      meketel_sebsabi: "ምክትል ሰብሳቢ",
      tsehafy: "ጸሀፊ",
      timhirt: "ትምህርት ክፍል",
      abalat_guday: "አባላት ጉዳይ",
      mezmur: "መዝሙር ክፍል",
      bach: "ባች ክፍል",
      muya: "ሙያ ክፍል",
      lmat: "ልማት ክፍል",
      kwanqwa: "ቋንቋ ክፍል",
      merja: "መረጃ ክፍል",
      hisab: "ሂሳብ ክፍል",
      audit: "ኦዲት"
    };
    return departments[user?.role] || user?.department || "አባል";
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <h2>ጉባኤ ስርዓት</h2>
        <span className="user-department">{getDepartmentName()}</span>
      </div>
      
      <ul className="nav-menu">
        <li className={isActive("/dashboard") ? "active" : ""}>
          <Link to="/dashboard">ዳሽቦርድ</Link>
        </li>
        <li className={isActive("/members") ? "active" : ""}>
          <Link to="/members">አባላት</Link>
        </li>
        <li className={isActive("/attendance") ? "active" : ""}>
          <Link to="/attendance">መገኘት</Link>
        </li>
        {['super_admin', 'admin'].includes(user?.role) && (
          <li className={isActive("/settings") ? "active" : ""}>
            <Link to="/settings">ስርዓት ቅንብር</Link>
          </li>
        )}
        {user?.role === 'super_admin' && (
          <li className={isActive("/executive-management") ? "active" : ""}>
            <Link to="/executive-management">አመራር ማስተዳደሪያ</Link>
          </li>
        )}
      </ul>

      <div className="nav-user">
        <span className="user-name">{user?.name || "ተጠቃሚ"}</span>
        <button onClick={handleLogout} className="logout-btn">
          ውጣ
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
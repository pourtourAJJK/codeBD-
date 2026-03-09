import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <header className="border-b border-base-300 bg-base-100">
      <nav className="container mx-auto px-4 py-4">
        <Link to="/" className="text-xl font-semibold text-base-content">
          CloudBase + React
        </Link>
      </nav>
    </header>
  );
};

export default Navbar;

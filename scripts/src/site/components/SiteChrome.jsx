import React from "react";
import { Link, getRoutePath, useLocationPath } from "../router";
import SiteIcon from "./SiteIcon";

const toolItems = [
  { label: "Production Studio", path: "/music", icon: "studio", copy: "Channel rack, piano roll, playlist and mixer" },
  { label: "Synth Lab", path: "/synth-lab", icon: "synth", copy: "Oscillators, modulation and original patch design" },
  { label: "Factory Sounds", path: "/sounds", icon: "sounds", copy: "Original drums, 808s, loops, textures and FX" },
  { label: "Production Workflow", path: "/workflow", icon: "workflow", copy: "A guided hip-hop beat-building process" },
];

const infoItems = [
  { label: "Help Center", path: "/help", icon: "help" },
  { label: "About", path: "/about", icon: "about" },
  { label: "Contact", path: "/contact", icon: "contact" },
  { label: "Privacy", path: "/privacy", icon: "shield" },
  { label: "Terms", path: "/terms", icon: "document" },
  { label: "Copyright", path: "/copyright", icon: "copyright" },
];

function Brand({ compact = false, onNavigate }) {
  return (
    <Link to="/" className={`site-brand ${compact ? "site-brand--compact" : ""}`} onClick={onNavigate}>
      <span className="site-brand__mark" aria-hidden="true">
        <span className="site-brand__wave" />
        <span className="site-brand__wave site-brand__wave--middle" />
        <span className="site-brand__wave site-brand__wave--small" />
      </span>
      <span className="site-brand__copy">
        <strong>MusicStudioLab</strong>
        {!compact && <small>Browser production workstation</small>}
      </span>
    </Link>
  );
}

function Dropdown({ label, items, open, onToggle, onClose, active }) {
  return (
    <div className={`nav-dropdown ${open ? "is-open" : ""}`}>
      <button className={`nav-link nav-link--button ${active ? "is-active" : ""}`} onClick={onToggle} aria-expanded={open}>
        {label}
        <SiteIcon name="chevron" size={15} />
      </button>
      {open && (
        <div className="nav-dropdown__panel">
          {items.map((item) => (
            <Link key={item.path} to={item.path} className="nav-dropdown__item" onClick={onClose}>
              <span className="nav-dropdown__icon"><SiteIcon name={item.icon} size={19} /></span>
              <span>
                <strong>{item.label}</strong>
                {item.copy && <small>{item.copy}</small>}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function SiteNavbar({ compact = false }) {
  const location = useLocationPath();
  const route = getRoutePath(location);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [dropdown, setDropdown] = React.useState("");
  const navRef = React.useRef(null);

  React.useEffect(() => {
    setMenuOpen(false);
    setDropdown("");
  }, [route]);

  React.useEffect(() => {
    const close = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) setDropdown("");
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const closeAll = () => {
    setMenuOpen(false);
    setDropdown("");
  };
  const toolsActive = toolItems.some((item) => route === item.path);
  const infoActive = infoItems.some((item) => route === item.path);

  return (
    <header className={`site-nav ${compact ? "site-nav--compact" : ""}`} ref={navRef}>
      <div className="site-nav__inner">
        <Brand compact={compact} onNavigate={closeAll} />
        <nav className={`site-nav__links ${menuOpen ? "is-open" : ""}`} aria-label="Primary navigation">
          <Link to="/" className={`nav-link ${route === "/" ? "is-active" : ""}`} onClick={closeAll}>Home</Link>
          <Link to="/music" className={`nav-link ${route === "/music" ? "is-active" : ""}`} onClick={closeAll}>Studio</Link>
          <Dropdown
            label="Tools"
            items={toolItems}
            active={toolsActive && route !== "/music"}
            open={dropdown === "tools"}
            onToggle={() => setDropdown((value) => value === "tools" ? "" : "tools")}
            onClose={closeAll}
          />
          <Dropdown
            label="Info"
            items={infoItems}
            active={infoActive}
            open={dropdown === "info"}
            onToggle={() => setDropdown((value) => value === "info" ? "" : "info")}
            onClose={closeAll}
          />
        </nav>
        <div className="site-nav__actions">
          {!compact && (
            <Link to="/music" className="button button--primary button--nav">
              <SiteIcon name="play" size={16} />
              Open Studio
            </Link>
          )}
          <button className="mobile-menu-button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} onClick={() => setMenuOpen((value) => !value)}>
            <SiteIcon name={menuOpen ? "close" : "menu"} size={23} />
          </button>
        </div>
      </div>
    </header>
  );
}

const footerGroups = [
  { title: "Create", links: toolItems },
  { title: "Support", links: infoItems.slice(0, 3) },
  { title: "Policies", links: infoItems.slice(3) },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-container site-footer__grid">
        <div className="site-footer__brand">
          <Brand />
          <p>Design original sounds, sequence patterns, arrange songs, mix channels, automate movement, and render WAV masters directly in a modern browser.</p>
          <div className="network-links">
            <a href="https://audiomasterlab.com" target="_blank" rel="noreferrer">AudioMasterLab</a>
            <a href="https://imagemasterlab.com" target="_blank" rel="noreferrer">ImageMasterLab</a>
            <a href="https://suiteofficelab.com" target="_blank" rel="noreferrer">SuiteOfficeLab</a>
          </div>
        </div>
        {footerGroups.map((group) => (
          <div className="site-footer__group" key={group.title}>
            <strong>{group.title}</strong>
            {group.links.map((item) => <Link key={item.path} to={item.path}>{item.label}</Link>)}
          </div>
        ))}
      </div>
      <div className="site-container site-footer__bottom">
        <span>© {new Date().getFullYear()} MusicStudioLab. Browser-first music production tools.</span>
        <span>Use audio you created or have permission to process.</span>
      </div>
    </footer>
  );
}

export function SiteLayout({ children }) {
  return (
    <div className="site-page">
      <SiteNavbar />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}

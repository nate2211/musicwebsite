import React from "react";

const paths = {
  home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V21h13V10.5"/><path d="M9.5 21v-6h5v6"/></>,
  studio: <><path d="M4 4v16"/><path d="M10 7v10"/><path d="M16 3v18"/><path d="M22 9v6"/><circle cx="4" cy="9" r="2"/><circle cx="10" cy="13" r="2"/><circle cx="16" cy="8" r="2"/><circle cx="22" cy="12" r="2"/></>,
  synth: <><path d="M4 18c2-8 4-8 6 0s4 8 6 0 4-8 6 0"/><path d="M3 5h18"/><path d="M6 2v6M12 2v6M18 2v6"/></>,
  sounds: <><path d="M4 14v-4M8 18V6M12 21V3M16 17V7M20 14v-4"/></>,
  workflow: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/><path d="M10 6.5h4M6.5 10v4M17.5 10v4M10 17.5h4"/></>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.5 2.5 0 1 1 3.7 2.2c-1 .6-1.5 1.1-1.5 2.3"/><path d="M12 17h.01"/></>,
  about: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
  contact: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
  shield: <><path d="M12 3 20 6v6c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></>,
  document: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 12h6M9 16h6"/></>,
  copyright: <><circle cx="12" cy="12" r="9"/><path d="M15 9.5a4 4 0 1 0 0 5"/></>,
  play: <path d="m9 6 9 6-9 6Z"/>,
  arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  chevron: <path d="m8 10 4 4 4-4"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  spark: <><path d="m12 2 1.5 5.2L19 9l-5.5 1.8L12 16l-1.5-5.2L5 9l5.5-1.8Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z"/></>,
  mixer: <><path d="M5 3v18M12 3v18M19 3v18"/><rect x="2.5" y="7" width="5" height="4" rx="1"/><rect x="9.5" y="14" width="5" height="4" rx="1"/><rect x="16.5" y="5" width="5" height="4" rx="1"/></>,
  automation: <><path d="M3 17 8 8l4 5 4-9 5 8"/><circle cx="8" cy="8" r="1.5"/><circle cx="12" cy="13" r="1.5"/><circle cx="16" cy="4" r="1.5"/></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 20h16"/></>,
  keyboard: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v8M11 5v8M15 5v8M19 5v8"/><path d="M5 15h14"/></>,
};

export default function SiteIcon({ name, size = 20, className = "" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] || paths.spark}
    </svg>
  );
}

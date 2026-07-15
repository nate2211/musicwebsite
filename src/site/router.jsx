import React from "react";

const LocationContext = React.createContext(null);

function currentLocation(fallback = "/") {
  if (typeof window === "undefined") return fallback;
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function RouterProvider({ location, children }) {
  return <LocationContext.Provider value={location}>{children}</LocationContext.Provider>;
}

export function useLocationPath(initialLocation = "/") {
  const contextLocation = React.useContext(LocationContext);
  const [location, setLocation] = React.useState(() => contextLocation || currentLocation(initialLocation));

  React.useEffect(() => {
    if (typeof window === "undefined" || contextLocation) return undefined;
    const update = () => setLocation(currentLocation(initialLocation));
    window.addEventListener("popstate", update);
    window.addEventListener("musicstudio:navigate", update);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener("musicstudio:navigate", update);
    };
  }, [contextLocation, initialLocation]);

  return contextLocation || location;
}

export function navigate(to, { replace = false } = {}) {
  if (typeof window === "undefined") return;
  if (replace) window.history.replaceState({}, "", to);
  else window.history.pushState({}, "", to);
  window.dispatchEvent(new Event("musicstudio:navigate"));
  window.scrollTo({ top: 0, behavior: "auto" });
}

export function Link({ to, children, onClick, className = "", ...props }) {
  const handleClick = (event) => {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      props.target === "_blank" ||
      /^https?:\/\//i.test(to) ||
      to.startsWith("mailto:")
    ) return;
    event.preventDefault();
    navigate(to);
  };

  return <a href={to} className={className} onClick={handleClick} {...props}>{children}</a>;
}

export function getRoutePath(location = "/") {
  const [pathname] = String(location).split(/[?#]/);
  if (!pathname || pathname === "/" || pathname === "/index.html") return "/";
  if (pathname === "/studio") return "/music";
  return pathname.replace(/\/+$/, "") || "/";
}

export function getSearchParams(location = "/") {
  const query = String(location).includes("?") ? String(location).split("?")[1].split("#")[0] : "";
  return new URLSearchParams(query);
}

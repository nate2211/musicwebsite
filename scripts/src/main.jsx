import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js";
import "./index.css";

const root = document.getElementById("root");
const path = window.location.pathname.replace(/\/+$/, "") || "/";
const hasPrerenderedMarkup = root.hasChildNodes();
const isStudioRoute = path === "/music" || path === "/studio";
const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if (hasPrerenderedMarkup && !isStudioRoute) ReactDOM.hydrateRoot(root, app);
else ReactDOM.createRoot(root).render(app);

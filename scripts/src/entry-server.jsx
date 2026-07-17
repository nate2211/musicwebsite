import React from "react";
import { renderToString } from "react-dom/server";
import App from "./App.jsx";
import { RouterProvider } from "./site/router.jsx";
export { SEO_ROUTES, buildStructuredData, getSeoForPath } from "./site/seo/metadata.js";

export function render(url) {
  return renderToString(
    <RouterProvider location={url}>
      <App initialLocation={url} />
    </RouterProvider>,
  );
}

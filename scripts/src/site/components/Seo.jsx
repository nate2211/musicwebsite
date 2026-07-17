import React from "react";
import {
  SITE_LANGUAGE,
  SITE_LOCALE,
  SITE_NAME,
  SITE_URL,
  buildStructuredData,
  getSeoForPath,
} from "../seo/metadata";

function ensureMeta(name, property = false) {
  const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(property ? "property" : "name", name);
    document.head.appendChild(node);
  }
  return node;
}

function ensureLink(rel, key = rel) {
  let node = document.head.querySelector(`link[rel="${rel}"][data-seo-key="${key}"]`);
  if (!node) {
    node = document.createElement("link");
    node.rel = rel;
    node.dataset.seoKey = key;
    document.head.appendChild(node);
  }
  return node;
}

export default function Seo({ title, description, path = "/", structuredData, noIndex = false }) {
  React.useEffect(() => {
    const routeSeo = getSeoForPath(path);
    const fullTitle = title
      ? (title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`)
      : routeSeo.title;
    const finalDescription = description || routeSeo.description;
    const canonicalUrl = `${SITE_URL}${routeSeo.path === "/" ? "/" : routeSeo.path}`;
    const image = routeSeo.image;
    const shouldIndex = !noIndex && routeSeo.index !== false;
    const robots = shouldIndex
      ? "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"
      : "noindex,follow,max-image-preview:large";

    document.documentElement.lang = SITE_LANGUAGE;
    document.title = fullTitle;
    ensureMeta("description").content = finalDescription;
    ensureMeta("robots").content = robots;
    ensureMeta("googlebot").content = robots;
    ensureMeta("application-name").content = SITE_NAME;

    ensureMeta("og:title", true).content = fullTitle;
    ensureMeta("og:description", true).content = finalDescription;
    ensureMeta("og:type", true).content = "website";
    ensureMeta("og:url", true).content = canonicalUrl;
    ensureMeta("og:site_name", true).content = SITE_NAME;
    ensureMeta("og:locale", true).content = SITE_LOCALE;
    ensureMeta("og:image", true).content = image;
    ensureMeta("og:image:width", true).content = "1200";
    ensureMeta("og:image:height", true).content = "630";
    ensureMeta("og:image:alt", true).content = `${routeSeo.label} — ${SITE_NAME}`;

    ensureMeta("twitter:card").content = "summary_large_image";
    ensureMeta("twitter:title").content = fullTitle;
    ensureMeta("twitter:description").content = finalDescription;
    ensureMeta("twitter:image").content = image;
    ensureMeta("twitter:image:alt").content = `${routeSeo.label} — ${SITE_NAME}`;

    const canonical = ensureLink("canonical", "canonical");
    canonical.href = canonicalUrl;
    const alternate = ensureLink("alternate", "en-us");
    alternate.hreflang = "en-US";
    alternate.href = canonicalUrl;
    const xDefault = ensureLink("alternate", "x-default");
    xDefault.hreflang = "x-default";
    xDefault.href = canonicalUrl;

    document.querySelectorAll("script[data-seo-schema]").forEach((node) => node.remove());
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.seoSchema = "page";
    script.textContent = JSON.stringify(structuredData || buildStructuredData(routeSeo.path));
    document.head.appendChild(script);
  }, [title, description, path, structuredData, noIndex]);

  return null;
}

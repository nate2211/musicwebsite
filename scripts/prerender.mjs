import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const ssrDir = path.join(rootDir, ".seo-ssr");
const entryCandidates = [
  path.join(ssrDir, "entry-server.js"),
  path.join(ssrDir, "entry-server.mjs"),
  path.join(ssrDir, "assets", "entry-server.js"),
];
const entryPath = entryCandidates.find((candidate) => fs.existsSync(candidate));
if (!entryPath) throw new Error(`Unable to locate the SSR entry in ${ssrDir}`);

const { SEO_ROUTES, buildStructuredData, getSeoForPath, render } = await import(pathToFileURL(entryPath).href);
const templatePath = path.join(distDir, "index.html");
const template = fs.readFileSync(templatePath, "utf8");
const verification = process.env.GOOGLE_SITE_VERIFICATION || process.env.VITE_GOOGLE_SITE_VERIFICATION || "";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function headMarkup(routePath) {
  const seo = getSeoForPath(routePath);
  const canonical = `https://musicstudiolab.com${seo.path === "/" ? "/" : seo.path}`;
  const robots = seo.index === false
    ? "noindex,follow,max-image-preview:large"
    : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1";
  const schema = JSON.stringify(buildStructuredData(seo.path)).replaceAll("<", "\\u003c");
  const ogType = seo.schema === "article" ? "article" : "website";
  const verificationTag = verification
    ? `\n    <meta name="google-site-verification" content="${escapeHtml(verification)}" />`
    : "";
  const articleTags = seo.schema === "article"
    ? `\n    <meta property="article:published_time" content="2026-07-15" />\n    <meta property="article:modified_time" content="2026-07-15" />`
    : "";

  return `<!-- SEO_HEAD_START -->
    <title>${escapeHtml(seo.title)}</title>
    <meta name="description" content="${escapeHtml(seo.description)}" />
    <meta name="robots" content="${robots}" />
    <meta name="googlebot" content="${robots}" />
    <meta name="author" content="MusicStudioLab" />
    <meta name="creator" content="MusicStudioLab" />
    <meta name="publisher" content="MusicStudioLab" />
    <meta name="referrer" content="strict-origin-when-cross-origin" />${verificationTag}
    <link rel="canonical" href="${canonical}" />
    <link rel="alternate" hreflang="en-US" href="${canonical}" />
    <link rel="alternate" hreflang="x-default" href="${canonical}" />
    <meta property="og:title" content="${escapeHtml(seo.title)}" />
    <meta property="og:description" content="${escapeHtml(seo.description)}" />
    <meta property="og:type" content="${ogType}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:site_name" content="MusicStudioLab" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:image" content="${seo.image}" />
    <meta property="og:image:secure_url" content="${seo.image}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escapeHtml(`${seo.label} — MusicStudioLab`)}" />${articleTags}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(seo.title)}" />
    <meta name="twitter:description" content="${escapeHtml(seo.description)}" />
    <meta name="twitter:image" content="${seo.image}" />
    <meta name="twitter:image:alt" content="${escapeHtml(`${seo.label} — MusicStudioLab`)}" />
    <script type="application/ld+json" data-seo-schema="page">${schema}</script>
    <!-- SEO_HEAD_END -->`;
}

function buildHtml(routePath) {
  const markup = render(routePath);
  let html = template.replace(
    /<!-- SEO_HEAD_START -->[\s\S]*?<!-- SEO_HEAD_END -->/,
    headMarkup(routePath),
  );
  html = html.replace('<div id="root"></div>', `<div id="root">${markup}</div>`);
  return html;
}

const publicRoutes = Object.entries(SEO_ROUTES)
  .filter(([routePath, config]) => routePath !== "/404" && config.index !== false)
  .map(([routePath]) => routePath);

for (const routePath of publicRoutes) {
  const outputPath = routePath === "/"
    ? path.join(distDir, "index.html")
    : path.join(distDir, routePath.slice(1), "index.html");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buildHtml(routePath));
}

const notFoundHtml = buildHtml("/404");
fs.writeFileSync(path.join(distDir, "404.html"), notFoundHtml);
fs.mkdirSync(path.join(distDir, "404"), { recursive: true });
fs.writeFileSync(path.join(distDir, "404", "index.html"), notFoundHtml);

fs.rmSync(ssrDir, { recursive: true, force: true });
console.log(`Prerendered ${publicRoutes.length} indexable routes plus 404.html.`);

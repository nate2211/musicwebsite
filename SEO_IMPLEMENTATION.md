# MusicStudioLab SEO implementation

Version 6 converts the marketing website from a single generic SPA document into an indexable, route-specific site while preserving the interactive browser DAW.

## What the build produces

`npm run build` now performs three stages:

1. Builds the browser application with Vite.
2. Builds a temporary React server-rendering entry.
3. Pre-renders every public route into its own HTML file and removes the temporary SSR bundle.

Generated routes:

- `/`
- `/music`
- `/synth-lab`
- `/sounds`
- `/workflow`
- `/help`
- `/about`
- `/contact`
- `/privacy`
- `/terms`
- `/copyright`
- `404.html` with `noindex`

Each indexable page contains a unique title, meta description, canonical URL, robots directives, Open Graph tags, Twitter card tags, one H1, visible body copy, internal links, breadcrumbs, and JSON-LD before JavaScript executes.

## Structured data

The route metadata system creates a schema.org `@graph` containing applicable entities:

- `Organization`
- `WebSite`
- `WebPage` or `ContactPage`
- `BreadcrumbList`
- `SoftwareApplication` on product-focused pages
- `TechArticle` on the production workflow
- `FAQPage` only where the same questions and answers are visibly rendered

No ratings, testimonials, prices beyond the actual free browser offer, or other unsupported claims are fabricated.

## Performance changes

- The full production studio is loaded with `React.lazy` only on `/music`.
- Marketing CSS and studio CSS are split.
- Google Fonts were removed; the interface uses system font stacks.
- Hashed assets and original WAV files receive long immutable cache headers.
- Marketing sections use `content-visibility` where supported.
- The build emits no production source maps.
- All social images have explicit 1200×630 dimensions.

## Canonical behavior

- `/studio` redirects permanently to `/music`.
- `/index.html` redirects permanently to `/`.
- `/home` redirects permanently to `/`.
- Every public route is a real generated HTML path, so a catch-all 200 rewrite is not required.
- Cloudflare Pages can use the generated `404.html` for unknown URLs.

## Google verification

A verification tag is intentionally not hard-coded. DNS verification is preferred for a domain property. To inject an HTML verification meta tag during build, set either environment variable:

```text
GOOGLE_SITE_VERIFICATION=your-token
```

or

```text
VITE_GOOGLE_SITE_VERIFICATION=your-token
```

Then rebuild and deploy `dist`.

## Validation

Run:

```powershell
npm run check
```

This validates the audio library and presets, creates the full production build, and checks:

- route files
- title and description lengths
- canonical URLs
- robots directives
- one H1 per page
- pre-rendered content depth
- Open Graph and Twitter metadata
- valid JSON-LD
- sitemap parity
- robots.txt
- canonical redirects
- 1200×630 social images
- absence of private npm registry URLs

# Public website structure

The public website uses a small dependency-free client router so the workstation keeps its minimal React/Vite dependency set.

## Routes

- `/` — product home
- `/music` and `/studio` — production workstation
- `/synth-lab` — synthesizer architecture and sound-design overview
- `/sounds` — factory content overview
- `/workflow` — production workflow guide
- `/help` — help center and troubleshooting
- `/about` — product mission and Lab network
- `/contact` — support contact form using a prepared email workflow
- `/privacy`, `/terms`, `/copyright` — trust and policy pages

## Components

- `src/site/router.jsx` — History API route state and internal links
- `src/site/components/SiteChrome.jsx` — navbar, menus, footer, site layout
- `src/site/components/PageParts.jsx` — reusable hero, cards, sections, previews, and callouts
- `src/site/components/Seo.jsx` — route-aware metadata and JSON-LD
- `src/site/components/SiteIcon.jsx` — inline SVG icon system
- `src/site/Site.css` — responsive product design system

The `/music` route keeps the public navbar visible and allocates the remaining viewport height to `StudioPage`. The workstation itself remains horizontally optimized for desktop production and preserves its existing minimum width.

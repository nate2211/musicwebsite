# MusicStudioLab Enterprise Production Website 5

MusicStudioLab is a browser-based hip-hop, trap, drill, R&B, and electronic production workstation built with React, Vite, and the Web Audio API. Version 6 combines the expanded workstation with a complete public-facing product website inspired by the original MusicStudioLab dark glass interface and the connected AudioMasterLab, ImageMasterLab, and SuiteOfficeLab product family.

The earlier monolithic studio remains under `src/pages/legacyMusic.js` for reference. The active workstation is split into maintainable audio, state, data, and UI modules under `src/studio`, while the public website is split into reusable navigation, page, SEO, layout, and routing modules under `src/site`.

## Public website

The application now includes:

- Responsive sticky MusicStudioLab navigation with desktop dropdowns and a mobile menu.
- Home page with product positioning, original asset counts, workflow explanation, studio modules, and launch actions.
- `/music` and `/studio` full-height production-workstation routes.
- `/synth-lab` synthesizer architecture and sound-design page.
- `/sounds` original factory sample and preset library page.
- `/workflow` guided production workflow from sound selection to WAV render.
- `/help` product help and troubleshooting center.
- `/about`, `/contact`, `/privacy`, `/terms`, and `/copyright` trust and support pages.
- Shared footer links for AudioMasterLab, ImageMasterLab, and SuiteOfficeLab.
- Route-aware titles, descriptions, canonical URLs, Open Graph data, structured data, sitemap, robots file, PWA metadata, and Cloudflare SPA routing.

## Production workstation

- Seven production workspaces: Channel Rack, Piano Roll, Playlist, Mixer, Synth Lab, Automation, and Mastering.
- 332 original local WAV assets totaling about 117 MB before the production build is copied.
- 168 original factory synthesizer patches across 14 categories.
- Three main oscillators plus sub and colored-noise generators.
- Built-in sine, triangle, saw, square, pulse, warm-saw, organ, hollow, digital, metallic, and vowel waveforms.
- Unison up to nine voices, detune, stereo spread, drift, tuning, glide, mono/legato metadata, and velocity response.
- FM and ring modulation, pitch envelope, dual multimode filters, serial/parallel filter routing, two tempo-syncable LFOs, and four performance macros.
- Per-voice chorus, saturation, and bit reduction.
- Custom patch save, deletion, mutation, random generation, JSON import, and JSON export.
- Tuned 808s, kicks, snares, claps, closed/open hats, percussion, transitions, impacts, textures, drum loops, melody loops, wavetables, and reverb impulse responses.
- Per-track high-pass/low-pass filters, three-band tone controls, compressor, makeup gain, saturation, chorus, delay, and convolution reverb.
- 64-step automation lanes for volume, pan, low-pass cutoff, delay/reverb sends, and Synth Lab macros.
- Live Web Audio scheduling and offline stereo WAV rendering through the same instrument, channel, automation, and master paths.
- Local project autosave plus portable project import/export.
- Web MIDI note preview and keyboard shortcuts.
- Reproducible Python generators for the full sound and preset libraries.

## Install and run

The ZIP intentionally does **not** contain `node_modules`.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

## Windows clean installation

The package uses the public npm registry in both `.npmrc` and `package-lock.json`. The lockfile contains no OpenAI-internal or private Artifactory URLs.

```powershell
npm run install:windows
npm run dev
```

The Windows script removes a partially installed `node_modules`, retries after stopping a locking Node process when necessary, runs `npm ci` against `registry.npmjs.org`, and verifies the production build.

Manual equivalent:

```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
npm cache verify
npm ci --registry=https://registry.npmjs.org/
npm run build
```

Vite 8 requires Node.js `20.19+` or `22.12+`.

## Production build and validation

```bash
npm run check
```

The compiled site is written to `dist/`. A validated production build is included in the distributed ZIP. `public/_redirects` and `wrangler.toml` provide single-page route fallback for Cloudflare deployments.

## Main source areas

- `src/site/components`: shared navbar, footer, SEO, icons, route links, cards, heroes, and public layout components.
- `src/site/pages`: home, Synth Lab, sound library, workflow, help, about, contact, privacy, terms, and copyright pages.
- `src/studio/audio`: real-time/offline audio, synth voices, channel effects, automation, waveforms, and WAV export.
- `src/studio/components`: independent workstation workspaces and controls.
- `src/studio/data`: 168 factory presets, drum kits, and preset-resolution helpers.
- `src/studio/state`: project schema, immutable reducer commands, and browser storage.
- `public/sounds`: 332 original local WAV assets plus searchable manifest.
- `scripts`: deterministic factory generators, Windows clean installation, and integrity validation.
- `docs`: architecture and beat-production workflow documentation.

## Application entries

- `src/App.jsx` contains the active route and website implementation.
- `src/App.js` re-exports `App.jsx` for CRA-style, WebStorm, Jest, Vite, and extensionless compatibility.
- `src/main.jsx` is the Vite browser entry.

## Regenerating factory content

Python 3 and NumPy are required only when regenerating assets; normal app use does not require Python.

```bash
npm run generate:presets
npm run generate:sounds
npm run validate
npm run build
```

All bundled factory WAV files and patches are procedurally generated originals. The generator seed is fixed so the library can be rebuilt deterministically.

## Browser behavior

A browser must receive a user gesture before it can start audio. Click a preview button or Play once to unlock the audio context. Large projects and long renders use more memory because offline rendering constructs the output buffer in the browser. Project saving uses browser storage, so export a project file for important backups.

## SEO and Google Search Console

Version 6 includes route-level prerendering, canonical metadata, structured data, sitemap/robots files, page-specific social images, a true 404 document, lazy-loaded studio code, cache headers, and an automated SEO validator.

Build and validate everything:

```powershell
npm run check
```

Deploy only the generated `dist` directory. See `SEO_IMPLEMENTATION.md` and `SEARCH_CONSOLE_CHECKLIST.md` for verification, sitemap submission, URL inspection, rich-result testing, and maintenance steps.

# MusicStudioLab Enterprise Production Website 6.9

MusicStudioLab is a browser-based hip-hop, trap, drill, R&B, and electronic production workstation built with React, Vite, and the Web Audio API. Version 6.9 combines the expanded workstation with a complete public-facing product website inspired by the original MusicStudioLab dark glass interface and the connected AudioMasterLab, ImageMasterLab, and SuiteOfficeLab product family.

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
- 444 original local WAV assets totaling about 154 MiB before the production build is copied.
- 240 original factory synthesizer patches across 20 categories, including cinematic, atmosphere, choir, hybrid, world, and motion instruments.
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
- `src/studio/data`: 240 factory presets, drum kits, and preset-resolution helpers.
- `src/studio/state`: project schema, immutable reducer commands, and browser storage.
- `public/sounds`: 444 original local WAV assets plus searchable manifest.
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

Version 6.9 includes route-level prerendering, canonical metadata, structured data, sitemap/robots files, page-specific social images, a true 404 document, lazy-loaded studio code, cache headers, and an automated SEO validator.

Build and validate everything:

```powershell
npm run check
```

Deploy only the generated `dist` directory. See `SEO_IMPLEMENTATION.md` and `SEARCH_CONSOLE_CHECKLIST.md` for verification, sitemap submission, URL inspection, rich-result testing, and maintenance steps.

## DAW 6.7 piano-roll object editing and transforms

The selected-track piano roll now works as a full note-object editor rather than a simple paint grid.

- Drag the **left edge** of one or more selected notes to move their starts while keeping their ends anchored.
- Drag the **right edge** to stretch or shorten note durations.
- Drag the **center** of a note to move the full selection horizontally and vertically.
- Switch to **Select** and drag an empty area to marquee-select notes; Shift-drag adds to the current selection.
- Use Ctrl/Cmd+A to select every note, Ctrl/Cmd+D to duplicate, and Delete/Backspace to remove the selection.
- Translate notes by configurable steps or semitones.
- Flip note timing, reflect pitches, compress or expand timing, and compress or expand pitch spacing.
- Fill the entire pattern with ascending or descending scale notes, root pulses, scale triads, or repeated selected phrases.
- Increase the piano-roll pattern from 1 to 16 bars. Realtime playback and offline WAV rendering use the selected pattern length.
- FL-style selected-scale row highlights and octave-spanning ghost notes remain active across the expanded timeline.
- Left-click and left-drag draw notes; right-click and right-drag erase notes.

See `RELEASE_NOTES_DAW_6_7.md` for the complete change list.

## Split archive assembly and build

The downloadable release is divided into parts no larger than 150 MiB. Put every `.part-*` file, the `.sha256` file, and `assemble-and-build.sh` in the same directory, then run:

```bash
chmod +x assemble-and-build.sh
./assemble-and-build.sh
```

The script concatenates the parts in order, verifies the reconstructed ZIP checksum, extracts the project, installs exact dependencies with `npm ci`, and runs the full production build and validation suite with `npm run check`. Use Git Bash or WSL on Windows, or any standard POSIX shell on macOS/Linux.

## DAW 6.8 track management and layered synthesizers

- Add any factory or user synthesizer preset directly to the track list from the preset browser or the track-sidebar synthesizer dropdown.
- New synth tracks use the selected preset name, receive a playable arrangement clip, become the active piano-roll track, and support duplicate-name suffixing.
- Select multiple tracks with dedicated check controls, then mute, unmute, or delete the selection.
- The track-management dropdown also provides select all, clear selection, mute all, unmute all, delete selected, and delete all.
- The factory bank now contains 240 original presets across 20 categories.
- The hybrid synth engine adds two independent spectral layers, expanded custom harmonic waveforms, per-layer unison/detune/stereo/motion, delayed layer onset, and a filtered procedural texture bed.
- New Atmosphere, Cinematic, Hybrid, Choir, World, and Motion banks provide evolving, performance-ready starting points while remaining fully editable and original.


## DAW 6.9 draggable controls and master output

- Every rotary control in Mixer, Synth Lab, sampler editing, effects, and Mastering can be dragged directly.
- Drag upward or right to increase a knob; drag downward or left to decrease it.
- Pointer capture keeps the gesture active when the cursor moves outside the knob.
- Hold Shift while dragging for fine adjustment or Alt/Option for ultra-fine movement.
- Focused knobs also support arrow keys, Page Up/Page Down, Home, and End.
- The transport bar now contains a persistent horizontal master-volume slider with a live percentage readout.
- Master output updates the Web Audio master gain during playback and applies to sample/synth previews, project autosave, project export/import, and offline WAV rendering.
- The existing Mastering workspace Master knob controls the same project setting, so both surfaces remain synchronized.

See `RELEASE_NOTES_DAW_6_9.md` for the complete change list.

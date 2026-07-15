# Hip-hop production workflow

1. **Choose a kit.** Open Kits in the left browser and load a starting palette. Every factory sample is local and usable offline after the app is deployed.
2. **Program drums.** Use Channel Rack for the 64-step pattern. Shift-click creates a softer hit, Alt-click creates a full-velocity hit, and dragging paints steps.
3. **Build an 808.** Add or select a synth track, open Synth Lab, load an 808 preset, then adjust glide, pitch envelope, oscillator harmonics, saturation, and filter cutoff. Save the result as a custom patch.
4. **Design melodies.** Select Keys, Bell, Pluck, Lead, Pad, Chord, or Texture patches. Use the Piano Roll to draw scale-snapped notes and control note length and velocity.
5. **Create variations.** Duplicate tracks or clips, mutate patches by 14% for a related timbre, and use 38% mutation for alternate sections.
6. **Arrange the song.** In Playlist, double-click an empty lane to add clips. Alt-click a clip to remove it. Increase the song range in four-bar increments.
7. **Automate movement.** Add lanes for cutoff, reverb, delay, volume, pan, or Synth Lab macros. Draw values across the 64-step grid and enable Smooth interpolation.
8. **Mix.** Start with faders below maximum. High-pass non-bass layers, control harsh mids with the parametric band, compress only when necessary, and use reverb/delay as sends.
9. **Master.** Use small broad EQ moves, moderate glue compression, soft clipping for transient control, and an output ceiling near -1 dB.
10. **Save and export.** Save locally during work, export the project JSON for portability, and render the final stereo WAV from Mastering.

## Useful sound-design recipes

### Sliding modern 808

- Osc A: sine, level 90%.
- Osc B: triangle or warm saw, -12 semitones, level 8–20%.
- Mono + legato metadata, glide 60–140 ms.
- Pitch envelope: +12 semitones, 40–80 ms decay for attack knock.
- Low-pass: 500–3,000 Hz depending on distortion.
- Character macro: 20–60%; stereo kept near mono.

### Dark bell

- Osc A and B: sine.
- FM ratio 2.5–6, amount 15–45%.
- Short attack, medium decay, low sustain, 300–900 ms release.
- Filter mostly open; add channel reverb after the voice.

### Wide rage lead

- Osc A: saw or warm saw.
- Osc B: square/pulse, +7 or +12 semitones.
- Unison 5–9, detune 10–24 cents, width 60–100%.
- Short amp attack, high sustain, modest glide.
- Chorus 10–25%, channel saturation 5–20%.

### Atmospheric pad

- Three oscillators with organ, hollow, and warm-saw waves.
- Attack 250–900 ms and release 1.5–5 seconds.
- Pink noise at 2–8%.
- LFO 2 routed to filter at 0.05–0.4 Hz.
- Chorus 25–55% and moderate reverb send.

## Keyboard shortcuts

- Space: play or pause.
- Escape: stop and return to the beginning.
- 1: Channel Rack.
- 2: Piano Roll.
- 3: Playlist.
- 4: Mixer.
- Ctrl/Command + S: save locally.

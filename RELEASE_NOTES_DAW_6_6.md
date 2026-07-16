# MusicStudioLab Enterprise DAW 6.6 release notes

## FL-style selected-scale helpers

- Rebuilt the scale helper as a dedicated rendering layer instead of placing tiny markers inside individual grid buttons.
- The piano roll now defaults to the full chromatic C0–C9 view so selected-scale notes remain visible in context.
- Selecting a **Key note** and **Scale** recalculates the exact pitch classes immediately.
- Continuous row highlighting spans all 64 timeline steps for every note in the selected scale.
- The selected tonic/root row uses a stronger green treatment while the other scale rows use muted FL-style grey highlighting.
- Out-of-scale notes remain dark and visible in the full-roll view.

## Ghost notes through the whole piano roll

- Translucent four-step ghost-note bars repeat on every beat through the complete 64-step roll.
- Each ghost appears only on an exact note belonging to the selected scale.
- Guides repeat through every available octave, including low and high root-note rows within C0–C9.
- Root guides are brighter and carry a `ROOT` label.
- Other scale notes show their degree, such as `2`, `♭3`, `4`, `5`, or `♭7`.
- Bar-start guides display the complete pitch and octave name, such as `C0`, `D4`, or `A#8`.
- Real user-created notes remain above the guide layer and retain their track color.

## Scale controls and note display

- Added three helper modes: **FL-style highlights + ghosts**, **Scale highlighting only**, and **Helpers off**.
- Added live scale-note chips showing the exact selected tones in root order.
- Added render metadata for the selected root, scale, tone list, scale degree, MIDI pitch, and guide step.
- Scale-fold mode remains available and filters the complete C0–C9 roll to only the selected scale.

## Existing DAW behavior retained

- Left-click and left-drag draw notes.
- Right-click and right-drag erase notes.
- Left-dragging an existing note changes its duration and updates the inherited next-note length.
- Selecting any sampler or instrument track opens its piano roll.
- Sample-derived track titles, duplicate suffixing, and manual-name preservation remain enabled.
- Realtime and offline pitched sampler-note playback remain enabled.

## Validation

- Verified C natural minor as `C, D, D#, F, G, G#, A#` across C0–C9.
- Verified a live change to D major as `D, E, F#, G, A, B, C#` across all available octaves.
- Verified 1,024 beat-aligned C-minor ghost bars across 64 matching pitch rows.
- Validated all 444 factory WAV assets and 168 synthesizer presets.
- Vite client build, SSR build, 11-route prerender, SEO validation, ZIP integrity, and split-part reconstruction pass.

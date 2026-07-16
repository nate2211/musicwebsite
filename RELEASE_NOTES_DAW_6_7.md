# MusicStudioLab Enterprise DAW 6.7 release notes

## Piano-roll note object editing

- Added independent left and right resize handles to every piano-roll note.
- Dragging the left edge changes the note start while keeping its end anchored.
- Dragging the right edge stretches or shortens note duration.
- Dragging the center moves notes horizontally in time and vertically in pitch.
- Moving or resizing one selected note transforms every selected note as a group.
- Right-click and right-drag continue to erase notes.
- Left-click and left-drag continue to paint notes in Draw mode.

## Marquee selection and keyboard workflow

- Added Draw and Select tools.
- Select mode supports click-and-drag marquee selection across the piano roll.
- Shift-marquee adds notes to the current selection.
- Ctrl/Cmd+A selects every note on the track.
- Ctrl/Cmd+D duplicates the active selection.
- Delete or Backspace removes selected notes.
- Selected notes receive a high-contrast outline and live group-count label.

## Group transform tools

- Translate selected notes left or right by a configurable number of steps.
- Translate selected notes up or down by a configurable number of semitones.
- Flip timing horizontally within the selected phrase.
- Reflect pitches vertically around the selection's pitch range.
- Compress or expand note timing by one-half or two-times.
- Compress or expand pitch spacing around the selection center.
- Duplicate a phrase directly after its current time span.

## Whole-roll fill tools

- Fill the active pattern with ascending selected-scale notes.
- Fill with descending selected-scale notes.
- Fill the selected root on every beat.
- Fill scale triads at each bar boundary.
- Repeat the current selection until the end of the piano-roll pattern.

## Variable piano-roll pattern length

- Added a 1–16 bar pattern-length selector.
- Piano-roll width expands from 16 to 256 steps.
- Realtime playback and offline WAV rendering use the selected pattern length.
- Increasing pattern bars also extends the project loop when required.
- Existing 64-step drum patterns repeat cleanly through longer piano patterns.
- Shrinking the pattern safely removes notes beyond the new boundary and clamps note endings.

## Scale helpers retained

- FL-style selected-scale row highlighting remains available.
- Ghost-note bars repeat across every beat, matching octave, and expanded pattern bar.
- Key, scale, folded-scale mode, horizontal zoom, and vertical zoom remain available.

## Validation

The release passed project validation, DAW 6.7 interaction validation, Vite client build, SSR build, prerendering for 11 indexable routes plus the 404 page, and SEO validation. The factory library remains at 444 WAV assets and 168 instrument presets.

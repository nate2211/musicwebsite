# MusicStudioLab 4 architecture

## Runtime audio graph

Each track owns a reusable channel strip:

`voice/sample → HP → LP → low shelf → parametric mid → high shelf → compressor → makeup → saturation → dry/chorus/delay/reverb → pan → fader → master`

The master path is:

`master input → low shelf → high shelf → glue compressor → soft clipper → output ceiling/volume → destination`

`audio/AudioEngine.js` uses a look-ahead scheduler driven by the audio clock. UI playhead notifications are delayed to match audible playback. The scheduler resolves arrangement clips, pattern steps, automation values, sample buffers, custom presets, and synth notes before creating voices.

## Synth voice architecture

`audio/voices.js` creates independent scheduled voices. A synth voice can contain:

- Oscillators A, B, and C with independent harmonic waveform, octave, semitone, fine tuning, level, and pan.
- Per-note unison expansion and stereo position.
- Sub oscillator and white/pink/brown/blue noise.
- FM and ring-modulation sources.
- Pitch, filter, and amplifier envelopes.
- Dual filters in serial or parallel mode.
- Two LFOs routed to pitch, filter, amplitude, pan, FM, or stereo width.
- Per-voice chorus, bit reduction, and saturation.
- Velocity and macro transformations.

`audio/waveforms.js` builds reusable PeriodicWave objects for custom harmonic waveforms and caches reusable noise buffers per AudioContext.

## Automation

`audio/automation.js` interpolates 64-step lanes. `AutomationEditor.jsx` draws project lanes. Both `AudioEngine.js` and `offlineRender.js` apply the same lane values to channel strips and synth macro values.

## Project state

`state/studioReducer.js` is the workstation command layer. It owns notes, steps, tracks, clips, custom presets, automation lanes, and project settings. `state/storage.js` handles local autosave and portable JSON projects.

## Factory content

- `scripts/generate_instrument_presets.py` writes the 240-patch JavaScript factory bank.
- `scripts/generate_factory_sounds.py` writes 444 original PCM WAV files and their manifest.
- `scripts/validate_project.py` confirms sample files, WAV headers, IDs, preset counts, and core modules.

## Offline rendering

`audio/offlineRender.js` loads only samples referenced by active sampler tracks, constructs OfflineAudioContext channel strips, schedules every active arrangement event and automation point, renders the master graph, and converts the AudioBuffer to a downloadable 16-bit stereo WAV.

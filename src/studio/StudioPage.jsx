import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { AudioEngine } from "./audio/AudioEngine";
import { renderProjectToWav } from "./audio/offlineRender";
import { downloadBlob } from "./audio/wav";
import { createBlankProject } from "./state/createProject";
import { studioReducer } from "./state/studioReducer";
import {
  deleteSavedProject,
  exportProject,
  importProjectFile,
  loadProjects,
  saveProject,
} from "./state/storage";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useMidi } from "./hooks/useMidi";
import { BrowserPanel } from "./components/BrowserPanel";
import { ChannelRack } from "./components/ChannelRack";
import { PianoRoll } from "./components/PianoRoll";
import { Playlist } from "./components/Playlist";
import { Mixer } from "./components/Mixer";
import { SoundDesigner } from "./components/SoundDesigner";
import { SampleLab } from "./components/SampleLab";
import { Mastering } from "./components/Mastering";
import { PluginRack } from "./components/PluginRack";
import { AutomationEditor } from "./components/AutomationEditor";
import { ProjectDialog } from "./components/ProjectDialog";
import { TopBar, ViewTabs } from "./components/TopBar";
import { TrackSidebar } from "./components/TrackSidebar";
import { importPresetPayload, resolveTrackPreset } from "./data/presetLibrary";
import {
  importUserAudioFiles,
  loadUserSamples,
  mergeSampleCatalog,
  saveRenderedUserSample,
} from "./state/sampleLibrary";
import { rasterizeAudioBuffer } from "./audio/sampleTools";
import { INSTRUMENT_PRESETS } from "./data/instrumentPresets";
import "./StudioPage.css";

const SYNTH_CATEGORY_COLORS = {
  "808": "#9f83ff", Bass: "#8572ff", Keys: "#64c8ff", Pluck: "#6ee7c6", Bell: "#87ddff",
  Lead: "#ff7eb3", Pad: "#8f9dff", Synth: "#69d4ff", Brass: "#ffb86b", Flute: "#83e6dc",
  Texture: "#b08cff", Chord: "#71d8ff", Arp: "#65e3a7", FX: "#ff8c92", Atmosphere: "#8ba4ff",
  Cinematic: "#c491ff", Hybrid: "#ff8cc8", Choir: "#b6a0ff", World: "#67d9c1", Motion: "#78baff",
};

export default function StudioPage({ initialView }) {
  const [manifest, setManifest] = useState([]);
  const [userSamples, setUserSamples] = useState([]);
  const [projects, setProjects] = useState(() => loadProjects());
  const [projectOpen, setProjectOpen] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [toast, setToast] = useState("");
  const [state, dispatch] = useReducer(studioReducer, {
    project: createBlankProject([]),
    playing: false,
    playhead: 0,
  });
  const stateRef = useRef(state);
  stateRef.current = state;
  const engineRef = useRef(null);
  if (!engineRef.current) {
    engineRef.current = new AudioEngine((step) => dispatch({ type: "SET_PLAYHEAD", value: step }));
  }

  useEffect(() => {
    let cancelled = false;
    const loadFactory = fetch("/sounds/manifest.json").then((response) => {
      if (!response.ok) throw new Error("Factory sound manifest request failed.");
      return response.json();
    });
    Promise.all([loadFactory, loadUserSamples().catch(() => [])])
      .then(([factorySamples, storedUserSamples]) => {
        if (cancelled) return;
        const catalog = mergeSampleCatalog(factorySamples, storedUserSamples, []);
        setManifest(factorySamples);
        setUserSamples(storedUserSamples);
        const nextProject = createBlankProject(catalog);
        if (initialView && ["rack", "piano", "playlist", "mixer", "plugins", "sound", "sample", "automation", "master"].includes(initialView)) {
          nextProject.view = initialView;
        }
        dispatch({ type: "LOAD_PROJECT", project: nextProject });
        factorySamples.slice(0, 12).forEach((sample) => engineRef.current.loadSample(sample).catch(() => {}));
      })
      .catch(() => setToast("Factory sound manifest could not be loaded."));
    return () => {
      cancelled = true;
      engineRef.current?.destroy();
    };
  }, []);

  React.useEffect(() => {
    if (initialView && ["rack", "piano", "playlist", "mixer", "plugins", "sound", "sample", "automation", "master"].includes(initialView)) {
      dispatch({ type: "SET_VIEW", view: initialView });
    }
  }, [initialView]);

  const project = state.project;
  const selectedTrack = project.tracks.find((track) => track.id === project.selectedTrackId)
    || project.tracks[0];

  useEffect(() => {
    engineRef.current?.sync(project);
  }, [project.masterVolume, project.master]);

  useEffect(() => {
    if (!project.tracks.length) return;
    const selectedExists = project.tracks.some((track) => track.id === project.selectedTrackId);
    if (!selectedExists) {
      dispatch({ type: "SELECT_TRACK", id: project.tracks[0].id });
    }
  }, [project.selectedTrackId, project.tracks]);

  useEffect(() => {
    if (manifest.length && project.samples.length === 0) {
      dispatch({ type: "SET_PROJECT_FIELD", field: "samples", value: mergeSampleCatalog(manifest, userSamples, project.samples) });
    }
  }, [manifest, userSamples, project.samples.length]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setProjects(saveProject(project));
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [project]);

  const notify = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }, []);

  const playPause = useCallback(async () => {
    if (stateRef.current.playing) {
      engineRef.current.pause();
      dispatch({ type: "SET_PLAYING", value: false });
      return;
    }
    await engineRef.current.play(() => stateRef.current.project, stateRef.current.playhead);
    dispatch({ type: "SET_PLAYING", value: true });
  }, []);

  const stop = useCallback(() => {
    engineRef.current.stop();
    dispatch({ type: "SET_PLAYING", value: false });
    dispatch({ type: "SET_PLAYHEAD", value: 0 });
  }, []);

  const save = useCallback(() => {
    setProjects(saveProject(stateRef.current.project));
    notify("Project saved locally.");
  }, [notify]);

  const setView = useCallback((view) => dispatch({ type: "SET_VIEW", view }), []);
  useKeyboardShortcuts({ onPlayPause: playPause, onStop: stop, onSave: save, setView });

  const previewMidi = useCallback(async (midi = 60) => {
    const currentProject = stateRef.current.project;
    const currentTrack = currentProject.tracks.find((track) => track.id === currentProject.selectedTrackId)
      || currentProject.tracks[0];
    if (!currentTrack) return;
    const sample = currentProject.samples.find((entry) => entry.id === currentTrack.sampleId);
    const preset = currentTrack.type === "synth" ? resolveTrackPreset(currentProject, currentTrack) : null;
    await engineRef.current.previewTrack(currentTrack, preset, sample, midi, currentProject);
  }, []);
  const midiStatus = useMidi(previewMidi);

  const render = useCallback(async () => {
    try {
      setRendering(true);
      setRenderProgress(1);
      stop();
      const currentProject = stateRef.current.project;
      const blob = await renderProjectToWav(currentProject, currentProject.loopBars, setRenderProgress);
      downloadBlob(
        blob,
        `${currentProject.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-master.wav`,
      );
      notify("Master WAV exported.");
    } catch (error) {
      console.error(error);
      notify(`Render failed: ${error.message}`);
    } finally {
      setRendering(false);
      setRenderProgress(0);
    }
  }, [notify, stop]);

  const previewSample = async (sample) => {
    if (!selectedTrack) return;
    const assigned = { ...selectedTrack, type: "sampler", sampleId: sample.id };
    await engineRef.current.previewTrack(assigned, null, sample, 60, project);
  };
  const assignSample = (sample) => {
    if (!selectedTrack || !sample) return;
    dispatch({
      type: "ASSIGN_SAMPLE",
      id: selectedTrack.id,
      sampleId: sample.id,
      sampleName: sample.name,
    });
  };
  const addSampleTrack = (sample) => {
    if (!sample) return;
    dispatch({
      type: "ADD_TRACK",
      trackType: "sampler",
      sampleId: sample.id,
      sampleName: sample.name,
      openPiano: true,
    });
  };
  const addPresetTrack = (preset) => {
    if (!preset) return;
    dispatch({
      type: "ADD_TRACK",
      trackType: "synth",
      presetId: preset.id,
      presetName: preset.name,
      color: SYNTH_CATEGORY_COLORS[preset.category] || "#69d4ff",
      openPiano: true,
    });
    notify(`${preset.name} added as a synthesizer track.`);
  };
  const assignPreset = (presetId) => {
    const preset = INSTRUMENT_PRESETS.find((entry) => entry.id === presetId)
      || (project.customPresets || []).find((entry) => entry.id === presetId);
    if (!selectedTrack) {
      addPresetTrack(preset);
      return;
    }
    dispatch({
      type: "UPDATE_TRACK",
      id: selectedTrack.id,
      patch: {
        type: "synth",
        presetId,
        synth: {},
        sequenceMode: "notes",
        name: selectedTrack.type === "synth" ? selectedTrack.name : (preset?.name || selectedTrack.name),
      },
    });
  };

  const importAudioToProject = useCallback(async (files, options = {}) => {
    try {
      const imported = await importUserAudioFiles(files, options);
      setUserSamples((current) => mergeSampleCatalog([], [...current, ...imported], []));
      dispatch({ type: "ADD_SAMPLES", samples: imported });
      if (options.addTracks !== false) {
        imported.forEach((sample) => dispatch({
          type: "ADD_TRACK",
          trackType: "sampler",
          sampleId: sample.id,
          sampleName: sample.name,
          openPiano: false,
        }));
        dispatch({ type: "SET_VIEW", view: "sample" });
      } else if (options.assignToSelected && selectedTrack) {
        dispatch({ type: "ASSIGN_SAMPLE", id: selectedTrack.id, sampleId: imported[0].id, sampleName: imported[0].name });
      }
      notify(`${imported.length} local audio file${imported.length === 1 ? "" : "s"} added.`);
      return imported;
    } catch (error) {
      notify(error.message);
      return [];
    }
  }, [notify, selectedTrack]);

  const importPresetFiles = useCallback(async (files) => {
    const presets = [];
    for (const file of [...(files || [])]) {
      try {
        const parsed = JSON.parse(await file.text());
        const payloads = Array.isArray(parsed) ? parsed : Array.isArray(parsed.presets) ? parsed.presets : [parsed];
        payloads.forEach((payload, index) => presets.push(importPresetPayload(payload, `${file.name.replace(/\.[^.]+$/, "")} ${index + 1}`)));
      } catch (error) {
        notify(`Could not import ${file.name}: ${error.message}`);
      }
    }
    if (presets.length) {
      dispatch({ type: "IMPORT_CUSTOM_PRESETS", presets });
      notify(`${presets.length} warm digital preset${presets.length === 1 ? "" : "s"} imported.`);
    }
  }, [notify]);

  const rasterizeSelectedSample = useCallback(async (track, sample, range) => {
    if (!track || !sample) return null;
    try {
      const context = await engineRef.current.ensure();
      const buffer = await engineRef.current.loadSample(sample);
      const blob = await rasterizeAudioBuffer(context, buffer, range);
      const renderedSample = await saveRenderedUserSample(blob, {
        name: `${sample.name} · Rasterized`,
        bpm: project.bpm,
        rootNote: sample.rootNote,
      });
      setUserSamples((current) => mergeSampleCatalog([], [...current, renderedSample], []));
      dispatch({ type: "ADD_SAMPLES", samples: [renderedSample] });
      dispatch({
        type: "ADD_TRACK",
        trackType: "sampler",
        sampleId: renderedSample.id,
        sampleName: renderedSample.name,
        openPiano: false,
      });
      dispatch({ type: "SET_VIEW", view: "sample" });
      notify("Rasterized loop saved as a new local sample track.");
      return renderedSample;
    } catch (error) {
      notify(`Rasterize failed: ${error.message}`);
      return null;
    }
  }, [notify, project.bpm]);

  const mainWorkspace = useMemo(() => {
    const common = { project, playhead: state.playhead, dispatch };
    switch (project.view) {
      case "piano":
        return (
          <PianoRoll
            key={selectedTrack?.id || "no-selected-track"}
            {...common}
            track={selectedTrack}
            onPreview={previewMidi}
          />
        );
      case "playlist":
        return <Playlist {...common} />;
      case "mixer":
        return <Mixer project={project} dispatch={dispatch} />;
      case "plugins":
        return <PluginRack project={project} track={selectedTrack} dispatch={dispatch} />;
      case "sound":
        return <SoundDesigner project={project} track={selectedTrack} dispatch={dispatch} onPreview={previewMidi} />;
      case "sample": {
        const selectedSample = project.samples.find((entry) => entry.id === selectedTrack?.sampleId);
        return (
          <SampleLab
            project={project}
            track={selectedTrack}
            sample={selectedSample}
            dispatch={dispatch}
            onGetSampleBuffer={(entry) => engineRef.current.loadSample(entry)}
            onRasterize={rasterizeSelectedSample}
            onImportAudio={importAudioToProject}
            onPreviewSlice={async (sliceIndex) => {
              if (!selectedTrack || !selectedSample) return;
              await engineRef.current.previewTrack(
                { ...selectedTrack, sliceIndex },
                null,
                selectedSample,
                60 + sliceIndex,
                project,
              );
            }}
          />
        );
      }
      case "automation":
        return <AutomationEditor project={project} playhead={state.playhead} dispatch={dispatch} />;
      case "master":
        return <Mastering project={project} dispatch={dispatch} onRender={render} />;
      default:
        return (
          <ChannelRack
            {...common}
            onPreview={(track) => {
              const sample = project.samples.find((entry) => entry.id === track.sampleId);
              engineRef.current.previewTrack(track, null, sample, 60, project);
            }}
          />
        );
    }
  }, [project, state.playhead, selectedTrack, previewMidi, render]);

  return (
    <div className="studio-app">
      <TopBar
        project={project}
        playing={state.playing}
        playhead={state.playhead}
        onPlay={playPause}
        onStop={stop}
        onField={(field, value) => dispatch({ type: "SET_PROJECT_FIELD", field, value })}
        onSave={save}
        onOpen={() => setProjectOpen(true)}
        onExport={() => exportProject(project)}
        onRender={render}
        rendering={rendering}
        midiStatus={midiStatus}
      />
      <ViewTabs view={project.view} onChange={setView} />
      <div className="studio-shell">
        <BrowserPanel
          project={project}
          selectedTrack={selectedTrack}
          onAssignSample={assignSample}
          onAddSampleTrack={addSampleTrack}
          onAssignPreset={assignPreset}
          onApplyKit={(kit) => dispatch({ type: "APPLY_KIT", kit })}
          onPreviewSample={previewSample}
          onAddPresetTrack={addPresetTrack}
          onImportAudio={importAudioToProject}
          onImportPresets={importPresetFiles}
          onPreviewPreset={(preset) => {
            if (selectedTrack) {
              engineRef.current.previewTrack(
                { ...selectedTrack, type: "synth", presetId: preset.id },
                preset,
                null,
                60,
                project,
              );
            }
          }}
          onAddTrack={(trackType, sample) => {
            if (trackType === "synth") {
              addPresetTrack(INSTRUMENT_PRESETS[0]);
              return;
            }
            dispatch({
              type: "ADD_TRACK",
              trackType,
              sampleId: sample?.id,
              sampleName: sample?.name,
              openPiano: true,
            });
          }}
        />
        <TrackSidebar
          project={project}
          dispatch={dispatch}
          onAddLocalFiles={(files) => importAudioToProject(files, { addTracks: true })}
          onSelectTrack={(trackId) => dispatch({
            type: "SELECT_TRACK",
            id: trackId,
            openPiano: true,
          })}
        />
        <main className="workspace">{mainWorkspace}</main>
      </div>
      <footer className="statusbar">
        <span>Project: {project.name}</span>
        <span>{project.tracks.length} tracks · {project.tracks.filter((track) => track.mute).length} muted</span>
        <span>{(project.selectedTrackIds || []).length} batch-selected</span>
        <span>Active: {selectedTrack?.name || "None"}</span>
        <span>{project.samples.length} sounds · {project.samples.filter((sample) => sample.user).length} local</span>
        <span>{INSTRUMENT_PRESETS.length + (project.customPresets?.length || 0)} instrument patches</span>
        <span>44.1 kHz · Web Audio · offline WAV rendering</span>
      </footer>
      {rendering && (
        <div className="render-overlay">
          <div>
            <strong>Rendering master</strong>
            <progress value={renderProgress} max="100" />
            <span>{renderProgress}%</span>
          </div>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
      <ProjectDialog
        open={projectOpen}
        onClose={() => setProjectOpen(false)}
        projects={projects}
        onLoad={(savedProject) => {
          stop();
          dispatch({
            type: "LOAD_PROJECT",
            project: { ...savedProject, samples: mergeSampleCatalog(manifest, userSamples, savedProject.samples) },
          });
          setProjectOpen(false);
        }}
        onDelete={(id) => setProjects(deleteSavedProject(id))}
        onImport={async (file) => {
          try {
            const imported = await importProjectFile(file);
            dispatch({ type: "LOAD_PROJECT", project: { ...imported, samples: mergeSampleCatalog(manifest, userSamples, imported.samples || []) } });
            setProjectOpen(false);
            notify("Project imported.");
          } catch (error) {
            notify(error.message);
          }
        }}
        onNew={() => {
          stop();
          dispatch({ type: "LOAD_PROJECT", project: createBlankProject(mergeSampleCatalog(manifest, userSamples, [])) });
          setProjectOpen(false);
        }}
      />
    </div>
  );
}

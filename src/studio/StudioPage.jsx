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
import { Mastering } from "./components/Mastering";
import { AutomationEditor } from "./components/AutomationEditor";
import { ProjectDialog } from "./components/ProjectDialog";
import { TopBar, ViewTabs } from "./components/TopBar";
import { TrackSidebar } from "./components/TrackSidebar";
import { resolveTrackPreset } from "./data/presetLibrary";
import { INSTRUMENT_PRESETS } from "./data/instrumentPresets";
import "./StudioPage.css";

export default function StudioPage({ initialView }) {
  const [manifest, setManifest] = useState([]);
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
    fetch("/sounds/manifest.json")
      .then((response) => {
        if (!response.ok) throw new Error("Factory sound manifest request failed.");
        return response.json();
      })
      .then((samples) => {
        if (cancelled) return;
        setManifest(samples);
        const nextProject = createBlankProject(samples);
        if (initialView && ["rack", "piano", "playlist", "mixer", "sound", "automation", "master"].includes(initialView)) {
          nextProject.view = initialView;
        }
        dispatch({ type: "LOAD_PROJECT", project: nextProject });
        samples.slice(0, 12).forEach((sample) => engineRef.current.loadSample(sample).catch(() => {}));
      })
      .catch(() => setToast("Factory sound manifest could not be loaded."));
    return () => {
      cancelled = true;
      engineRef.current?.destroy();
    };
  }, []);

  React.useEffect(() => {
    if (initialView && ["rack", "piano", "playlist", "mixer", "sound", "automation", "master"].includes(initialView)) {
      dispatch({ type: "SET_VIEW", view: initialView });
    }
  }, [initialView]);

  const project = state.project;
  const selectedTrack = project.tracks.find((track) => track.id === project.selectedTrackId)
    || project.tracks[0];

  useEffect(() => {
    if (manifest.length && project.samples.length === 0) {
      dispatch({ type: "SET_PROJECT_FIELD", field: "samples", value: manifest });
    }
  }, [manifest, project.samples.length]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (project.tracks.length) setProjects(saveProject(project));
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
  const assignSample = (sampleId) => {
    if (!selectedTrack) return;
    dispatch({ type: "UPDATE_TRACK", id: selectedTrack.id, patch: { type: "sampler", sampleId } });
  };
  const assignPreset = (presetId) => {
    if (!selectedTrack) return;
    dispatch({ type: "UPDATE_TRACK", id: selectedTrack.id, patch: { type: "synth", presetId, synth: {} } });
  };

  const mainWorkspace = useMemo(() => {
    const common = { project, playhead: state.playhead, dispatch };
    switch (project.view) {
      case "piano":
        return <PianoRoll {...common} track={selectedTrack} onPreview={previewMidi} />;
      case "playlist":
        return <Playlist {...common} />;
      case "mixer":
        return <Mixer project={project} dispatch={dispatch} />;
      case "sound":
        return <SoundDesigner project={project} track={selectedTrack} dispatch={dispatch} onPreview={previewMidi} />;
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
          onAssignPreset={assignPreset}
          onApplyKit={(kit) => dispatch({ type: "APPLY_KIT", kit })}
          onPreviewSample={previewSample}
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
          onAddTrack={(trackType) => dispatch({ type: "ADD_TRACK", trackType })}
        />
        <TrackSidebar project={project} dispatch={dispatch} />
        <main className="workspace">{mainWorkspace}</main>
      </div>
      <footer className="statusbar">
        <span>Project: {project.name}</span>
        <span>{project.tracks.length} tracks</span>
        <span>{project.samples.length} original factory sounds</span>
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
            project: { ...savedProject, samples: manifest.length ? manifest : savedProject.samples },
          });
          setProjectOpen(false);
        }}
        onDelete={(id) => setProjects(deleteSavedProject(id))}
        onImport={async (file) => {
          try {
            const imported = await importProjectFile(file);
            dispatch({ type: "LOAD_PROJECT", project: { ...imported, samples: manifest } });
            setProjectOpen(false);
            notify("Project imported.");
          } catch (error) {
            notify(error.message);
          }
        }}
        onNew={() => {
          stop();
          dispatch({ type: "LOAD_PROJECT", project: createBlankProject(manifest) });
          setProjectOpen(false);
        }}
      />
    </div>
  );
}

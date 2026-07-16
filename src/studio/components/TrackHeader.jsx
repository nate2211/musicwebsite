import React, { useState } from "react";

export function TrackHeader({
  track,
  selected,
  batchSelected,
  onSelect,
  onToggleBatch,
  onUpdate,
  onDuplicate,
  onDelete,
  onClear,
}) {
  const [menu, setMenu] = useState(false);
  const closeAndRun = (callback) => {
    setMenu(false);
    callback?.();
  };

  return (
    <div
      className={`track-header ${selected ? "selected" : ""} ${batchSelected ? "batch-selected" : ""} ${track.mute ? "is-muted" : ""}`}
      data-track-id={track.id}
      data-selected={selected ? "true" : "false"}
      data-batch-selected={batchSelected ? "true" : "false"}
      onClick={onSelect}
      title={`${selected ? "Selected" : "Select"} ${track.name} and open its piano roll`}
    >
      <button
        type="button"
        className={`track-batch-toggle ${batchSelected ? "active" : ""}`}
        aria-label={`${batchSelected ? "Remove" : "Add"} ${track.name} ${batchSelected ? "from" : "to"} the track selection`}
        aria-pressed={batchSelected}
        onClick={(event) => {
          event.stopPropagation();
          onToggleBatch?.();
        }}
      >
        {batchSelected ? "✓" : ""}
      </button>
      <span className="track-color" style={{ background: track.color }} />
      <span className={`track-engine-badge ${track.type}`}>{track.type === "synth" ? "SYN" : "SMP"}</span>
      <input
        value={track.name}
        aria-label={`Rename ${track.name}`}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onUpdate({ name: event.target.value })}
      />
      <button
        type="button"
        className={track.mute ? "active mute" : ""}
        aria-label={`${track.mute ? "Unmute" : "Mute"} ${track.name}`}
        onClick={(event) => {
          event.stopPropagation();
          onUpdate({ mute: !track.mute });
        }}
      >
        M
      </button>
      <button
        type="button"
        className={track.solo ? "active solo" : ""}
        aria-label={`${track.solo ? "Disable solo for" : "Solo"} ${track.name}`}
        onClick={(event) => {
          event.stopPropagation();
          onUpdate({ solo: !track.solo });
        }}
      >
        S
      </button>
      <button
        type="button"
        aria-label={`Open ${track.name} track menu`}
        onClick={(event) => {
          event.stopPropagation();
          setMenu((value) => !value);
        }}
      >
        •••
      </button>
      {menu && (
        <div className="track-menu" onClick={(event) => event.stopPropagation()}>
          <button type="button" onClick={() => closeAndRun(onToggleBatch)}>
            {batchSelected ? "Remove from selection" : "Add to selection"}
          </button>
          <button type="button" onClick={() => closeAndRun(onDuplicate)}>Duplicate</button>
          <button type="button" onClick={() => closeAndRun(onClear)}>Clear pattern</button>
          <button type="button" className="danger" onClick={() => closeAndRun(onDelete)}>Delete track</button>
        </div>
      )}
    </div>
  );
}

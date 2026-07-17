import React, { useId, useRef, useState } from "react";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const stepPrecision = (step) => {
  const text = String(step);
  if (text.includes("e-")) return Number(text.split("e-")[1]) || 0;
  return text.includes(".") ? text.split(".")[1].length : 0;
};

const snapToStep = (value, min, max, step) => {
  const safeStep = Number(step) > 0 ? Number(step) : 0.01;
  const snapped = min + Math.round((clamp(value, min, max) - min) / safeStep) * safeStep;
  return Number(clamp(snapped, min, max).toFixed(Math.min(8, stepPrecision(safeStep) + 2)));
};

export function Knob({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  display,
  size = "md",
  disabled = false,
}) {
  const id = useId();
  const faceRef = useRef(null);
  const dragRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const safeValue = Number.isFinite(value) ? value : min;
  const percent = (safeValue - min) / Math.max(0.000001, max - min);
  const degrees = -135 + percent * 270;
  const valueText = display ? display(safeValue) : formatDefault(safeValue, step);

  const commit = (nextValue) => {
    if (!disabled) onChange(snapToStep(nextValue, min, max, step));
  };

  const beginDrag = (event) => {
    if (disabled || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      value: safeValue,
    };
    setDragging(true);
  };

  const drag = (event) => {
    const active = dragRef.current;
    if (!active || active.pointerId !== event.pointerId || disabled) return;
    event.preventDefault();
    const vertical = active.y - event.clientY;
    const horizontal = (event.clientX - active.x) * 0.55;
    const modifier = event.altKey ? 0.025 : event.shiftKey ? 0.1 : 1;
    const nextValue = active.value + ((vertical + horizontal) / 120) * (max - min) * modifier;
    const snapped = snapToStep(nextValue, min, max, step);
    active.x = event.clientX;
    active.y = event.clientY;
    active.value = snapped;
    onChange(snapped);
  };

  const endDrag = (event) => {
    const active = dragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    dragRef.current = null;
    setDragging(false);
  };

  const keyAdjust = (event) => {
    if (disabled) return;
    const multiplier = event.shiftKey ? 0.1 : 1;
    const increment = step * multiplier;
    let nextValue = safeValue;
    if (["ArrowUp", "ArrowRight"].includes(event.key)) nextValue += increment;
    else if (["ArrowDown", "ArrowLeft"].includes(event.key)) nextValue -= increment;
    else if (event.key === "PageUp") nextValue += step * 10;
    else if (event.key === "PageDown") nextValue -= step * 10;
    else if (event.key === "Home") nextValue = min;
    else if (event.key === "End") nextValue = max;
    else return;
    event.preventDefault();
    commit(nextValue);
  };

  return (
    <label className={`knob knob-${size} ${disabled ? "disabled" : ""} ${dragging ? "dragging" : ""}`} htmlFor={id}>
      <span
        ref={faceRef}
        className="knob-face"
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={safeValue}
        aria-valuetext={String(valueText)}
        aria-disabled={disabled}
        title={`${label}: ${valueText} · drag up/down or left/right · Shift for fine control`}
        onPointerDown={beginDrag}
        onPointerMove={drag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={keyAdjust}
      >
        <span className="knob-indicator" style={{ transform: `rotate(${degrees}deg)` }} />
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={safeValue}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => commit(Number(event.target.value))}
      />
      <strong>{label}</strong>
      <small>{valueText}</small>
    </label>
  );
}

function formatDefault(value, step) {
  if (typeof value !== "number") return value;
  if (step < 0.01) return value.toFixed(3);
  if (step < 0.1) return value.toFixed(2);
  if (step < 1) return value.toFixed(1);
  return value.toFixed(0);
}

export function Fader({ label, value, min = 0, max = 1, step = 0.01, onChange, display }) {
  return (
    <label className="fader">
      <input
        type="range"
        orient="vertical"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <strong>{label}</strong>
      <small>{display ? display(value) : Math.round(value * 100)}</small>
    </label>
  );
}

export function Segmented({ value, options, onChange, compact = false }) {
  return (
    <div className={`segmented ${compact ? "compact" : ""}`}>
      {options.map((option) => {
        const optionValue = option.value ?? option;
        return (
          <button
            type="button"
            key={optionValue}
            className={value === optionValue ? "active" : ""}
            onClick={() => onChange(optionValue)}
          >
            {option.label ?? option}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }) {
  return (
    <label className="toggle-control">
      <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle-switch" />
      <span>
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

export function SelectControl({ label, value, options, onChange }) {
  return (
    <label className="select-control">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => {
          const optionValue = option.value ?? option;
          return <option key={optionValue} value={optionValue}>{option.label ?? option}</option>;
        })}
      </select>
    </label>
  );
}

export function Panel({ title, subtitle, actions, children, className = "" }) {
  return (
    <section className={`studio-panel ${className}`}>
      <header>
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions && <div className="panel-actions">{actions}</div>}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}

export function Meter({ value = 0.6 }) {
  return (
    <div className="meter">
      <span style={{ height: `${Math.max(2, Math.min(100, value * 100))}%` }} />
    </div>
  );
}

export function IconButton({ title, children, onClick, active = false, disabled = false }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      className={`icon-button ${active ? "active" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

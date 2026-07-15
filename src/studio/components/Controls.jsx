import React, { useId } from "react";

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
  const safeValue = Number.isFinite(value) ? value : min;
  const percent = (safeValue - min) / Math.max(0.000001, max - min);
  const degrees = -135 + percent * 270;
  return (
    <label className={`knob knob-${size} ${disabled ? "disabled" : ""}`} htmlFor={id}>
      <span className="knob-face">
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
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <strong>{label}</strong>
      <small>{display ? display(safeValue) : formatDefault(safeValue, step)}</small>
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

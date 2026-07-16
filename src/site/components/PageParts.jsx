import React from "react";
import { Link } from "../router";
import SiteIcon from "./SiteIcon";

export function Eyebrow({ children, icon = "spark" }) {
  return <span className="eyebrow"><SiteIcon name={icon} size={16} />{children}</span>;
}

export function Hero({ eyebrow, title, description, actions, children, compact = false }) {
  return (
    <section className={`site-hero ${compact ? "site-hero--compact" : ""}`}>
      <div className="site-container site-hero__grid">
        <div className="site-hero__copy">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1>{title}</h1>
          <p>{description}</p>
          {actions && <div className="hero-actions">{actions}</div>}
        </div>
        {children && <div className="site-hero__visual">{children}</div>}
      </div>
    </section>
  );
}

export function PrimaryButton({ to, children, icon = "play", secondary = false }) {
  return <Link to={to} className={`button ${secondary ? "button--secondary" : "button--primary"}`}><SiteIcon name={icon} size={18} />{children}</Link>;
}

export function SectionHeading({ eyebrow, title, description, align = "left" }) {
  return (
    <div className={`section-heading section-heading--${align}`}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}

export function FeatureCard({ icon, title, description, meta, to }) {
  const content = (
    <>
      <span className="feature-card__icon"><SiteIcon name={icon} size={23} /></span>
      {meta && <span className="feature-card__meta">{meta}</span>}
      <h3>{title}</h3>
      <p>{description}</p>
      {to && <span className="feature-card__link">Explore <SiteIcon name="arrow" size={16} /></span>}
    </>
  );
  return to ? <Link to={to} className="feature-card feature-card--link">{content}</Link> : <article className="feature-card">{content}</article>;
}

export function Stat({ value, label, description }) {
  return <div className="stat-card"><strong>{value}</strong><span>{label}</span>{description && <small>{description}</small>}</div>;
}

export function CheckList({ items }) {
  return <ul className="check-list">{items.map((item) => <li key={item}><span><SiteIcon name="check" size={15} /></span>{item}</li>)}</ul>;
}

export function Callout({ eyebrow = "Start creating", title, description, primary = "/music", primaryLabel = "Open Studio", secondary, secondaryLabel }) {
  return (
    <section className="site-section site-section--callout">
      <div className="site-container">
        <div className="callout-card">
          <div>
            <Eyebrow>{eyebrow}</Eyebrow>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <div className="callout-card__actions">
            <PrimaryButton to={primary}>{primaryLabel}</PrimaryButton>
            {secondary && <PrimaryButton to={secondary} secondary icon="arrow">{secondaryLabel}</PrimaryButton>}
          </div>
        </div>
      </div>
    </section>
  );
}

export function PageIntro({ eyebrow, title, description }) {
  return (
    <section className="page-intro">
      <div className="site-container page-intro__inner">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">{eyebrow}</span>
        </nav>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </section>
  );
}

export function FaqSection({ items, title = "Frequently asked questions", eyebrow = "Answers before you create" }) {
  return (
    <section className="site-section faq-section">
      <div className="site-container">
        <SectionHeading eyebrow={eyebrow} title={title} description="Clear answers about browser music production, project behavior and the tools included in MusicStudioLab." />
        <div className="faq-list">
          {items.map((item) => (
            <details key={item.question} className="faq-item">
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ContentPanel({ title, children, id }) {
  return <section className="content-panel" id={id}><h2>{title}</h2>{children}</section>;
}

export function ProductPreview() {
  const rows = [
    [1, 5, 9, 13],
    [3, 7, 11, 15],
    [2, 6, 10, 14],
    [4, 8, 12, 16],
    [1, 4, 7, 10, 13, 16],
  ];
  return (
    <div className="product-preview">
      <div className="product-preview__bar">
        <div className="window-dots"><i /><i /><i /></div>
        <span>Industry Beat Session</span>
        <span className="preview-live"><b /> 142 BPM</span>
      </div>
      <div className="product-preview__tabs">
        <span className="is-active">Channel Rack</span><span>Piano Roll</span><span>Playlist</span><span>Mixer</span>
      </div>
      <div className="product-preview__body">
        <aside>
          <strong>Factory Library</strong>
          {['Drums','808 Bass','Instruments','Textures','Loops'].map((label, index) => <div key={label} className={index === 1 ? 'is-selected' : ''}><span>{label}</span><small>{[132,36,240,48,56][index]}</small></div>)}
        </aside>
        <div className="preview-rack">
          {['Punch Kick 07','Air Hat 14','Wide Clap 06','Sub 808 C','Glass Pluck'].map((name, rowIndex) => (
            <div className="preview-rack__row" key={name}>
              <strong><i style={{ '--row-accent': ['#65e4c2','#7b9cff','#b894ff','#ffb66e','#ff75aa'][rowIndex] }} />{name}</strong>
              <div className="preview-steps">{Array.from({ length: 16 }, (_, index) => <span key={index} className={rows[rowIndex].includes(index + 1) ? 'is-on' : index % 4 === 0 ? 'is-beat' : ''} />)}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="product-preview__footer"><span>7 workspaces</span><span>444 original WAV assets</span><span>240 layered synth patches</span></div>
    </div>
  );
}

export function WaveVisual() {
  return (
    <div className="wave-visual">
      <div className="wave-visual__header"><span>Custom Harmonic Engine</span><strong>NEON GLASS LEAD</strong></div>
      <svg viewBox="0 0 600 210" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="waveGradient" x1="0" x2="1">
            <stop offset="0" stopColor="#65e4c2" />
            <stop offset=".55" stopColor="#78a7ff" />
            <stop offset="1" stopColor="#bb8cff" />
          </linearGradient>
        </defs>
        {Array.from({ length: 8 }, (_, index) => <line key={index} x1="0" y1={25 + index * 22} x2="600" y2={25 + index * 22} stroke="rgba(255,255,255,.06)" />)}
        {Array.from({ length: 12 }, (_, index) => <line key={index} y1="0" x1={index * 55} y2="210" x2={index * 55} stroke="rgba(255,255,255,.05)" />)}
        <path d="M0 108 C30 25 55 190 88 105 S145 20 180 105 S242 192 278 105 S337 30 372 105 S430 180 465 105 S525 30 600 110" fill="none" stroke="url(#waveGradient)" strokeWidth="5" />
        <path d="M0 108 C30 25 55 190 88 105 S145 20 180 105 S242 192 278 105 S337 30 372 105 S430 180 465 105 S525 30 600 110" fill="none" stroke="rgba(101,228,194,.16)" strokeWidth="16" />
      </svg>
      <div className="wave-visual__controls">{['OSC A','OSC B','FM','FILTER','MOTION','SPACE'].map((label, index) => <div key={label}><span style={{ '--knob': `${35 + index * 41}deg` }} /><small>{label}</small></div>)}</div>
    </div>
  );
}

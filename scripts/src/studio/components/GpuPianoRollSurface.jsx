import React, { useEffect, useRef } from "react";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function hexToRgb(hex = "#66e3bf") {
  const normalized = String(hex).replace("#", "").trim();
  const value = normalized.length === 3
    ? normalized.split("").map((character) => character + character).join("")
    : normalized.padEnd(6, "0").slice(0, 6);
  const number = Number.parseInt(value, 16);
  return [((number >> 16) & 255) / 255, ((number >> 8) & 255) / 255, (number & 255) / 255];
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "GPU shader compilation failed.";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createWebGlRenderer(canvas) {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    desynchronized: true,
    powerPreference: "high-performance",
    preserveDrawingBuffer: false,
  });
  if (!gl) return null;

  const vertex = createShader(gl, gl.VERTEX_SHADER, `#version 300 es
    in vec2 a_position;
    in vec4 a_color;
    uniform vec2 u_resolution;
    out vec4 v_color;
    void main() {
      vec2 zeroToOne = a_position / u_resolution;
      vec2 clip = zeroToOne * 2.0 - 1.0;
      gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
      v_color = a_color;
    }
  `);
  const fragment = createShader(gl, gl.FRAGMENT_SHADER, `#version 300 es
    precision mediump float;
    in vec4 v_color;
    out vec4 outColor;
    void main() { outColor = v_color; }
  `);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "GPU program link failed.");
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  const positionLocation = gl.getAttribLocation(program, "a_position");
  const colorLocation = gl.getAttribLocation(program, "a_color");
  const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
  const buffer = gl.createBuffer();
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.DEPTH_TEST);

  return {
    backend: "WebGL2 GPU",
    render(rectangles, width, height, dpr) {
      const pixelWidth = Math.max(1, Math.round(width * dpr));
      const pixelHeight = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
      gl.viewport(0, 0, pixelWidth, pixelHeight);
      gl.clearColor(0.035, 0.045, 0.065, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform2f(resolutionLocation, width, height);

      const data = new Float32Array(rectangles.length * 6 * 6);
      let offset = 0;
      const vertexAt = (x, y, color) => {
        data[offset++] = x;
        data[offset++] = y;
        data[offset++] = color[0];
        data[offset++] = color[1];
        data[offset++] = color[2];
        data[offset++] = color[3];
      };
      rectangles.forEach(({ x, y, width: rectWidth, height: rectHeight, color }) => {
        const x2 = x + rectWidth;
        const y2 = y + rectHeight;
        vertexAt(x, y, color); vertexAt(x2, y, color); vertexAt(x, y2, color);
        vertexAt(x, y2, color); vertexAt(x2, y, color); vertexAt(x2, y2, color);
      });
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(colorLocation);
      gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 24, 8);
      gl.drawArrays(gl.TRIANGLES, 0, rectangles.length * 6);
    },
    destroy() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}

function createCanvasRenderer(canvas) {
  const context = canvas.getContext("2d", { alpha: true, desynchronized: true });
  if (!context) return null;
  return {
    backend: "Canvas fallback",
    render(rectangles, width, height, dpr) {
      const pixelWidth = Math.max(1, Math.round(width * dpr));
      const pixelHeight = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.fillStyle = "#090c11";
      context.fillRect(0, 0, width, height);
      rectangles.forEach((rectangle) => {
        const [r, g, b, a] = rectangle.color;
        context.fillStyle = `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`;
        context.fillRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
      });
    },
    destroy() {},
  };
}

function buildRectangles({
  width,
  height,
  scrollLeft,
  scrollTop,
  keysWidth,
  stepWidth,
  rowHeight,
  patternSteps,
  rows,
  rowIndexByMidi,
  notes,
  selectedSet,
  scalePitchClasses,
  rootPitchClass,
  showScaleHighlights,
  showScaleGhosts,
  trackColor,
  playhead,
}) {
  const rectangles = [];
  const add = (x, y, rectWidth, rectHeight, color) => {
    if (rectWidth <= 0 || rectHeight <= 0 || x >= width || y >= height || x + rectWidth <= keysWidth || y + rectHeight <= 0) return;
    rectangles.push({
      x: Math.max(keysWidth, x),
      y: Math.max(0, y),
      width: Math.min(width, x + rectWidth) - Math.max(keysWidth, x),
      height: Math.min(height, y + rectHeight) - Math.max(0, y),
      color,
    });
  };

  const firstRow = clamp(Math.floor(scrollTop / rowHeight) - 1, 0, rows.length - 1);
  const lastRow = clamp(Math.ceil((scrollTop + height) / rowHeight) + 1, 0, rows.length - 1);
  const firstStep = clamp(Math.floor((scrollLeft - keysWidth) / stepWidth) - 1, 0, patternSteps - 1);
  const lastStep = clamp(Math.ceil((scrollLeft + width - keysWidth) / stepWidth) + 1, 0, patternSteps);

  for (let row = firstRow; row <= lastRow; row += 1) {
    const midi = rows[row];
    const pitchClass = ((midi % 12) + 12) % 12;
    const inScale = scalePitchClasses.has(pitchClass);
    const isRoot = pitchClass === rootPitchClass;
    const y = row * rowHeight - scrollTop;
    const base = isRoot ? [0.075, 0.13, 0.09, 1] : inScale ? [0.052, 0.075, 0.1, 1] : [0.027, 0.035, 0.052, 1];
    add(keysWidth, y, width - keysWidth, rowHeight - 1, base);
    if (showScaleHighlights && inScale) add(keysWidth, y + 2, width - keysWidth, rowHeight - 4, isRoot ? [0.38, 0.78, 0.46, 0.12] : [0.48, 0.55, 0.66, 0.08]);
    if (showScaleGhosts && inScale) {
      for (let step = firstStep - (firstStep % 4); step <= lastStep; step += 4) {
        const x = keysWidth + step * stepWidth - scrollLeft + 3;
        add(x, y + 4, Math.max(3, stepWidth * 4 - 8), rowHeight - 8, isRoot ? [0.58, 0.84, 0.38, 0.22] : [0.62, 0.67, 0.74, 0.12]);
      }
    }
    add(keysWidth, y + rowHeight - 1, width - keysWidth, 1, [0.14, 0.17, 0.22, 0.7]);
  }

  for (let step = firstStep; step <= lastStep; step += 1) {
    const x = keysWidth + step * stepWidth - scrollLeft;
    const isBar = step % 16 === 0;
    const isBeat = step % 4 === 0;
    add(x, 0, isBar ? 2 : 1, height, isBar ? [0.58, 0.64, 0.74, 0.52] : isBeat ? [0.3, 0.35, 0.44, 0.4] : [0.15, 0.18, 0.24, 0.35]);
  }

  const [tr, tg, tb] = hexToRgb(trackColor);
  notes.forEach((note) => {
    const row = rowIndexByMidi.get(note.midi);
    if (row === undefined) return;
    const x = keysWidth + note.start * stepWidth - scrollLeft + 1;
    const y = row * rowHeight - scrollTop + 2;
    const selected = selectedSet.has(note.id);
    if (selected) add(x - 2, y - 2, note.duration * stepWidth + 1, rowHeight - 1, [0.95, 0.96, 1, 0.34]);
    add(x, y, Math.max(4, note.duration * stepWidth - 3), Math.max(4, rowHeight - 5), [tr, tg, tb, selected ? 0.96 : 0.74 + clamp(note.velocity || 0.78, 0, 1) * 0.18]);
    add(x, y + rowHeight - 8, Math.max(4, note.duration * stepWidth - 3), 3, [0.03, 0.05, 0.07, 0.35]);
  });

  const playheadX = keysWidth + (playhead % patternSteps) * stepWidth - scrollLeft;
  add(playheadX, 0, 2, height, [0.63, 1, 0.88, 0.95]);
  return rectangles;
}

export function GpuPianoRollSurface({
  enabled,
  scrollRef,
  rows,
  notes,
  rowIndexByMidi,
  selectedSet,
  scalePitchClasses,
  rootPitchClass,
  showScaleHighlights,
  showScaleGhosts,
  trackColor,
  playhead,
  patternSteps,
  stepWidth,
  rowHeight,
  keysWidth,
  onBackendChange,
}) {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!enabled || !canvas) return undefined;
    rendererRef.current = createWebGlRenderer(canvas) || createCanvasRenderer(canvas);
    onBackendChange?.(rendererRef.current?.backend || "DOM");
    return () => {
      rendererRef.current?.destroy?.();
      rendererRef.current = null;
      onBackendChange?.("DOM");
    };
  }, [enabled, onBackendChange]);

  useEffect(() => {
    const scroll = scrollRef.current;
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;
    if (!enabled || !scroll || !canvas || !renderer) return undefined;

    const draw = () => {
      frameRef.current = 0;
      const width = Math.max(1, scroll.clientWidth);
      const height = Math.max(1, scroll.clientHeight);
      const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      canvas.style.transform = `translate3d(${scroll.scrollLeft}px, ${scroll.scrollTop}px, 0)`;
      const rectangles = buildRectangles({
        width,
        height,
        scrollLeft: scroll.scrollLeft,
        scrollTop: scroll.scrollTop,
        keysWidth,
        stepWidth,
        rowHeight,
        patternSteps,
        rows,
        rowIndexByMidi,
        notes,
        selectedSet,
        scalePitchClasses,
        rootPitchClass,
        showScaleHighlights,
        showScaleGhosts,
        trackColor,
        playhead,
      });
      renderer.render(rectangles, width, height, dpr);
    };
    const requestDraw = () => {
      if (!frameRef.current) frameRef.current = window.requestAnimationFrame(draw);
    };
    requestDraw();
    scroll.addEventListener("scroll", requestDraw, { passive: true });
    const resizeObserver = new ResizeObserver(requestDraw);
    resizeObserver.observe(scroll);
    return () => {
      scroll.removeEventListener("scroll", requestDraw);
      resizeObserver.disconnect();
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    };
  }, [enabled, keysWidth, notes, patternSteps, playhead, rootPitchClass, rowHeight, rowIndexByMidi, rows, scalePitchClasses, scrollRef, selectedSet, showScaleGhosts, showScaleHighlights, stepWidth, trackColor]);

  if (!enabled) return null;
  return <canvas ref={canvasRef} className="gpu-piano-roll-canvas" aria-hidden="true" />;
}

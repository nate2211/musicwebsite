import React, { useEffect, useRef, useState } from "react";

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
  return shader;
}

function createRenderer(canvas) {
  const gl = canvas.getContext("webgl2", { alpha: true, antialias: false, desynchronized: true, powerPreference: "high-performance" });
  if (!gl) return null;
  const vertex = compile(gl, gl.VERTEX_SHADER, `#version 300 es
    in vec2 a_position;
    uniform vec2 u_resolution;
    void main(){ vec2 p=a_position/u_resolution*2.0-1.0; gl_Position=vec4(p.x,-p.y,0,1); }
  `);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, `#version 300 es
    precision mediump float;
    uniform vec4 u_color;
    out vec4 outColor;
    void main(){ outColor=u_color; }
  `);
  if (!vertex || !fragment) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
  const position = gl.getAttribLocation(program, "a_position");
  const resolution = gl.getUniformLocation(program, "u_resolution");
  const color = gl.getUniformLocation(program, "u_color");
  const buffer = gl.createBuffer();
  return {
    draw(values, width, height, dpr) {
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0.025, 0.035, 0.055, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      const bars = Math.min(96, values.length);
      const vertices = new Float32Array(bars * 12);
      let offset = 0;
      for (let index = 0; index < bars; index += 1) {
        const sourceIndex = Math.floor((index / bars) ** 1.7 * (values.length - 1));
        const level = Math.max(0.015, values[sourceIndex] / 255);
        const x1 = index / bars * width;
        const x2 = (index + 0.72) / bars * width;
        const y1 = height;
        const y2 = height - level * height;
        vertices.set([x1,y1,x2,y1,x1,y2,x1,y2,x2,y1,x2,y2], offset); offset += 12;
      }
      gl.useProgram(program); gl.uniform2f(resolution, width, height); gl.uniform4f(color, 0.42, 0.94, 0.78, 0.82);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, bars * 6);
    },
    destroy(){ gl.deleteBuffer(buffer); gl.deleteProgram(program); },
  };
}

export function GpuAudioScope({ audioEngine }) {
  const canvasRef = useRef(null);
  const [status, setStatus] = useState("Audio thread ready on first Play");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const renderer = createRenderer(canvas);
    if (!renderer) {
      setStatus("GPU spectrum unavailable · audio remains protected");
      return undefined;
    }
    let frame = 0;
    let analyser = null;
    let data = null;
    let lastStatusAt = 0;
    const draw = (now = 0) => {
      analyser = analyser || audioEngine?.getAnalyserNode?.();
      if (analyser) {
        if (!data || data.length !== analyser.frequencyBinCount) data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const width = Math.max(1, canvas.parentElement?.clientWidth || 300);
        const height = Math.max(1, canvas.parentElement?.clientHeight || 44);
        renderer.draw(data, width, height, Math.min(2, window.devicePixelRatio || 1));
        if (now - lastStatusAt > 500) {
          lastStatusAt = now;
          const stream = audioEngine?.getStreamStatus?.();
          setStatus(`${stream?.backend || "Direct native Web Audio"} · ${stream?.peakDb ?? "−∞"} dB peak · ${stream?.load ?? 0}% voice load`);
        }
      }
      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);
    return () => { window.cancelAnimationFrame(frame); renderer.destroy(); };
  }, [audioEngine]);

  return (
    <div className="gpu-audio-scope" title="GPU-rendered spectrum from the direct native Web Audio output">
      <canvas ref={canvasRef} aria-hidden="true" />
      <span>{status}</span>
    </div>
  );
}

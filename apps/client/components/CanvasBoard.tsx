"use client";

import { useEffect, useRef, useState } from "react";
import { StrokePayload } from "@mangart/shared";

interface Props {
  canDraw: boolean;
  onStroke: (stroke: StrokePayload) => void;
  remoteStroke?: StrokePayload | null;
  onClear: () => void;
  clearSignal: number;
}

export function CanvasBoard({ canDraw, onStroke, remoteStroke, onClear, clearSignal }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [color, setColor] = useState("#ffffff");
  const [size, setSize] = useState(4);
  const [mode, setMode] = useState<"draw" | "erase">("draw");
  const drawing = useRef(false);

  const drawStroke = (stroke: StrokePayload) => {
    const canvas = canvasRef.current;
    if (!canvas || stroke.points.length < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = stroke.mode === "erase" ? "#111827" : stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    stroke.points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.stroke();
  };

  useEffect(() => {
    if (remoteStroke) drawStroke(remoteStroke);
  }, [remoteStroke]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [clearSignal]);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw) return;
    drawing.current = true;
    const point = getPoint(event);
    drawStroke({ points: [point, point], color, size, mode });
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !canDraw) return;
    const point = getPoint(event);
    const prev = { x: point.x - 0.5, y: point.y - 0.5 };
    const payload = { points: [prev, point], color, size, mode } satisfies StrokePayload;
    drawStroke(payload);
    onStroke(payload);
  };

  const end = () => {
    drawing.current = false;
  };

  return (
    <div className="rounded-xl bg-black/30 p-3">
      <div className="mb-2 flex flex-wrap gap-2">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-12" />
        <input type="range" min={2} max={20} value={size} onChange={(e) => setSize(Number(e.target.value))} />
        <button className="rounded bg-white/10 px-3" onClick={() => setMode("draw")}>Pencil</button>
        <button className="rounded bg-white/10 px-3" onClick={() => setMode("erase")}>Eraser</button>
        <button className="rounded bg-red-500/80 px-3" onClick={onClear}>Clear</button>
      </div>
      <canvas
        ref={canvasRef}
        width={900}
        height={500}
        className="h-[320px] w-full rounded border border-white/20 bg-gray-900"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
    </div>
  );
}

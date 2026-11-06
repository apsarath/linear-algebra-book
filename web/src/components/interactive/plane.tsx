import { createContext, useCallback, useContext, useRef, type ReactNode } from 'react';
import katex from 'katex';
import { katexMacros } from '../../lib/katex-macros.mjs';

export type Vec = [number, number];

export const COLORS = {
  blue: 'rgb(0 90 160)',
  red: 'rgb(180 30 30)',
  green: 'rgb(0 120 60)',
  orange: 'rgb(210 105 0)',
  purple: 'rgb(100 40 140)',
  gray: '#888',
};

export const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1]];
export const scale = (c: number, a: Vec): Vec => [c * a[0], c * a[1]];
export const norm = (a: Vec) => Math.hypot(a[0], a[1]);

/** Formats a number for display: integers stay integers, others get up to 2 decimals. */
export function fmt(x: number): string {
  const r = Math.round(x * 100) / 100;
  return Object.is(r, -0) ? '0' : String(r);
}

export const texVec = (v: Vec) => `\\colvec{${fmt(v[0])}\\\\${fmt(v[1])}}`;

export function Tex({ children, display = false }: { children: string; display?: boolean }) {
  const html = katex.renderToString(children, { macros: { ...katexMacros }, displayMode: display, throwOnError: false });
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

interface PlaneCtx {
  unit: number;
  toScreen: (p: Vec) => Vec;
  move: (id: string, p: Vec) => void;
  snap: number;
}
const Ctx = createContext<PlaneCtx | null>(null);
const usePlane = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('Plane components must be rendered inside <Plane>');
  return ctx;
};

interface PlaneProps {
  x: [number, number];
  y: [number, number];
  unit?: number;
  children: ReactNode;
  /** Called while a handle is dragged; receives handle id and snapped math coordinates. */
  onDrag?: (id: string, p: Vec) => void;
  snap?: number;
  ariaLabel: string;
}

/** A coordinate grid in math coordinates (y up). Children draw with math coordinates. */
export function Plane({ x, y, unit = 36, children, onDrag, snap = 1, ariaLabel }: PlaneProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<string | null>(null);
  const width = (x[1] - x[0]) * unit;
  const height = (y[1] - y[0]) * unit;
  const toScreen = useCallback((p: Vec): Vec => [(p[0] - x[0]) * unit, (y[1] - p[1]) * unit], [x, y, unit]);

  const clampToGrid = (p: Vec): Vec => {
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
    const snapTo = (v: number) => Math.round(v / snap) * snap;
    return [clamp(snapTo(p[0]), x[0], x[1]), clamp(snapTo(p[1]), y[0], y[1])];
  };

  const toMath = (evt: React.PointerEvent): Vec => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const local = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return clampToGrid([local.x / unit + x[0], y[1] - local.y / unit]);
  };

  const move = (id: string, p: Vec) => onDrag?.(id, clampToGrid(p));

  const xs = [];
  for (let i = Math.ceil(x[0]); i <= x[1]; i++) xs.push(i);
  const ys = [];
  for (let j = Math.ceil(y[0]); j <= y[1]; j++) ys.push(j);
  const [ox, oy] = toScreen([0, 0]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
      style={{ width: '100%', maxWidth: width, display: 'block', margin: '0 auto', touchAction: 'none', userSelect: 'none' }}
      onPointerMove={(e) => {
        if (dragging.current && onDrag) onDrag(dragging.current, toMath(e));
      }}
      onPointerUp={() => (dragging.current = null)}
      onPointerLeave={() => (dragging.current = null)}
      onPointerDown={(e) => {
        const id = (e.target as Element).getAttribute('data-handle');
        if (id) {
          dragging.current = id;
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
        }
      }}
    >
      <g stroke="#e6e6e6" strokeWidth={1}>
        {xs.map((i) => (
          <line key={`x${i}`} x1={(i - x[0]) * unit} y1={0} x2={(i - x[0]) * unit} y2={height} />
        ))}
        {ys.map((j) => (
          <line key={`y${j}`} x1={0} y1={(y[1] - j) * unit} x2={width} y2={(y[1] - j) * unit} />
        ))}
      </g>
      <g stroke="#555" strokeWidth={1.3}>
        <line x1={0} y1={oy} x2={width} y2={oy} />
        <line x1={ox} y1={0} x2={ox} y2={height} />
      </g>
      <g fontSize={11} fill="#888" fontFamily="var(--sans)">
        {xs.filter((i) => i !== 0 && i !== x[0] && i !== x[1]).map((i) => (
          <text key={`tx${i}`} x={(i - x[0]) * unit} y={oy + 14} textAnchor="middle">{i}</text>
        ))}
        {ys.filter((j) => j !== 0 && j !== y[0] && j !== y[1]).map((j) => (
          <text key={`ty${j}`} x={ox - 6} y={(y[1] - j) * unit + 4} textAnchor="end">{j}</text>
        ))}
      </g>
      <Ctx.Provider value={{ unit, toScreen, move, snap }}>{children}</Ctx.Provider>
    </svg>
  );
}

interface ArrowProps {
  from?: Vec;
  to: Vec;
  color: string;
  width?: number;
  opacity?: number;
  dashed?: boolean;
  label?: string;
  /** Label offset in screen pixels */
  labelOffset?: Vec;
  /** Where the label sits along the arrow: 0 = tail, 1 = tip */
  labelAt?: number;
  /** If set, centre the label this many pixels to the left of the arrow's line */
  labelSide?: number;
}

export function Arrow({ from = [0, 0], to, color, width = 2.6, opacity = 1, dashed, label, labelOffset = [8, -8], labelAt = 0.5, labelSide }: ArrowProps) {
  const { toScreen } = usePlane();
  const [x1, y1] = toScreen(from);
  const [x2, y2] = toScreen(to);
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 1) return <circle cx={x1} cy={y1} r={4} fill={color} opacity={opacity} />;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const head = Math.min(13, len * 0.45);
  const bx = x2 - ux * head;
  const by = y2 - uy * head;
  const hw = head * 0.42;
  return (
    <g opacity={opacity}>
      <line x1={x1} y1={y1} x2={bx} y2={by} stroke={color} strokeWidth={width} strokeDasharray={dashed ? '6 5' : undefined} />
      <polygon points={`${x2},${y2} ${bx - uy * hw},${by + ux * hw} ${bx + uy * hw},${by - ux * hw}`} fill={color} />
      {label && (
        <text
          x={x1 + (x2 - x1) * labelAt + (labelSide === undefined ? labelOffset[0] : uy * labelSide)}
          y={y1 + (y2 - y1) * labelAt + (labelSide === undefined ? labelOffset[1] : -ux * labelSide)}
          textAnchor={labelSide === undefined ? undefined : 'middle'}
          dominantBaseline={labelSide === undefined ? undefined : 'central'}
          fill={color}
          fontWeight={700}
          fontSize={15}
          fontFamily="var(--serif)"
          paintOrder="stroke"
          stroke="#fff"
          strokeWidth={4}
        >
          {label}
        </text>
      )}
    </g>
  );
}

interface SegmentProps {
  from: Vec;
  to: Vec;
  color?: string;
  dashed?: boolean;
  width?: number;
  opacity?: number;
}

export function Segment({ from, to, color = '#999', dashed = true, width = 1.5, opacity = 1 }: SegmentProps) {
  const { toScreen } = usePlane();
  const [x1, y1] = toScreen(from);
  const [x2, y2] = toScreen(to);
  return (
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} opacity={opacity} strokeDasharray={dashed ? '5 4' : undefined} />
  );
}

export function Polygon({ points, color, opacity = 0.1 }: { points: Vec[]; color: string; opacity?: number }) {
  const { toScreen } = usePlane();
  return <polygon points={points.map((p) => toScreen(p).join(',')).join(' ')} fill={color} opacity={opacity} />;
}

/** An infinite line through the origin in direction d, clipped to the visible grid. */
export function LineThrough({ d, color, width = 8, opacity = 0.15 }: { d: Vec; color: string; width?: number; opacity?: number }) {
  if (norm(d) < 1e-9) return null;
  const far = scale(100 / norm(d), d);
  return <Segment from={scale(-1, far)} to={far} color={color} dashed={false} width={width} opacity={opacity} />;
}

const KEY_STEPS: Record<string, Vec> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
};

/** A draggable point. Also focusable: arrow keys move it one grid step. */
export function Handle({ id, at, color, label }: { id: string; at: Vec; color: string; label?: string }) {
  const { toScreen, move, snap } = usePlane();
  const [cx, cy] = toScreen(at);
  return (
    <g
      className="handle"
      style={{ cursor: 'grab' }}
      tabIndex={0}
      role="button"
      aria-label={`${label ?? id} at (${fmt(at[0])}, ${fmt(at[1])}); drag or use arrow keys to move`}
      onKeyDown={(e) => {
        const step = KEY_STEPS[e.key];
        if (!step) return;
        e.preventDefault();
        move(id, [at[0] + step[0] * snap, at[1] + step[1] * snap]);
      }}
    >
      <circle cx={cx} cy={cy} r={16} fill="transparent" data-handle={id} />
      <circle cx={cx} cy={cy} r={6.5} fill="#fff" stroke={color} strokeWidth={2.5} data-handle={id} />
      {label && (
        <text x={cx + 10} y={cy - 10} fontSize={12} fill={color} fontFamily="var(--sans)" pointerEvents="none">
          {label}
        </text>
      )}
    </g>
  );
}

export function Dot({ at, color, r = 4, label, labelOffset = [8, 16] }: { at: Vec; color: string; r?: number; label?: string; labelOffset?: Vec }) {
  const { toScreen } = usePlane();
  const [cx, cy] = toScreen(at);
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={color} />
      {label && (
        <text x={cx + labelOffset[0]} y={cy + labelOffset[1]} fontSize={12} fill={color} fontFamily="var(--sans)" paintOrder="stroke" stroke="#fff" strokeWidth={3}>
          {label}
        </text>
      )}
    </g>
  );
}

export function Readout({ children }: { children: ReactNode }) {
  return <div className="readout">{children}</div>;
}

export function Slider({ label, value, min, max, step, onChange }: { label: ReactNode; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="slider">
      <span className="slider-label">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
      <span className="slider-value">{fmt(value)}</span>
    </label>
  );
}

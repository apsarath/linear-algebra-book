import { useRef, useState } from 'react';
import { COLORS, Readout, Slider, Tex, fmt } from './plane';

type V3 = [number, number, number];

const W = 480;
const H = 380;
const UNIT = 42;
const ORIGIN: [number, number] = [W / 2, H * 0.58];
const AXIS = 4;
const DEFAULT_VIEW = { yaw: 25, pitch: 18 };
const LEG = { x: COLORS.red, y: COLORS.green, z: COLORS.orange };

/** b = (b1, b2, b3) with its three legs along x, y, z; drag the scene to rotate it. */
export default function Components3DExplorer() {
  const [b, setB] = useState<V3>([2, 3, 2.5]);
  const [view, setView] = useState(DEFAULT_VIEW);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const yaw = (view.yaw * Math.PI) / 180;
  const pitch = (view.pitch * Math.PI) / 180;
  const project = ([x, y, z]: V3): [number, number] => {
    const across = -x * Math.sin(yaw) + y * Math.cos(yaw);
    const toward = x * Math.cos(yaw) + y * Math.sin(yaw);
    const up = z * Math.cos(pitch) - toward * Math.sin(pitch);
    return [ORIGIN[0] + across * UNIT, ORIGIN[1] - up * UNIT];
  };

  const rotate = (dYaw: number, dPitch: number) =>
    setView((v) => ({ yaw: v.yaw + dYaw, pitch: Math.min(85, Math.max(-5, v.pitch + dPitch)) }));

  const line = (p: V3, q: V3, props: React.SVGProps<SVGLineElement>, key?: string) => {
    const [x1, y1] = project(p);
    const [x2, y2] = project(q);
    return <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} {...props} />;
  };

  const arrow = (to: V3, color: string, width: number) => {
    const [x1, y1] = project([0, 0, 0]);
    const [x2, y2] = project(to);
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 1) return <circle cx={x1} cy={y1} r={4} fill={color} />;
    const ux = (x2 - x1) / len;
    const uy = (y2 - y1) / len;
    const head = Math.min(14, len * 0.45);
    const bx = x2 - ux * head;
    const by = y2 - uy * head;
    const hw = head * 0.42;
    return (
      <g>
        <line x1={x1} y1={y1} x2={bx} y2={by} stroke={color} strokeWidth={width} />
        <polygon points={`${x2},${y2} ${bx - uy * hw},${by + ux * hw} ${bx + uy * hw},${by - ux * hw}`} fill={color} />
      </g>
    );
  };

  const label = (at: V3, text: string, color: string, dx = 6, dy = -6, size = 12) => {
    const [x, y] = project(at);
    return (
      <text x={x + dx} y={y + dy} fill={color} fontSize={size} fontFamily="var(--sans)" paintOrder="stroke" stroke="#fff" strokeWidth={3}>
        {text}
      </text>
    );
  };

  const [b1, b2, b3] = b;
  const p1: V3 = [b1, 0, 0];
  const p2: V3 = [b1, b2, 0];
  const legStyle = { strokeWidth: 1.8, strokeDasharray: '5 4', opacity: 0.8 };
  const grid = [];
  for (let i = -AXIS; i <= AXIS; i++) {
    grid.push(line([i, -AXIS, 0], [i, AXIS, 0], { stroke: '#ececec', strokeWidth: 1 }, `gx${i}`));
    grid.push(line([-AXIS, i, 0], [AXIS, i, 0], { stroke: '#ececec', strokeWidth: 1 }, `gy${i}`));
  }

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        tabIndex={0}
        aria-label="Three-dimensional vector b with its components. Drag or use arrow keys to rotate the view."
        style={{ width: '100%', maxWidth: W, display: 'block', margin: '0 auto', touchAction: 'none', userSelect: 'none', cursor: 'grab' }}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          rotate(-(e.clientX - drag.current.x) * 0.5, (e.clientY - drag.current.y) * 0.4);
          drag.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={() => (drag.current = null)}
        onKeyDown={(e) => {
          const steps: Record<string, [number, number]> = { ArrowLeft: [8, 0], ArrowRight: [-8, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] };
          const s = steps[e.key];
          if (!s) return;
          e.preventDefault();
          rotate(...s);
        }}
      >
        {grid}
        {line([-AXIS, 0, 0], [AXIS, 0, 0], { stroke: '#555', strokeWidth: 1.3 })}
        {line([0, -AXIS, 0], [0, AXIS, 0], { stroke: '#555', strokeWidth: 1.3 })}
        {line([0, 0, -1], [0, 0, AXIS], { stroke: '#555', strokeWidth: 1.3 })}
        {label([AXIS + 0.3, 0, 0], 'x', '#555', -4, 4, 14)}
        {label([0, AXIS + 0.3, 0], 'y', '#555', -4, 4, 14)}
        {label([0, 0, AXIS + 0.3], 'z', '#555', -4, 0, 14)}

        {b1 !== 0 && line([0, 0, 0], p1, { stroke: LEG.x, ...legStyle })}
        {b2 !== 0 && line(p1, p2, { stroke: LEG.y, ...legStyle })}
        {b3 !== 0 && line(p2, b, { stroke: LEG.z, ...legStyle })}
        {b1 !== 0 && label([b1 / 2, 0, 0], `b₁ = ${fmt(b1)}`, LEG.x, -24, 18)}
        {b2 !== 0 && label([b1, b2 / 2, 0], `b₂ = ${fmt(b2)}`, LEG.y, 6, 16)}
        {b3 !== 0 && label([b1, b2, b3 / 2], `b₃ = ${fmt(b3)}`, LEG.z, 8, 4)}

        {arrow(b, COLORS.blue, 3.4)}
        {label(b, 'b', COLORS.blue, 8, -8, 16)}
      </svg>
      <Slider label={<span style={{ color: LEG.x }}><Tex>b_1</Tex></span>} value={b1} min={-4} max={4} step={0.5} onChange={(v) => setB([v, b2, b3])} />
      <Slider label={<span style={{ color: LEG.y }}><Tex>b_2</Tex></span>} value={b2} min={-4} max={4} step={0.5} onChange={(v) => setB([b1, v, b3])} />
      <Slider label={<span style={{ color: LEG.z }}><Tex>b_3</Tex></span>} value={b3} min={-4} max={4} step={0.5} onChange={(v) => setB([b1, b2, v])} />
      <Readout>
        <Tex>{`\\vv{b} = \\colvec{\\color{#b41e1e}{${fmt(b1)}} \\\\ \\color{#00783c}{${fmt(b2)}} \\\\ \\color{#d26900}{${fmt(b3)}}}`}</Tex>
      </Readout>
      <div className="explore-actions">
        <button onClick={() => setView(DEFAULT_VIEW)}>Reset view</button>
      </div>
      <p className="explore-note">
        Drag the picture to rotate it. The tip is reached by walking b₁ along x, then b₂ along y, then b₃ up.
      </p>
    </div>
  );
}

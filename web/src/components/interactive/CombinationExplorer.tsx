import { useState } from 'react';
import { Arrow, COLORS, Dot, Handle, LineThrough, Plane, Readout, Slider, Tex, add, fmt, norm, scale, sub, texVec, type Vec } from './plane';

const det = (u: Vec, v: Vec) => u[0] * v[1] - u[1] * v[0];

/** Choose weights c1, c2 so that c1 u + c2 v hits the target; then make u and v collinear and try again. */
export default function CombinationExplorer() {
  const [u, setU] = useState<Vec>([1, 1]);
  const [v, setV] = useState<Vec>([1, -1]);
  const [target, setTarget] = useState<Vec>([5, 1]);
  const [c1, setC1] = useState(1);
  const [c2, setC2] = useState(1);

  const first = scale(c1, u);
  const result = add(first, scale(c2, v));
  const reached = norm(sub(result, target)) < 0.051;
  const d = det(u, v);
  const collinear = Math.abs(d) < 1e-9;
  const degenerate = norm(u) < 1e-9 && norm(v) < 1e-9;

  const solve = () => {
    if (collinear) return;
    setC1(Math.round(((target[0] * v[1] - target[1] * v[0]) / d) * 100) / 100);
    setC2(Math.round(((u[0] * target[1] - u[1] * target[0]) / d) * 100) / 100);
  };

  const onDrag = (id: string, p: Vec) => {
    if (id === 'u') setU(p);
    if (id === 'v') setV(p);
    if (id === 't') setTarget(p);
  };

  let status: string;
  if (reached) status = 'Reached the target!';
  else if (degenerate) status = 'Both vectors are zero: the only reachable point is the origin.';
  else if (collinear) {
    const dir = norm(u) > 1e-9 ? u : v;
    const onLine = Math.abs(det(dir, target)) < 1e-9;
    status = onLine
      ? 'u and v are collinear. The target is on their line, so it is still reachable.'
      : 'u and v are collinear: every combination stays on the gray line, so this target is unreachable.';
  } else status = 'u and v point in different directions, so every point in the plane is reachable.';

  return (
    <div>
      <Plane x={[-5, 8]} y={[-4, 6]} unit={34} onDrag={onDrag} ariaLabel="Linear combination of two draggable vectors">
        {collinear && !degenerate && <LineThrough d={norm(u) > 1e-9 ? u : v} color={COLORS.gray} width={10} opacity={0.2} />}
        <Arrow to={first} color={COLORS.blue} width={2.6} label={`${fmt(c1)}u`} labelOffset={[-30, -8]} />
        <Arrow from={first} to={result} color={COLORS.red} width={2.6} label={`${fmt(c2)}v`} labelOffset={[8, -8]} />
        <Arrow to={u} color={COLORS.blue} width={1.6} opacity={0.6} />
        <Arrow to={v} color={COLORS.red} width={1.6} opacity={0.6} />
        <Dot at={result} color={COLORS.purple} r={5} />
        <Handle id="t" at={target} color={reached ? COLORS.green : COLORS.orange} label="target" />
        <Handle id="u" at={u} color={COLORS.blue} label="u" />
        <Handle id="v" at={v} color={COLORS.red} label="v" />
      </Plane>
      <Slider label={<Tex>c_1</Tex>} value={c1} min={-5} max={5} step={0.05} onChange={setC1} />
      <Slider label={<Tex>c_2</Tex>} value={c2} min={-5} max={5} step={0.05} onChange={setC2} />
      <div className="explore-actions">
        <button onClick={solve} disabled={collinear}>Solve for c₁, c₂</button>
        <button onClick={() => { setU([2, 1]); setV([4, 2]); }}>Make u and v collinear</button>
        <button onClick={() => { setU([1, 1]); setV([1, -1]); setTarget([5, 1]); setC1(1); setC2(1); }}>Reset</button>
      </div>
      <p className="explore-status" style={{ color: reached ? COLORS.green : collinear ? COLORS.red : 'inherit' }}>{status}</p>
      <Readout>
        <Tex>{`${fmt(c1)}\\,${texVec(u)} + ${fmt(c2)}\\,${texVec(v)} = ${texVec(result)}`}</Tex>
        <Tex>{`\\text{target} = ${texVec(target)}`}</Tex>
      </Readout>
    </div>
  );
}

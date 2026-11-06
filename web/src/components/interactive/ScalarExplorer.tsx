import { useState } from 'react';
import { Arrow, COLORS, Handle, LineThrough, Plane, Readout, Slider, Tex, fmt, scale, texVec, type Vec } from './plane';

function describe(c: number): { text: string; color: string } {
  if (c > 1) return { text: 'c > 1: same direction, longer', color: COLORS.green };
  if (c === 1) return { text: 'c = 1: unchanged', color: COLORS.blue };
  if (c > 0) return { text: '0 < c < 1: same direction, shorter', color: COLORS.orange };
  if (c === 0) return { text: 'c = 0: collapses to the zero vector', color: COLORS.purple };
  return { text: 'c < 0: direction reversed, length scaled by |c|', color: COLORS.red };
}

function lengthText(c: number): string {
  if (c === 0) return 'no length at all';
  const way = c > 0 ? 'same direction as a' : 'opposite direction to a';
  return `${fmt(Math.abs(c))} times as long as a, ${way}`;
}

export default function ScalarExplorer() {
  const [a, setA] = useState<Vec>([2, 1]);
  const [c, setC] = useState(2);
  const ca = scale(c, a);
  const { text, color } = describe(c);

  return (
    <div>
      <Plane x={[-7, 7]} y={[-5, 5]} unit={32} onDrag={(_, p) => setA(p)} ariaLabel="Scalar multiple of a draggable vector">
        <LineThrough d={a} color={COLORS.gray} />
        <Arrow to={ca} color={color} width={3.2} label={`${fmt(c)}a`} labelOffset={[10, 18]} />
        <Arrow to={a} color={COLORS.blue} width={2} opacity={0.55} label="a" labelOffset={[-16, -6]} />
        <Handle id="a" at={a} color={COLORS.blue} />
      </Plane>
      <Slider label={<Tex>c</Tex>} value={c} min={-3} max={3} step={0.1} onChange={(v) => setC(Math.round(v * 10) / 10)} />
      <p className="explore-status" style={{ color }}>{text}</p>
      <Readout>
        <Tex>{`${fmt(c)}\\,${texVec(a)} = ${texVec(ca)}`}</Tex>
        <span>{lengthText(c)}</span>
      </Readout>
      <p className="explore-note">The gray band is the line through the origin along a. Every multiple lands on it.</p>
    </div>
  );
}

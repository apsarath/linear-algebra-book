import { useState } from 'react';
import { Arrow, COLORS, Dot, Handle, Plane, Readout, Segment, Tex, fmt, type Vec } from './plane';

function direction(x: number, pos: string, neg: string): string {
  if (x === 0) return 'no movement';
  return `${Math.abs(x)} ${x > 0 ? pos : neg}`;
}

/** Drag the tip of a vector in standard position; its horizontal and vertical legs are the components. */
export default function ComponentsExplorer() {
  const [a, setA] = useState<Vec>([3, 2]);
  const [a1, a2] = a;
  const corner: Vec = [a1, 0];

  return (
    <div>
      <Plane x={[-6, 6]} y={[-4, 5]} unit={34} onDrag={(_, p) => setA(p)} ariaLabel="A vector in standard position with its components">
        {a1 !== 0 && <Segment from={[0, 0]} to={corner} color={COLORS.red} width={1.8} opacity={0.7} />}
        {a2 !== 0 && <Segment from={corner} to={a} color={COLORS.green} width={1.8} opacity={0.7} />}
        <Arrow to={a} color={COLORS.blue} width={3.4} label="a" labelOffset={a1 * a2 >= 0 ? [-22, -6] : [8, -8]} />
        {a1 !== 0 && (
          <Dot at={[a1 / 2, 0]} color={COLORS.red} r={0} label={`a₁ = ${fmt(a1)}`} labelOffset={[-24, a2 > 0 ? 32 : -8]} />
        )}
        {a2 !== 0 && (
          <Dot at={[a1, a2 / 2]} color={COLORS.green} r={0} label={`a₂ = ${fmt(a2)}`} labelOffset={a1 >= 0 ? [8, 4] : [-58, 4]} />
        )}
        <Handle id="tip" at={a} color={COLORS.blue} />
      </Plane>
      <Readout>
        <Tex>{`\\vv{a} = \\colvec{\\color{#b41e1e}{${fmt(a1)}} \\\\ \\color{#00783c}{${fmt(a2)}}}`}</Tex>
        <span>
          <span style={{ color: COLORS.red }}>horizontal: {direction(a1, 'right', 'left')}</span>
          {' · '}
          <span style={{ color: COLORS.green }}>vertical: {direction(a2, 'up', 'down')}</span>
        </span>
      </Readout>
      <p className="explore-note">Drag the tip. Try putting it left of the y-axis or below the x-axis: negative components mean left or down.</p>
    </div>
  );
}

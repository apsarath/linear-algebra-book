import { useState } from 'react';
import { Arrow, COLORS, Handle, Plane, Polygon, Readout, Segment, Tex, add, sub, texVec, type Vec } from './plane';

type View = 'missing' | 'negative' | 'diagonals';

const VIEWS: { id: View; label: string; note: string }[] = [
  {
    id: 'missing',
    label: 'Missing side',
    note: 'Walk along a, then along b − a, and you arrive at the tip of b: a + (b − a) = b.',
  },
  {
    id: 'negative',
    label: 'Add the negative',
    note: 'Walk along b, then along −a: you land on b − a in standard position. The two green arrows are opposite sides of a parallelogram, so they are the same vector.',
  },
  {
    id: 'diagonals',
    label: 'Two diagonals',
    note: 'The parallelogram on a and b has two diagonals: a + b from the origin, and b − a from the tip of a to the tip of b.',
  },
];

/** Three pictures of b − a that all produce the same green vector. */
export default function SubtractionExplorer() {
  const [a, setA] = useState<Vec>([1, 3]);
  const [b, setB] = useState<Vec>([4, 1]);
  const [view, setView] = useState<View>('missing');
  const d = sub(b, a);
  const sum = add(a, b);

  return (
    <div>
      <div className="segmented" role="radiogroup" aria-label="Picture of b − a">
        {VIEWS.map((v) => (
          <button key={v.id} role="radio" aria-checked={view === v.id} className={view === v.id ? 'on' : ''} onClick={() => setView(v.id)}>
            {v.label}
          </button>
        ))}
      </div>
      <Plane x={[-5, 8]} y={[-4, 7]} onDrag={(id, p) => (id === 'a' ? setA(p) : setB(p))} ariaLabel="Vector subtraction with draggable vectors a and b">
        {view === 'missing' && <Arrow to={d} color={COLORS.green} opacity={0.3} width={2} />}

        {view === 'negative' && (
          <>
            <Polygon points={[[0, 0], d, b, a]} color={COLORS.green} />
            <Arrow from={b} to={d} color={COLORS.blue} width={2} dashed label="−a" labelOffset={[12, 16]} />
            <Arrow to={d} color={COLORS.green} width={3} label="b + (−a)" labelOffset={[0, 26]} />
          </>
        )}

        {view === 'diagonals' && (
          <>
            <Segment from={a} to={sum} />
            <Segment from={b} to={sum} />
            <Arrow to={sum} color={COLORS.purple} width={3} label="a + b" labelOffset={[56, 8]} />
          </>
        )}

        <Arrow to={a} color={COLORS.blue} label="a" labelOffset={[-22, -2]} />
        <Arrow to={b} color={COLORS.red} label="b" labelOffset={[4, 18]} />
        <Arrow from={a} to={b} color={COLORS.green} width={3} label="b − a" labelOffset={[-22, -34]} />
        <Handle id="a" at={a} color={COLORS.blue} />
        <Handle id="b" at={b} color={COLORS.red} />
      </Plane>
      <Readout>
        <Tex>{`\\vv{b} - \\vv{a} = ${texVec(b)} - ${texVec(a)} = ${texVec(d)}`}</Tex>
      </Readout>
      <p className="explore-note">{VIEWS.find((v) => v.id === view)!.note}</p>
    </div>
  );
}

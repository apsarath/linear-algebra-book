import { useState } from 'react';
import { Arrow, COLORS, Handle, Plane, Readout, Segment, Tex, add, texVec, type Vec } from './plane';

type Mode = 'tip-to-tail' | 'parallelogram';

export default function AdditionExplorer() {
  const [a, setA] = useState<Vec>([3, 1]);
  const [b, setB] = useState<Vec>([1, 3]);
  const [mode, setMode] = useState<Mode>('tip-to-tail');
  const sum = add(a, b);

  return (
    <div>
      <div className="segmented" role="radiogroup" aria-label="Addition rule">
        {(['tip-to-tail', 'parallelogram'] as Mode[]).map((m) => (
          <button key={m} role="radio" aria-checked={mode === m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>
            {m === 'tip-to-tail' ? 'Tip-to-tail' : 'Parallelogram'}
          </button>
        ))}
      </div>
      <Plane
        x={[-4, 8]}
        y={[-3, 7]}
        onDrag={(id, p) => (id === 'a' ? setA(p) : setB(p))}
        ariaLabel="Vector addition with draggable vectors a and b"
      >
        {mode === 'tip-to-tail' ? (
          <>
            <Arrow to={b} color={COLORS.red} opacity={0.25} width={2} />
            <Arrow from={a} to={sum} color={COLORS.red} label="b" />
          </>
        ) : (
          <>
            <Segment from={a} to={sum} />
            <Segment from={b} to={sum} />
            <Arrow to={b} color={COLORS.red} label="b" labelOffset={[-18, -6]} />
          </>
        )}
        <Arrow to={sum} color={COLORS.purple} width={3} label="a + b" labelOffset={[-46, -8]} />
        <Arrow to={a} color={COLORS.blue} label="a" labelOffset={[4, 18]} />
        <Handle id="a" at={a} color={COLORS.blue} />
        <Handle id="b" at={b} color={COLORS.red} />
      </Plane>
      <Readout>
        <Tex>{`\\vv{a} + \\vv{b} = ${texVec(a)} + ${texVec(b)} = ${texVec(sum)}`}</Tex>
      </Readout>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Arrow, COLORS, Dot, Handle, Plane, add, fmt, type Vec } from './plane';

const X: [number, number] = [-7, 7];
const Y: [number, number] = [-5, 5];

const randInt = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));

/** Keeps the whole arrow v inside the grid when its tail is at t. */
function clampTail(t: Vec, v: Vec): Vec {
  return [
    Math.min(Math.max(t[0], X[0] - Math.min(0, v[0])), X[1] - Math.max(0, v[0])),
    Math.min(Math.max(t[1], Y[0] - Math.min(0, v[1])), Y[1] - Math.max(0, v[1])),
  ];
}

function newRound(): { v: Vec; start: Vec } {
  for (;;) {
    const v: Vec = [randInt(-4, 4), randInt(-3, 3)];
    if (v[0] * v[0] + v[1] * v[1] < 4) continue;
    const start = clampTail([randInt(X[0], X[1]), randInt(Y[0], Y[1])], v);
    if (Math.hypot(start[0], start[1]) >= 3) return { v, start };
  }
}

/** Drag a randomly placed arrow until its tail sits at the origin. */
export default function StandardPositionQuiz() {
  const [round, setRound] = useState<{ v: Vec; start: Vec }>({ v: [3, 2], start: [-5, 1] });
  const [tail, setTail] = useState<Vec>([-5, 1]);

  useEffect(() => next(), []);

  function next() {
    const r = newRound();
    setRound(r);
    setTail(r.start);
  }

  const { v, start } = round;
  const tip = add(tail, v);
  const done = tail[0] === 0 && tail[1] === 0;

  return (
    <div>
      <Plane x={X} y={Y} unit={32} onDrag={(_, p) => setTail(clampTail(p, v))} ariaLabel="An arrow to drag into standard position">
        {!done && <Dot at={[0, 0]} color={COLORS.orange} r={7} />}
        {done && <Arrow from={start} to={add(start, v)} color={COLORS.blue} width={2} opacity={0.3} dashed />}
        <Arrow from={tail} to={tip} color={done ? COLORS.green : COLORS.blue} label="a" />
        {done && (
          <Dot
            at={tip}
            color={COLORS.green}
            r={0}
            label={`(${fmt(tip[0])}, ${fmt(tip[1])})`}
            labelOffset={[tip[0] < 0 ? -52 : 10, tip[1] < 0 ? 18 : -8]}
          />
        )}
        <Handle id="tail" at={tail} color={done ? COLORS.green : COLORS.blue} />
      </Plane>
      <p className="explore-status" style={{ color: done ? COLORS.green : 'inherit' }}>
        {done ? 'Standard position!' : `The tail is at (${fmt(tail[0])}, ${fmt(tail[1])}). Drag it to the orange dot at the origin.`}
      </p>
      {done && (
        <div className="quiz-feedback right" role="status">
          The tail is at the origin, and the tip has landed at{' '}
          <strong>
            ({fmt(tip[0])}, {fmt(tip[1])})
          </strong>
          . The dashed arrow is where you started: same length, same direction, so it is the same vector. Notice that the
          arrow goes {describe(v)}, and those are exactly the tip's coordinates. In standard position, the tip tells you
          everything about the vector; that's the idea behind the next section.
        </div>
      )}
      <div className="explore-actions">
        <button onClick={next}>{done ? 'Try another →' : 'New arrow'}</button>
      </div>
    </div>
  );
}

function describe(v: Vec): string {
  const parts = [];
  if (v[0] !== 0) parts.push(`${Math.abs(v[0])} ${v[0] > 0 ? 'right' : 'left'}`);
  if (v[1] !== 0) parts.push(`${Math.abs(v[1])} ${v[1] > 0 ? 'up' : 'down'}`);
  return parts.join(' and ');
}

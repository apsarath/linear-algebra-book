import { useEffect, useState } from 'react';
import { Arrow, COLORS, Handle, Plane, add, sub, type Vec } from './plane';

const X: [number, number] = [-7, 7];
const Y: [number, number] = [-5, 5];

interface Puzzle {
  u: Vec;
  v: Vec;
  uTail: Vec;
  vTail: Vec;
}

type Verdict = 'same' | 'longer' | 'shorter' | 'opposite' | 'turned' | 'both';

const randInt = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];
const sq = (a: Vec) => a[0] * a[0] + a[1] * a[1];
const det = (a: Vec, b: Vec) => a[0] * b[1] - a[1] * b[0];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1];
const eq = (a: Vec, b: Vec) => a[0] === b[0] && a[1] === b[1];

function randomVec(): Vec {
  for (;;) {
    const v: Vec = [randInt(-4, 4), randInt(-3, 3)];
    if (sq(v) >= 4) return v;
  }
}

/** Generates v from u so that each kind of answer comes up regularly. */
function partner(u: Vec): Vec {
  const kind = pick(['same', 'same', 'length', 'turned', 'both']);
  if (kind === 'same') return u;
  if (kind === 'length') {
    const g = gcd(Math.abs(u[0]), Math.abs(u[1]));
    const d: Vec = [u[0] / g, u[1] / g];
    const m = pick([1, 2, 3].filter((k) => k !== g && Math.abs(k * d[0]) <= 5 && Math.abs(k * d[1]) <= 4));
    return m ? [m * d[0], m * d[1]] : [-u[0], -u[1]];
  }
  if (kind === 'turned') {
    const [a, b] = u;
    const options: Vec[] = [[-b, a], [b, -a], [b, a], [-a, b], [a, -b], [-a, -b]];
    return pick(options.filter((w) => !eq(w, u) && Math.abs(w[0]) <= 5 && Math.abs(w[1]) <= 4));
  }
  for (;;) {
    const v = randomVec();
    if (sq(v) !== sq(u) && det(u, v) !== 0) return v;
  }
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** A tail position that keeps the whole arrow inside the grid. */
function randomTail(v: Vec): Vec {
  const lo = (min: number, c: number) => Math.ceil(min + 0.5 - Math.min(0, c));
  const hi = (max: number, c: number) => Math.floor(max - 0.5 - Math.max(0, c));
  return [randInt(lo(X[0], v[0]), hi(X[1], v[0])), randInt(lo(Y[0], v[1]), hi(Y[1], v[1]))];
}

function newPuzzle(): Puzzle {
  const u = randomVec();
  const v = partner(u);
  for (;;) {
    const uTail = randomTail(u);
    const vTail = randomTail(v);
    if (Math.hypot(uTail[0] - vTail[0], uTail[1] - vTail[1]) >= 3) return { u, v, uTail, vTail };
  }
}

function verdict(u: Vec, v: Vec): Verdict {
  if (eq(u, v)) return 'same';
  if (det(u, v) === 0 && dot(u, v) > 0) return sq(v) > sq(u) ? 'longer' : 'shorter';
  if (sq(u) === sq(v)) return eq(v, [-u[0], -u[1]]) ? 'opposite' : 'turned';
  return 'both';
}

/** "3 right and 2 up", in grid steps. */
function steps(v: Vec): string {
  const parts = [];
  if (v[0] !== 0) parts.push(`${Math.abs(v[0])} ${v[0] > 0 ? 'right' : 'left'}`);
  if (v[1] !== 0) parts.push(`${Math.abs(v[1])} ${v[1] > 0 ? 'up' : 'down'}`);
  return parts.join(' and ');
}

function explanation(u: Vec, v: Vec): string {
  const moves = `u goes ${steps(u)}; v goes ${steps(v)}.`;
  switch (verdict(u, v)) {
    case 'same':
      return `${moves} Same length and same direction, so they are the same vector. Only their positions differ, and position doesn't matter.`;
    case 'longer':
    case 'shorter': {
      const ratio = Math.sqrt(sq(v) / sq(u));
      const r = Number.isInteger(ratio) ? `${ratio} times as long as` : Number.isInteger(1 / ratio) ? `1/${1 / ratio} as long as` : `${verdict(u, v)} than`;
      return `${moves} They point in the same direction, but v is ${r} u. Different lengths, so they are different vectors.`;
    }
    case 'opposite':
      return `${moves} They have the same length, but v points in exactly the opposite direction. Different directions, so they are different vectors.`;
    case 'turned':
      return `${moves} They have the same length, but they point in different directions. Different directions, so they are different vectors.`;
    case 'both':
      return `${moves} They have different lengths and point in different directions, so they are different vectors.`;
  }
}

/** Two random arrows: decide whether they represent the same vector. */
export default function SameVectorQuiz() {
  const [p, setP] = useState<Puzzle>({ u: [3, 2], v: [3, 2], uTail: [-5, -3], vTail: [1, 0] });
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });

  useEffect(() => setP(newPuzzle()), []);

  const same = eq(p.u, p.v);
  const answered = answer !== null;
  const correct = answered && answer === same;
  const stacked = eq(p.uTail, p.vTail);

  const onDrag = (id: string, at: Vec) => {
    const isU = id === 'tail of u';
    const v = isU ? p.u : p.v;
    const clamped: Vec = [
      Math.min(Math.max(at[0], X[0] - Math.min(0, v[0])), X[1] - Math.max(0, v[0])),
      Math.min(Math.max(at[1], Y[0] - Math.min(0, v[1])), Y[1] - Math.max(0, v[1])),
    ];
    setP((q) => (isU ? { ...q, uTail: clamped } : { ...q, vTail: clamped }));
  };

  const choose = (saysSame: boolean) => {
    if (answered) return;
    setAnswer(saysSame);
    setScore((s) => ({ right: s.right + (saysSame === same ? 1 : 0), total: s.total + 1 }));
  };

  const next = () => {
    setP(newPuzzle());
    setAnswer(null);
  };

  const uTip = add(p.uTail, p.u);
  const vTip = add(p.vTail, p.v);
  const tipsMeet = eq(add(p.uTail, p.v), uTip);

  return (
    <div>
      <Plane x={X} y={Y} unit={32} onDrag={onDrag} ariaLabel="Two arrows u and v; decide whether they are the same vector">
        <Arrow from={p.uTail} to={uTip} color={COLORS.blue} label="u" />
        <Arrow from={p.vTail} to={vTip} color={COLORS.red} label="v" opacity={stacked ? 0.75 : 1} labelOffset={stacked ? [-18, 20] : undefined} />
        {answered && !stacked && (
          <Arrow from={p.uTail} to={add(p.uTail, p.v)} color={COLORS.red} width={2} opacity={0.7} dashed />
        )}
        <Handle id="tail of u" at={p.uTail} color={COLORS.blue} />
        <Handle id="tail of v" at={p.vTail} color={COLORS.red} />
      </Plane>
      <p className="explore-note">
        {stacked
          ? tipsMeet
            ? 'Tails together, and the tips meet.'
            : 'Tails together, and the tips land in different places.'
          : 'Drag either tail to slide that arrow. Put the tails together and see whether the tips meet.'}
      </p>
      <div className="explore-actions">
        <button onClick={() => choose(true)} disabled={answered}>Same vector</button>
        <button onClick={() => choose(false)} disabled={answered}>Different vectors</button>
        <button onClick={next}>{answered ? 'Next pair →' : 'New pair'}</button>
      </div>
      {answered && (
        <div className={`quiz-feedback ${correct ? 'right' : 'wrong'}`} role="status">
          <strong>{correct ? 'Correct!' : 'Not quite.'}</strong>{' '}
          {same ? 'They are the same vector.' : 'They are different vectors.'} {explanation(p.u, p.v)}
          {!stacked && ' The dashed arrow shows v slid onto the tail of u.'}
        </div>
      )}
      {score.total > 0 && (
        <p className="explore-note">
          Score: {score.right} / {score.total}
        </p>
      )}
    </div>
  );
}

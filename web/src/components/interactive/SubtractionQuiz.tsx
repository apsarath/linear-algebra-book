import { useEffect, useState } from 'react';
import { Arrow, COLORS, Plane, add, fmt, norm, sub, type Vec } from './plane';

const LETTERS = ['P', 'Q', 'R', 'S'];

type Kind = 'correct' | 'negative-a' | 'sum' | 'reversed-origin';

interface Candidate {
  kind: Kind;
  from: Vec;
  to: Vec;
}

interface Round {
  a: Vec;
  b: Vec;
  candidates: Candidate[];
}

const randInt = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));

function randomVec(): Vec {
  for (;;) {
    const v: Vec = [randInt(-4, 4), randInt(-4, 4)];
    if (norm(v) >= 2.5) return v;
  }
}

/** Far enough from parallel (at least 30°) that the four candidates spread out. */
function wellSeparated(a: Vec, b: Vec): boolean {
  const sin = Math.abs(a[0] * b[1] - a[1] * b[0]) / (norm(a) * norm(b));
  return sin >= 0.5 && norm(sub(b, a)) >= 3;
}

function shuffle<T>(xs: T[]): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function makeRound(a: Vec, b: Vec, order: Kind[]): Round {
  const all: Record<Kind, Candidate> = {
    correct: { kind: 'correct', from: a, to: b },
    'negative-a': { kind: 'negative-a', from: b, to: sub(b, a) },
    sum: { kind: 'sum', from: [0, 0], to: add(a, b) },
    'reversed-origin': { kind: 'reversed-origin', from: [0, 0], to: sub(a, b) },
  };
  return { a, b, candidates: order.map((k) => all[k]) };
}

function newRound(): Round {
  for (;;) {
    const a = randomVec();
    const b = randomVec();
    if (wellSeparated(a, b)) return makeRound(a, b, shuffle(['correct', 'negative-a', 'sum', 'reversed-origin']));
  }
}

function explain(kind: Kind, a: Vec, b: Vec): string {
  const d = sub(b, a);
  switch (kind) {
    case 'correct':
      return 'This arrow runs from the tip of a to the tip of b. It is what you add to a to reach b, so it is b − a.';
    case 'negative-a':
      return 'This arrow is −a (a flipped around), attached to the tip of b. It is one step of the construction b + (−a), not the difference itself: b − a runs from the origin to where this arrow ends.';
    case 'sum':
      return 'This arrow is a + b, the diagonal of the parallelogram that starts at the origin.';
    case 'reversed-origin':
      return `This arrow is a − b in standard position, so it points the wrong way. The standard-position copy of b − a would end at (${fmt(d[0])}, ${fmt(d[1])}).`;
  }
}

/** Pick which of four arrows is b − a. */
export default function SubtractionQuiz() {
  const [round, setRound] = useState<Round>(() => makeRound([1, 3], [4, 1], ['negative-a', 'sum', 'correct', 'reversed-origin']));
  const [choice, setChoice] = useState<number | null>(null);

  useEffect(() => setRound(newRound()), []);

  const { a, b, candidates } = round;
  const answered = choice !== null;
  const correctIndex = candidates.findIndex((c) => c.kind === 'correct');
  const right = choice === correctIndex;

  const colorOf = (i: number) => {
    if (!answered) return '#555';
    if (i === correctIndex) return COLORS.green;
    if (i === choice) return COLORS.orange;
    return '#bbb';
  };

  return (
    <div>
      <Plane x={[-8, 8]} y={[-8, 8]} unit={26} ariaLabel="Vectors a and b with four candidate arrows labelled P to S">
        <Arrow to={a} color={COLORS.blue} label="a" labelAt={0.45} labelSide={-14} />
        <Arrow to={b} color={COLORS.red} label="b" labelAt={0.45} labelSide={-14} />
        {candidates.map((c, i) => (
          <Arrow key={i} from={c.from} to={c.to} color={colorOf(i)} width={2.4} dashed={!answered} label={LETTERS[i]} labelAt={0.72} labelSide={14} />
        ))}
      </Plane>
      <div className="explore-actions">
        {LETTERS.map((l, i) => (
          <button key={l} onClick={() => setChoice(i)} disabled={answered}>
            {l}
          </button>
        ))}
        <button onClick={() => { setRound(newRound()); setChoice(null); }}>{answered ? 'Next →' : 'New vectors'}</button>
      </div>
      {answered && (
        <div className={`quiz-feedback ${right ? 'right' : 'wrong'}`} role="status">
          <strong>{right ? 'Correct!' : 'Not quite.'}</strong> {explain(candidates[choice].kind, a, b)}
          {!right && <> The answer is {LETTERS[correctIndex]}: {explain('correct', a, b)}</>}
        </div>
      )}
    </div>
  );
}

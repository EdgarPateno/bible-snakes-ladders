import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/** Which 3×3 cells (1-9, row-major) hold a pip on each face. */
const PIPS: Record<number, number[]> = {
  1: [5],
  2: [3, 7],
  3: [3, 5, 7],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 4, 7, 3, 6, 9],
};

/** Cube rotation (x, y) that brings each face to the front. */
const FACE_ROT: Record<number, [number, number]> = {
  1: [0, 0],
  2: [-90, 0],
  3: [0, -90],
  4: [0, 90],
  5: [90, 0],
  6: [0, 180],
};

/** Where each face sits on the cube. */
const FACE_PLACE: Record<number, string> = {
  1: 'rotateY(0deg)',
  6: 'rotateY(180deg)',
  3: 'rotateY(90deg)',
  4: 'rotateY(-90deg)',
  2: 'rotateX(90deg)',
  5: 'rotateX(-90deg)',
};

function Face({ n, half }: { n: number; half: number }) {
  return (
    <div className="die-face" style={{ transform: `${FACE_PLACE[n]} translateZ(${half}px)` }}>
      {PIPS[n].map((cell) => (
        <span key={cell} className="pip" style={{ gridRow: Math.ceil(cell / 3), gridColumn: ((cell - 1) % 3) + 1 }} />
      ))}
    </div>
  );
}

interface DiceProps {
  value: number | null;
  rolling: boolean;
  onLanded: () => void;
  size?: number;
}

export function Dice({ value, rolling, onLanded, size = 96 }: DiceProps) {
  const reduced = useReducedMotion();
  const [rot, setRot] = useState<{ x: number; y: number }>({ x: -18, y: 24 });
  const landedRef = useRef(onLanded);
  landedRef.current = onLanded;

  useEffect(() => {
    if (!rolling || !value) return;
    const [fx, fy] = FACE_ROT[value];
    setRot((prev) => {
      const spinsX = 360 * (2 + Math.floor(Math.random() * 2));
      const spinsY = 360 * (2 + Math.floor(Math.random() * 2));
      const baseX = Math.ceil(prev.x / 360) * 360;
      const baseY = Math.ceil(prev.y / 360) * 360;
      return { x: baseX + spinsX + fx, y: baseY + spinsY + fy };
    });
  }, [rolling, value]);

  const half = size / 2;
  return (
    <div className="die-scene grid place-items-center" style={{ width: size * 1.5, height: size * 1.5 }}>
      <motion.div
        className="die relative"
        style={{ width: size, height: size }}
        initial={false}
        animate={{ rotateX: rot.x, rotateY: rot.y, y: rolling && !reduced ? [0, -size * 0.5, 0, -size * 0.18, 0] : 0 }}
        transition={{ duration: reduced ? 0.3 : 1.5, ease: [0.2, 0.75, 0.25, 1] }}
        onAnimationComplete={() => {
          if (rolling) landedRef.current();
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <Face key={n} n={n} half={half} />
        ))}
      </motion.div>
      <span className="sr-only" aria-live="polite">
        {rolling ? 'Rolling the die' : value ? `Rolled ${value}` : ''}
      </span>
    </div>
  );
}

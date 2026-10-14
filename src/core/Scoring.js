import { DIRECTIONS, WILD } from './constants.js';

export { DIRECTIONS };

export function lineMultiplierFor(length, cfg) {
  return cfg.lineMultiplier?.[length] ?? length;
}

function collectRun(board, r, c, dr, dc, el) {
  const match = (rr, cc) => {
    const e = board.elementAt(rr, cc);
    return e === el || e === WILD;
  };
  let sr = r;
  let sc = c;
  while (match(sr - dr, sc - dc)) {
    sr -= dr;
    sc -= dc;
  }
  const cells = [];
  for (let rr = sr, cc = sc; match(rr, cc); rr += dr, cc += dc) cells.push([rr, cc]);
  return cells;
}

/**
 * 이번 턴 배치 결과의 속성별 데미지 배율 계산
 * - 배치한 블록 1개 = singleMultiplier (기본 x1)
 * - 배치한 블록을 지나는 같은 속성 라인(minLine 이상) = lineMultiplier[길이]
 * - 같은 속성 라인이 여러 개면 합산 (기획서: 물 x3 + 물 x4 = x7)
 * - 동일 라인은 한 번만 계산
 *
 * @returns {{byElement: Record<string, number>, lines: object[], singles: object[], total: number}}
 */
export function scoreTurn(board, placements, cfg) {
  const byElement = {};
  const lines = [];
  const singles = [];
  const seen = new Set();
  const add = (el, m) => (byElement[el] = (byElement[el] ?? 0) + m);

  for (const p of placements) {
    const el = board.elementAt(p.r, p.c);
    if (!el || el === WILD) continue;
    let inLine = false;
    for (const dirName of cfg.directions) {
      const dir = DIRECTIONS[dirName];
      if (!dir) continue;
      const cells = collectRun(board, p.r, p.c, dir[0], dir[1], el);
      if (cells.length < cfg.minLine) continue;
      inLine = true;
      const key = `${dirName}:${cells.map((x) => x.join(',')).join('|')}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const multiplier = lineMultiplierFor(cells.length, cfg);
      lines.push({ element: el, direction: dirName, cells, length: cells.length, multiplier });
      add(el, multiplier);
    }
    if (!inLine || cfg.singleAlsoWhenInLine) {
      singles.push({ element: el, cell: [p.r, p.c], multiplier: cfg.singleMultiplier });
      add(el, cfg.singleMultiplier);
    }
  }
  const total = Object.values(byElement).reduce((a, b) => a + b, 0);
  return { byElement, lines, singles, total };
}

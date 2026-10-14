/**
 * 배치 규칙 레지스트리
 * ------------------------------------------------------------
 * SYMMETRY[name](board, r, c) → 직전 블록 위치(r,c)에 대응하는 다음 블록 위치 [r, c]
 * null 이면 자유 배치. registerSymmetry 로 프로젝트별 규칙을 추가할 수 있습니다.
 */
export const SYMMETRY = {
  /** 보드 중심 기준 점대칭 (기획서 기본) */
  point: (b, r, c) => [b.rows - 1 - r, b.cols - 1 - c],
  /** 좌우 대칭 */
  mirrorH: (b, r, c) => [r, b.cols - 1 - c],
  /** 상하 대칭 */
  mirrorV: (b, r, c) => [b.rows - 1 - r, c],
  /** 자유 배치 */
  free: null,
};

export function registerSymmetry(name, fn) {
  SYMMETRY[name] = fn;
}

/**
 * 현재 배치 가능한 칸 목록
 * @param {import('./Board.js').Board} board
 * @param {{r:number,c:number}[]} placements 이번 턴에 이미 놓은 블록
 * @param {{rule:string, fallback:'free'|'skip'}} rule rules.placement
 * @returns {{cells: [number, number][], forced: boolean}} forced = 대칭 규칙으로 위치가 강제됨
 */
export function allowedCells(board, placements, rule) {
  const empties = board.emptyCells();
  if (placements.length === 0) return { cells: empties, forced: false };
  const fn = SYMMETRY[rule.rule];
  if (!fn) return { cells: empties, forced: false };
  const last = placements[placements.length - 1];
  const [tr, tc] = fn(board, last.r, last.c);
  if (board.isEmpty(tr, tc)) return { cells: [[tr, tc]], forced: true };
  return { cells: rule.fallback === 'free' ? empties : [], forced: false };
}

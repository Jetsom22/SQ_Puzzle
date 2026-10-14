/** 만능(와일드) 블록 속성 값 — 모든 속성 라인에 포함됨 */
export const WILD = '*';

/** 라인 판정 방향 레지스트리 [dr, dc] — 새 방향이 필요하면 여기에 추가 */
export const DIRECTIONS = {
  horizontal: [0, 1],
  vertical: [1, 0],
  diagonal: [1, 1],
  antiDiagonal: [1, -1],
};

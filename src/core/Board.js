import { DIRECTIONS, WILD } from './constants.js';

export { WILD };

/**
 * 퍼즐 보드 모델 (DOM 비의존)
 * cell = { void: boolean, block: null | { element, placed?: boolean, fixed?: boolean } }
 */
export class Board {
  /**
   * @param {object} o
   * @param {{rows: string[]}} o.layout   boards.js 레이아웃
   * @param {import('./ElementSystem.js').ElementSystem} o.elements
   * @param {import('./Rng.js').Rng} o.rng
   * @param {number} [o.minLine]          초기 라인 방지용
   * @param {boolean} [o.avoidInitialLines]
   */
  constructor({ layout, elements, rng, minLine = 3, avoidInitialLines = true }) {
    this.layout = layout;
    this.elements = elements;
    this.rng = rng;
    this.minLine = minLine;
    this.avoidInitialLines = avoidInitialLines;
    this.rows = layout.rows.length;
    this.cols = layout.rows[0].length;
    this.reset();
  }

  reset() {
    const randoms = [];
    this.cells = this.layout.rows.map((row, r) =>
      [...row].map((ch, c) => {
        if (ch === '#') return { void: true, block: null };
        if (ch === '.') return { void: false, block: null };
        if (ch === '?') {
          randoms.push([r, c]);
          return { void: false, block: null };
        }
        if (ch === WILD) return { void: false, block: { element: WILD, fixed: true } };
        const el = this.elements.byKey.get(ch);
        if (!el) throw new Error(`알 수 없는 레이아웃 기호 '${ch}'`);
        return { void: false, block: { element: el, fixed: true } };
      }),
    );
    for (const [r, c] of randoms) this.cells[r][c].block = { element: this.#pickInitial(r, c) };
  }

  #pickInitial(r, c) {
    const ids = this.elements.ids;
    if (!this.avoidInitialLines) return this.rng.pick(ids);
    const safe = this.rng.shuffle(ids).filter((el) => {
      this.cells[r][c].block = { element: el };
      const ok = Object.values(DIRECTIONS).every(([dr, dc]) => this.runLength(r, c, dr, dc, el) < this.minLine);
      this.cells[r][c].block = null;
      return ok;
    });
    return safe[0] ?? this.rng.pick(ids);
  }

  inBounds(r, c) {
    return r >= 0 && c >= 0 && r < this.rows && c < this.cols;
  }

  cell(r, c) {
    return this.inBounds(r, c) ? this.cells[r][c] : undefined;
  }

  isPlayable(r, c) {
    const cell = this.cell(r, c);
    return !!cell && !cell.void;
  }

  isEmpty(r, c) {
    const cell = this.cell(r, c);
    return !!cell && !cell.void && !cell.block;
  }

  elementAt(r, c) {
    return this.cell(r, c)?.block?.element ?? null;
  }

  emptyCells() {
    const out = [];
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) if (this.isEmpty(r, c)) out.push([r, c]);
    return out;
  }

  filledCells() {
    const out = [];
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++) if (this.cells[r][c].block) out.push([r, c]);
    return out;
  }

  isFull() {
    return this.emptyCells().length === 0;
  }

  place(r, c, element) {
    if (!this.isEmpty(r, c)) throw new Error(`(${r},${c}) 에 배치할 수 없음`);
    this.cells[r][c].block = { element, placed: true };
  }

  remove(r, c) {
    if (this.cells[r]?.[c]) this.cells[r][c].block = null;
  }

  setElement(r, c, element) {
    const cell = this.cell(r, c);
    if (cell?.block) cell.block = { ...cell.block, element };
  }

  /** (r,c) 를 지나는 dr,dc 방향의 같은 속성(만능 포함) 연속 길이 */
  runLength(r, c, dr, dc, el) {
    const match = (rr, cc) => {
      const e = this.elementAt(rr, cc);
      return e === el || e === WILD;
    };
    let n = 1;
    for (let k = 1; match(r + dr * k, c + dc * k); k++) n++;
    for (let k = 1; match(r - dr * k, c - dc * k); k++) n++;
    return n;
  }

  /** 시뮬레이션용 복제 (레이아웃/난수는 공유) */
  clone() {
    const b = Object.create(Board.prototype);
    Object.assign(b, this);
    b.cells = this.cells.map((row) => row.map((cell) => ({ void: cell.void, block: cell.block ? { ...cell.block } : null })));
    return b;
  }
}

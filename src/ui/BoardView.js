import { h } from './dom.js';
import { iconSvg } from './icons.js';
import { WILD } from '../core/constants.js';

/** 퍼즐 보드 + 손패 */
export class BoardView {
  constructor(app) {
    this.app = app;
    this.el = h('section', { class: 'panel board-panel', 'aria-label': '퍼즐 보드' });
    this.boardEl = h('div', { class: 'board' });
    this.handEl = h('div', { class: 'hand' });
    this.countEl = h('div', { class: 'place-count' });
    this.msgEl = h('div', { class: 'phase-msg' });
    this.undoBtn = h('button', { class: 'btn', onClick: () => app.undo() }, '되돌리기 ', h('kbd', {}, 'Z'));
    this.hintBtn = h('button', { class: 'btn', onClick: () => app.showHint() }, '추천 수 ', h('kbd', {}, 'H'));
    this.el.append(
      h('div', { class: 'board-wrap' }, this.boardEl),
      h('div', { class: 'hand-row' }, this.countEl, this.handEl, h('div', { class: 'hand-actions' }, this.hintBtn, this.undoBtn), this.msgEl),
    );
    this.cellEls = [];
    this.hover = null;
    this.hint = null;
    this.fresh = new Set();
    this.boardEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      app.undo();
    });
  }

  get battle() {
    return this.app.battle;
  }

  gem(element, extra = '') {
    if (element === WILD) return h('div', { class: `gem wild ${extra}`, html: iconSvg('wild') });
    const el = this.battle.elements.get(element);
    return h('div', { class: `gem ${extra}`, '--c': el.color, html: iconSvg(el.icon) });
  }

  render() {
    const b = this.battle;
    const board = b.board;
    const size = Math.floor((600 - (Math.max(board.rows, board.cols) - 1) * 8) / Math.max(board.rows, board.cols));
    this.boardEl.style.setProperty('--cols', board.cols);
    this.boardEl.style.setProperty('--cell', `${Math.min(size, 112)}px`);

    const { cells: allowed, forced } = b.allowedCells();
    const allowedSet = new Set(allowed.map(([r, c]) => `${r},${c}`));
    const placedSet = new Set(b.placements.map((p) => `${p.r},${p.c}`));
    const sel = this.app.selected;
    const ghostEl = sel != null && b.hand[sel] ? b.hand[sel].element : null;

    this.boardEl.querySelectorAll('.cell').forEach((n) => n.remove());
    this.cellEls = [];
    for (let r = 0; r < board.rows; r++) {
      const row = [];
      for (let c = 0; c < board.cols; c++) {
        const cell = board.cell(r, c);
        const key = `${r},${c}`;
        const cls = ['cell'];
        if (cell.void) cls.push('void');
        else if (allowedSet.has(key)) cls.push(forced ? 'forced' : 'allowed');
        else if (b.isInput && b.placements.length && !cell.block && forced) cls.push('dimmed');
        if (placedSet.has(key)) cls.push('placed');
        if (this.hint && this.hint.r === r && this.hint.c === c) cls.push('hint');
        const node = h('div', { class: cls.join(' '), 'data-r': r, 'data-c': c });
        if (cell.block) node.append(this.gem(cell.block.element, this.fresh.has(key) ? 'placed-now' : ''));
        else if (allowedSet.has(key)) {
          node.addEventListener('click', () => this.app.placeAt(r, c));
          node.addEventListener('mouseenter', () => this.#hover(r, c, node, ghostEl));
          node.addEventListener('mouseleave', () => this.#hover(null));
        }
        row.push(node);
        this.boardEl.append(node);
      }
      this.cellEls.push(row);
    }
    this.fresh.clear();
    this.renderHand();
  }

  #hover(r, c, node, element) {
    this.boardEl.querySelectorAll('.gem.ghost').forEach((g) => g.remove());
    if (r == null || !element) {
      this.app.side.preview(null);
      return;
    }
    node.append(this.gem(element, 'ghost'));
    this.app.side.preview(this.app.previewWith(r, c, element));
  }

  renderHand() {
    const b = this.battle;
    const per = b.rules.placement.perTurn;
    this.countEl.replaceChildren(
      h('span', { class: 'k' }, 'PLACE'),
      h('div', { class: 'dots' }, Array.from({ length: per }, (_, i) => h('i', { class: i < b.placements.length ? 'on' : '' }))),
    );
    this.handEl.replaceChildren(
      ...b.hand.map((blk, i) => {
        const cls = ['hand-slot'];
        if (!blk) cls.push('empty');
        if (this.app.selected === i) cls.push('selected');
        if (this.hint && this.hint.handIndex === i) cls.push('hint');
        const slot = h('div', { class: cls.join(' '), 'data-hand': i }, blk ? this.gem(blk.element) : null, h('span', { class: 'kbd key' }, i + 1));
        if (blk) slot.addEventListener('pointerdown', (e) => this.app.beginDrag(e, i, slot));
        return slot;
      }),
    );
    this.undoBtn.disabled = !(b.isInput && b.placements.length && b.rules.placement.allowUndo);
    this.undoBtn.style.opacity = this.undoBtn.disabled ? 0.45 : 1;
    this.msgEl.textContent = this.message();
  }

  message() {
    const b = this.battle;
    if (b.phase === 'resolve') return '공격 중…';
    if (b.phase === 'enemy') return '몬스터 행동 중…';
    if (!b.isInput) return '';
    const { forced } = b.allowedCells();
    if (forced) return '두 번째 블록은 대칭 위치(노란 칸)에만 놓을 수 있습니다';
    if (b.placements.length) return '대칭 위치가 막혀 있어 아무 빈칸에나 놓을 수 있습니다';
    return this.app.selected != null ? '빈칸을 클릭해 블록을 놓으세요' : '손패 블록을 고르거나 보드로 끌어다 놓으세요';
  }

  cellAt(r, c) {
    return this.cellEls[r]?.[c];
  }

  async flashLines(score, fx) {
    for (const line of score.lines) {
      const color = this.battle.elements.get(line.element).color;
      for (const [r, c] of line.cells) fx.replay(this.cellAt(r, c)?.querySelector('.gem'), 'flash');
      const first = line.cells[0];
      const last = line.cells[line.cells.length - 1];
      fx.ray(this.boardEl, this.cellAt(...first), this.cellAt(...last), color, `x${line.multiplier}`);
      await fx.wait(380);
    }
    for (const s of score.singles) fx.replay(this.cellAt(...s.cell)?.querySelector('.gem'), 'flash');
  }
}

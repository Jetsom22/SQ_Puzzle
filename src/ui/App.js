import { GAME_DATA, DEFAULT_RULES } from '../config/index.js';
import { Battle } from '../core/Battle.js';
import { findBestMove, shouldUseSkill } from '../core/AutoPlayer.js';
import { scoreTurn } from '../core/Scoring.js';
import { clone } from '../core/util.js';
import { h, sleep } from './dom.js';
import { Fx } from './Fx.js';
import { HudView } from './HudView.js';
import { SceneView } from './SceneView.js';
import { BoardView } from './BoardView.js';
import { SidePanel } from './SidePanel.js';
import { resultOverlay, devOverlay } from './Overlays.js';

const STORE_KEY = 'sqh-proto-settings-v1';
const SPEEDS = [1, 2, 4];

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) ?? {};
  } catch {
    return {};
  }
}
function saveSettings(s) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {
    /* 저장 불가 환경은 무시 */
  }
}

/**
 * 화면 조립 + 입력 + 전투 이벤트 → 연출 연결.
 * 로직은 전부 core/Battle 에 있고, 여기서는 이벤트를 받아 그리기만 합니다.
 */
export class App {
  constructor(root) {
    this.root = root;
    this.skillKeys = ['q', 'w', 'e', 'r', 't'];
    this.settings = loadSettings();
    this.stageId = this.settings.stageId && GAME_DATA.stages[this.settings.stageId] ? this.settings.stageId : Object.keys(GAME_DATA.stages)[0];
    this.auto = false;
    this.selected = null;
    this.busy = false;

    root.replaceChildren();
    this.fx = new Fx(root);
    this.fx.speed = SPEEDS.includes(this.settings.speed) ? this.settings.speed : 1;
    this.hud = new HudView(this);
    this.scene = new SceneView(this);
    this.boardView = new BoardView(this);
    this.side = new SidePanel(this);
    root.prepend(this.hud.el, h('main', { class: 'main' }, this.scene.el, this.boardView.el, this.side.el));
    this.#applySpeedVar();

    window.addEventListener('keydown', (e) => this.onKey(e));
    this.restart();
  }

  // ───────────── 전투 생성 ─────────────
  restart() {
    this.overlay?.remove();
    this.overlay = null;
    this.selected = null;
    this.boardView.hint = null;
    const rules = this.settings.rules ? clone(this.settings.rules) : clone(DEFAULT_RULES);
    const data = { ...GAME_DATA, elementChart: this.settings.chart ?? GAME_DATA.elementChart };
    this.battle = new Battle({ data, rules, stageId: this.stageId, seed: this.settings.seed ?? undefined });
    this.#bind(this.battle.bus);
    this.side.build();
    this.battle.start().then(() => this.#maybeAuto());
  }

  #bind(bus) {
    const b = () => this.battle;
    const fx = this.fx;
    const color = (el) => b().elements.get(el)?.color ?? '#fff';
    const refresh = () => {
      this.hud.update();
      this.scene.update();
      this.boardView.render();
    };

    bus.on('log', ({ text, kind }) => this.side.log(text, kind));
    bus.on('phase', () => refresh());
    bus.on('waveStart', async ({ index }) => {
      this.scene.buildEnemies();
      if (!this.scene.unitNodes.size) this.scene.buildTeam();
      this.hud.update();
      await fx.banner(`WAVE ${index + 1}`, index + 1 === b().waveCount ? 'FINAL' : `${b().waveCount} 웨이브 중`, { top: 30, hold: 900 });
    });
    bus.on('turnStart', () => {
      this.scene.showMultipliers(null);
      this.side.preview(null);
      refresh();
    });
    bus.on('placed', ({ r, c }) => {
      this.boardView.fresh.add(`${r},${c}`);
      this.selected = null;
      this.boardView.hint = null;
      this.side.preview(null);
      refresh();
    });
    bus.on('undo', () => {
      this.side.preview(null);
      refresh();
    });
    bus.on('focus', () => this.scene.update());
    bus.on('score', async ({ score }) => {
      this.boardView.render();
      this.side.preview(score, '이번 턴 결과');
      this.scene.showMultipliers(score.byElement);
      const parts = Object.entries(score.byElement).map(([el, m]) => `${b().elements.get(el).name} x${m}`);
      this.side.log(`배율 — ${parts.join(', ') || '없음'}${score.lines.length ? ` (라인 ${score.lines.length}개)` : ''}`, 'score');
      await this.boardView.flashLines(score, fx);
      await fx.wait(250);
    });
    bus.on('attackStart', async ({ unit }) => {
      fx.replay(this.scene.unitNode(unit), 'lunge');
      await fx.wait(120);
    });
    bus.on('damage', async ({ attacker, defender, amount, relation, element }) => {
      const from = this.scene.nodeOf(attacker);
      const to = this.scene.nodeOf(defender);
      if (attacker.side === 'enemy') fx.replay(this.scene.enemyNodes.get(attacker)?.node, 'lunge');
      await fx.shot(from, to, color(element));
      fx.replay(to, 'hit');
      fx.number(to, amount.toLocaleString(), {
        color: color(element),
        note: relation > 0 ? '유리 ▲' : relation < 0 ? '불리 ▼' : null,
        noteClass: relation < 0 ? 'resist' : '',
        cls: defender.side === 'player' ? 'small' : '',
      });
      this.scene.update();
      await fx.wait(170);
    });
    bus.on('heal', async ({ unit, amount }) => {
      if (amount > 0) fx.number(this.scene.nodeOf(unit), `+${amount}`, { cls: 'heal small' });
      this.scene.update();
      await fx.wait(120);
    });
    bus.on('revive', () => this.scene.update());
    bus.on('death', async () => {
      this.scene.update();
      await fx.wait(300);
    });
    bus.on('status', () => this.scene.update());
    bus.on('skillStart', async ({ unit, skill }) => {
      this.scene.update();
      await fx.banner(skill.name, unit.name, { kind: 'skill', top: 40, hold: 850 });
    });
    bus.on('skillEnd', () => refresh());
    bus.on('enemyAction', async ({ unit, skill }) => {
      fx.replay(this.scene.enemyNodes.get(unit)?.node, 'lunge');
      if (skill.effects.some((e) => e.type !== 'damage') || skill.effects.length > 1)
        await fx.banner(skill.name, unit.name, { kind: 'enemy', top: 40, hold: 750 });
      else await fx.wait(200);
    });
    bus.on('boardChanged', async () => {
      this.boardView.render();
      this.boardEl()?.querySelectorAll('.gem').forEach((g) => fx.replay(g, 'converted'));
      await fx.wait(400);
    });
    bus.on('handChanged', () => this.boardView.renderHand());
    bus.on('boardReset', async () => {
      this.boardView.render();
      this.boardEl()?.querySelectorAll('.gem').forEach((g) => fx.replay(g, 'placed-now'));
      await fx.banner('BOARD RESET', '보드가 가득 차 새로 채워집니다', { top: 50, hold: 700 });
    });
    bus.on('waveClear', async () => {
      await fx.wait(250);
    });
    bus.on('end', async () => {
      refresh();
      this.auto = false;
      this.hud.update();
      await fx.wait(500);
      this.overlay = resultOverlay(this.battle, { onRetry: () => this.restart(), onRules: () => this.openDev() });
      this.root.append(this.overlay);
    });
  }

  boardEl() {
    return this.boardView.boardEl;
  }

  // ───────────── 입력 ─────────────
  get canAct() {
    return this.battle.isInput && !this.busy && !this.overlay;
  }

  async #run(fn) {
    if (this.busy) return;
    this.busy = true;
    try {
      await fn();
    } finally {
      this.busy = false;
    }
    this.#maybeAuto();
  }

  selectHand(i) {
    if (!this.canAct || !this.battle.hand[i]) return;
    this.selected = this.selected === i ? null : i;
    this.boardView.render();
  }

  placeAt(r, c, handIndex = this.selected) {
    if (!this.canAct) return;
    if (handIndex == null) {
      // 선택이 없으면 첫 번째 남은 블록 사용
      handIndex = this.battle.hand.findIndex((x) => x);
      if (handIndex < 0) return;
    }
    return this.#run(() => this.battle.place(handIndex, r, c));
  }

  undo() {
    if (!this.canAct) return;
    return this.#run(async () => {
      await this.battle.undo();
    });
  }

  useSkill(slot) {
    if (!this.canAct) return;
    return this.#run(() => this.battle.useSkill(slot));
  }

  onEnemyClick(m) {
    if (this.overlay) return;
    this.battle.setFocus(m);
  }

  showHint() {
    if (!this.canAct) return;
    const best = findBestMove(this.battle);
    if (!best?.move) return;
    this.boardView.hint = best.move;
    this.selected = best.move.handIndex;
    this.boardView.render();
    this.side.log(`추천: ${best.move.handIndex + 1}번 블록 → (${best.move.r + 1}, ${best.move.c + 1}) · 예상 피해 약 ${Math.round(best.dmg)}`, 'system');
  }

  playBest() {
    if (!this.canAct) return;
    const best = findBestMove(this.battle);
    if (best?.move) this.placeAt(best.move.r, best.move.c, best.move.handIndex);
  }

  previewWith(r, c, element) {
    const b = this.battle;
    const board = b.board.clone();
    board.place(r, c, element);
    return scoreTurn(board, [...b.placements, { r, c, element }], b.rules.scoring);
  }

  beginDrag(e, handIndex, slotEl) {
    if (!this.canAct || e.button !== 0) return;
    const start = { x: e.clientX, y: e.clientY };
    let ghost = null;
    const k = this.fx.scale;
    const stageRect = this.root.getBoundingClientRect();
    const move = (ev) => {
      if (!ghost && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 6) {
        ghost = h('div', { class: 'drag-ghost' }, this.boardView.gem(this.battle.hand[handIndex].element));
        this.root.append(ghost);
        this.selected = handIndex;
        this.boardView.render();
      }
      if (ghost) {
        ghost.style.left = `${(ev.clientX - stageRect.left) / k}px`;
        ghost.style.top = `${(ev.clientY - stageRect.top) / k}px`;
      }
    };
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (!ghost) {
        this.selectHand(handIndex);
        return;
      }
      ghost.remove();
      const cell = document.elementsFromPoint(ev.clientX, ev.clientY).find((n) => n.classList?.contains('cell'));
      if (cell && (cell.classList.contains('allowed') || cell.classList.contains('forced'))) this.placeAt(Number(cell.dataset.r), Number(cell.dataset.c), handIndex);
      else this.boardView.render();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  onKey(e) {
    if (e.target.closest?.('textarea, input, select')) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') {
      if (this.overlay?.dataset.kind === 'dev') this.closeDev();
      this.selected = null;
      this.boardView.hint = null;
      this.boardView.render();
      return;
    }
    if (this.overlay) return;
    if (['1', '2', '3', '4', '5', '6'].includes(k)) this.selectHand(Number(k) - 1);
    else if (this.skillKeys.includes(k)) this.useSkill(this.skillKeys.indexOf(k));
    else if (k === 'z' || k === 'backspace') this.undo();
    else if (k === 'h') this.showHint();
    else if (k === ' ') {
      e.preventDefault();
      this.playBest();
    } else if (k === 'a') this.toggleAuto();
    else return;
    e.preventDefault();
  }

  // ───────────── 오토 / 속도 ─────────────
  toggleAuto() {
    this.auto = !this.auto;
    this.hud.update();
    this.#maybeAuto();
  }

  async #maybeAuto() {
    if (!this.auto || !this.canAct) return;
    await sleep(350 / this.fx.speed);
    if (!this.auto || !this.canAct) return;
    const skillUser = this.battle.team.find((u) => shouldUseSkill(this.battle, u));
    if (skillUser) return this.useSkill(skillUser.slot);
    this.playBest();
  }

  cycleSpeed() {
    this.fx.speed = SPEEDS[(SPEEDS.indexOf(this.fx.speed) + 1) % SPEEDS.length];
    this.settings.speed = this.fx.speed;
    saveSettings(this.settings);
    this.#applySpeedVar();
    this.hud.update();
  }

  #applySpeedVar() {
    this.root.style.setProperty('--speed', this.fx.speed);
  }

  // ───────────── 규칙 편집 ─────────────
  openDev() {
    this.overlay?.remove();
    this.auto = false;
    this.overlay = devOverlay({
      stages: GAME_DATA.stages,
      stageId: this.stageId,
      seed: this.settings.seed,
      rulesJson: JSON.stringify(this.settings.rules ?? DEFAULT_RULES, null, 2),
      chartJson: JSON.stringify(this.settings.chart ?? GAME_DATA.elementChart, null, 2),
      onApply: ({ stageId, seed, rules, chart }) => {
        this.stageId = stageId;
        Object.assign(this.settings, { stageId, seed, rules, chart });
        saveSettings(this.settings);
        this.restart();
      },
      onReset: () => {
        this.settings = { speed: this.fx.speed, stageId: this.stageId };
        saveSettings(this.settings);
        this.restart();
      },
      onClose: () => this.closeDev(),
    });
    this.overlay.dataset.kind = 'dev';
    this.root.append(this.overlay);
  }

  closeDev() {
    this.overlay?.remove();
    this.overlay = null;
    if (this.battle.result) {
      this.overlay = resultOverlay(this.battle, { onRetry: () => this.restart(), onRules: () => this.openDev() });
      this.root.append(this.overlay);
    }
  }
}

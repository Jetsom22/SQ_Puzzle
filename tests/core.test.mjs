import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_DATA, DEFAULT_RULES } from '../src/config/index.js';
import { Board } from '../src/core/Board.js';
import { ElementSystem } from '../src/core/ElementSystem.js';
import { Rng } from '../src/core/Rng.js';
import { scoreTurn } from '../src/core/Scoring.js';
import { allowedCells } from '../src/core/Placement.js';
import { Battle } from '../src/core/Battle.js';
import { clone } from '../src/core/util.js';

const elements = new ElementSystem(GAME_DATA.elements, GAME_DATA.elementChart);

/** 레이아웃 문자열로 고정 보드 생성 (F/W/A/E/./#/*) */
function boardOf(rows) {
  return new Board({ layout: { rows }, elements, rng: new Rng(1) });
}

test('속성 상성: 불→바람→땅→물→불', () => {
  assert.equal(elements.relation('fire', 'wind'), 1);
  assert.equal(elements.relation('wind', 'earth'), 1);
  assert.equal(elements.relation('earth', 'water'), 1);
  assert.equal(elements.relation('water', 'fire'), 1);
  assert.equal(elements.relation('fire', 'water'), -1);
  assert.equal(elements.relation('fire', 'earth'), 0);
  assert.equal(elements.damageModifier('fire', 'wind'), 1.2);
  assert.equal(elements.damageModifier('fire', 'water'), 0.8);
});

test('점대칭 배치: (1,1) 다음은 (3,3)', () => {
  const b = boardOf(['EEEEE', 'E...E', 'E.E.E', 'E...E', 'EEEEE']);
  const first = allowedCells(b, [], DEFAULT_RULES.placement);
  assert.equal(first.cells.length, 8);
  b.place(1, 1, 'water');
  const next = allowedCells(b, [{ r: 1, c: 1 }], DEFAULT_RULES.placement);
  assert.deepEqual(next.cells, [[3, 3]]);
  assert.equal(next.forced, true);
});

test('대칭 위치가 막히면 fallback=free → 모든 빈칸', () => {
  const b = boardOf(['EEEEE', 'E...E', 'E.E.E', 'E...E', 'EEEEW']);
  b.place(1, 1, 'water');
  b.place(3, 3, 'fire');
  b.remove(1, 1);
  b.place(1, 1, 'water');
  const next = allowedCells(b, [{ r: 1, c: 1 }], DEFAULT_RULES.placement);
  assert.equal(next.forced, false);
  assert.equal(next.cells.length, b.emptyCells().length);
});

test('라인 없음: 블록당 x1', () => {
  const b = boardOf(['FWAEF', 'W...W', 'A.E.A', 'E...E', 'FWAEF']);
  b.place(1, 1, 'fire');
  b.place(3, 3, 'water');
  const s = scoreTurn(b, [{ r: 1, c: 1 }, { r: 3, c: 3 }], DEFAULT_RULES.scoring);
  assert.deepEqual(s.byElement, { fire: 1, water: 1 });
  assert.equal(s.lines.length, 0);
});

test('기획서 예시: 물 가로 x3 + 물 세로 x4 = x7', () => {
  // (2,2) 에 물을 놓으면 가로 3칸 (2,1~2,3), 세로 4칸 (1,2~4,2)
  const b = boardOf(['FAEFA', 'E.W.E', 'AW.WF', 'E.W.A', 'FAWEF']);
  b.place(2, 2, 'water');
  const s = scoreTurn(b, [{ r: 2, c: 2 }], DEFAULT_RULES.scoring);
  assert.equal(s.byElement.water, 7);
  assert.equal(s.lines.length, 2);
  assert.deepEqual(s.lines.map((l) => l.length).sort(), [3, 4]);
});

test('두 블록이 같은 라인을 이루면 한 번만 계산', () => {
  const b = boardOf(['FAEFA', 'E...E', 'W...W', 'E...E', 'FAEFA']);
  // 2행: W . . . W → (2,1),(2,2),(2,3) 에 물을 채우면 5연결
  b.place(2, 1, 'water');
  b.place(2, 2, 'water');
  b.place(2, 3, 'water');
  const s = scoreTurn(b, [{ r: 2, c: 1 }, { r: 2, c: 3 }], DEFAULT_RULES.scoring);
  assert.equal(s.lines.length, 1);
  assert.equal(s.byElement.water, 5);
});

test('만능 블록(*)은 모든 속성 라인에 포함', () => {
  const b = boardOf(['AEFAE', 'E...F', 'F.*.A', 'E...F', 'AFEAE']);
  b.place(1, 1, 'water');
  b.place(3, 3, 'water');
  const s = scoreTurn(b, [{ r: 1, c: 1 }, { r: 3, c: 3 }], DEFAULT_RULES.scoring);
  assert.equal(s.lines.length, 1);
  assert.equal(s.lines[0].length, 3);
  assert.equal(s.byElement.water, 3);
});

test('규칙 수정: lineMultiplier / singleAlsoWhenInLine 반영', () => {
  const b = boardOf(['FAEFA', 'E.W.E', 'AW.WF', 'E.W.A', 'FAWEF']);
  b.place(2, 2, 'water');
  const cfg = { ...clone(DEFAULT_RULES.scoring), lineMultiplier: { 3: 10 }, singleAlsoWhenInLine: true };
  const s = scoreTurn(b, [{ r: 2, c: 2 }], cfg);
  assert.equal(s.byElement.water, 10 + 4 + 1); // 3연결=10, 4연결=표에 없으니 4, + 단일 1
});

test('초기 보드는 라인을 포함하지 않음', () => {
  for (let seed = 1; seed < 30; seed++) {
    const b = new Board({ layout: GAME_DATA.boards.classic, elements, rng: new Rng(seed) });
    for (const [r, c] of b.filledCells()) {
      const el = b.elementAt(r, c);
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) assert.ok(b.runLength(r, c, dr, dc, el) < 3);
    }
  }
});

test('전투: 배치 2회 후 턴이 넘어가고, 보드가 차면 초기화', async () => {
  const battle = new Battle({ data: GAME_DATA, rules: clone(DEFAULT_RULES), stageId: 'story-1-1', seed: 7 });
  await battle.start();
  assert.equal(battle.phase, 'input');
  for (let i = 0; i < 4; i++) {
    const [r, c] = battle.allowedCells().cells[0];
    await battle.place(0, r, c);
    if (battle.phase !== 'input') break;
    const [r2, c2] = battle.allowedCells().cells[0];
    await battle.place(1, r2, c2);
    if (battle.result) break;
  }
  assert.ok(battle.turn >= 4 || battle.result);
  if (!battle.result) assert.equal(battle.board.emptyCells().length, 8, '4턴 후 보드 초기화');
});

test('스킬 사용: 게이지 소모 및 효과 적용', async () => {
  const rules = clone(DEFAULT_RULES);
  rules.skill.startCharged = true;
  const battle = new Battle({ data: GAME_DATA, rules, stageId: 'story-1-1', seed: 3 });
  await battle.start();
  const hp = battle.enemies.map((e) => e.hp);
  assert.ok(await battle.useSkill(3)); // 라클레르: 적 전체 피해
  assert.ok(battle.enemies.every((e, i) => e.hp < hp[i]));
  assert.equal(battle.team[3].charge, 0);
  assert.equal(await battle.useSkill(3), false);
});

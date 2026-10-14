import { allowedCells } from './Placement.js';
import { scoreTurn } from './Scoring.js';

/**
 * 오토/힌트용 탐색 AI.
 * 남은 배치를 전부 탐색(perTurn ≤ 3 권장)해서 "예상 총 데미지"가 가장 큰 수를 고릅니다.
 */
export function evaluate(battle, board, placements) {
  const score = scoreTurn(board, placements, battle.rules.scoring);
  let dmg = 0;
  for (const u of battle.team) {
    if (!u.alive || u.has('stun')) continue;
    const m = score.byElement[u.element] ?? 0;
    if (!m) continue;
    const target = battle.pickTargetFor(u, battle.enemies);
    if (!target) continue;
    const ratio = u.def.attack?.ratio ?? 1;
    const hits = u.def.attack?.target === 'enemyAll' ? battle.enemies.filter((e) => e.alive).length : 1;
    dmg += u.atk * m * ratio * hits * battle.elements.damageModifier(u.element, target.element);
  }
  return { dmg, score };
}

export function findBestMove(battle) {
  const rules = battle.rules.placement;
  const remaining = rules.perTurn - battle.placements.length;
  let best = null;

  const search = (board, hand, placements, first, depth) => {
    const { cells } = allowedCells(board, placements, rules);
    const handIdx = hand.map((h, i) => (h ? i : -1)).filter((i) => i >= 0);
    if (depth === 0 || !cells.length || !handIdx.length) {
      const { dmg } = evaluate(battle, board, placements);
      const value = dmg + battle.rng.next() * 0.01;
      if (!best || value > best.value) best = { value, dmg, move: first };
      return;
    }
    const seenEl = new Set();
    for (const hi of handIdx) {
      const el = hand[hi].element;
      if (seenEl.has(el)) continue; // 같은 속성 블록은 결과 동일
      seenEl.add(el);
      for (const [r, c] of cells) {
        const b = board.clone();
        b.place(r, c, el);
        const h = hand.slice();
        h[hi] = null;
        search(b, h, [...placements, { r, c, element: el }], first ?? { handIndex: hi, r, c }, depth - 1);
      }
    }
  };

  search(battle.board, battle.hand, battle.placements, null, remaining);
  return best;
}

/** 오토 모드 스킬 사용 판단 */
export function shouldUseSkill(battle, unit) {
  if (!battle.isSkillReady(unit)) return false;
  const skill = battle.skillOf(unit);
  switch (skill.ai ?? 'ready') {
    case 'heal':
      return battle.team.some((u) => u.alive && u.hpRatio < 0.6);
    case 'revive':
      return battle.team.some((u) => !u.alive);
    case 'never':
      return false;
    default:
      return true;
  }
}

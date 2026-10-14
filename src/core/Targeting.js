/**
 * 자동 타겟 규칙 레지스트리
 * strategy(attacker, candidates, ctx) → 동점 후보 배열 (pickTarget 이 tieBreak 로 1명 선택)
 */
export const TARGET_STRATEGIES = {
  /** 기획서: 유리한 속성 → 동등 → 불리 순으로 우선 공격 */
  elementPriority(attacker, candidates, { elements, element }) {
    const el = element ?? attacker.element;
    const best = Math.max(...candidates.map((u) => elements.relation(el, u.element)));
    return candidates.filter((u) => elements.relation(el, u.element) === best);
  },
  lowestHp(attacker, candidates) {
    const min = Math.min(...candidates.map((u) => u.hp));
    return candidates.filter((u) => u.hp === min);
  },
  front(attacker, candidates) {
    return [candidates[0]];
  },
};

export function registerTargetStrategy(name, fn) {
  TARGET_STRATEGIES[name] = fn;
}

/**
 * @param {object} o
 * @param {string} o.strategy  TARGET_STRATEGIES 키
 * @param {import('./Unit.js').Unit|null} [o.focus] 집중 공격 대상 (살아있으면 최우선)
 * @param {'first'|'random'} [o.tieBreak]
 */
export function pickTarget(attacker, candidates, { strategy, focus, elements, rng, element, tieBreak = 'first' }) {
  const alive = candidates.filter((u) => u.alive);
  if (!alive.length) return null;
  if (focus && focus.alive && alive.includes(focus)) return focus;
  const fn = TARGET_STRATEGIES[strategy] ?? TARGET_STRATEGIES.elementPriority;
  const tied = fn(attacker, alive, { elements, element });
  return tieBreak === 'random' && rng ? rng.pick(tied) : tied[0];
}

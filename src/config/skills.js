/**
 * 스킬 정의 (캐릭터 액티브 / 리더 / 패시브 / 몬스터 공통)
 * ------------------------------------------------------------
 * 스킬 = effects 배열. 각 effect 의 type 은 core/Effects.js 의 EFFECTS 레지스트리 키.
 * 새 효과가 필요하면 registerEffect('myType', handler) 로 등록 후 여기서 사용하세요.
 *
 * target 지정 (caster 기준 상대 진영):
 *   'self' | 'ally'(아군 전체) | 'allyLowest' | 'allyDead'
 *   'enemy'(자동/집중 타겟 1체) | 'enemyAll' | 'enemyRandom'
 *   객체형: { who: 'ally', where: { element: 'fire' } }
 *
 * 공통 필드: name, desc, cooldown(액티브 전용, 턴), ai('ready'|'heal'|'revive' — 오토 사용 조건)
 */
export const SKILLS = {
  // ── 캐릭터 액티브 ─────────────────────────────
  crimsonSlash: {
    name: '크림슨 슬래시',
    desc: '적 1체에게 공격력 x6 불 속성 피해',
    cooldown: 4,
    effects: [{ type: 'damage', target: 'enemy', multiplier: 6 }],
  },
  tidalBlessing: {
    name: '조류의 축복',
    desc: '아군 전체 최대 체력 30% 회복',
    cooldown: 4,
    ai: 'heal',
    effects: [{ type: 'heal', target: 'ally', percent: 0.3 }],
  },
  verdantWeave: {
    name: '초록 실타래',
    desc: '보드의 무작위 블록 4개를 바람 속성으로 변경',
    cooldown: 3,
    effects: [{ type: 'convertBoard', from: 'notSelf', to: 'self', count: 4 }],
  },
  harvestScythe: {
    name: '수확의 낫',
    desc: '적 전체에게 공격력 x3 땅 속성 피해',
    cooldown: 5,
    effects: [{ type: 'damage', target: 'enemyAll', multiplier: 3 }],
  },
  dragonFist: {
    name: '용권',
    desc: '적 1체에게 x4 피해 + 1턴 기절',
    cooldown: 5,
    effects: [
      { type: 'damage', target: 'enemy', multiplier: 4 },
      { type: 'stun', target: 'enemy', duration: 1 },
    ],
  },
  rainbowPrism: {
    name: '무지개 프리즘',
    desc: '손패 블록을 모두 시전자 속성으로 변경',
    cooldown: 3,
    effects: [{ type: 'convertHand', to: 'self' }],
  },

  // ── 리더 스킬 (전투 시작 시 1회 적용, 영구) ─────
  flameBanner: {
    name: '화염의 깃발',
    desc: '팀 전체 공격력 +15%, 불 속성 공격력 추가 +15%',
    effects: [
      { type: 'modifier', target: 'ally', stat: 'atk', mult: 1.15, label: '리더: 공격력' },
      { type: 'modifier', target: { who: 'ally', where: { element: 'fire' } }, stat: 'atk', mult: 1.15, label: '리더: 불 공격력' },
    ],
  },

  // ── 패시브 (본인에게만, 영구) ─────────────────
  ironBody: {
    name: '강철 신체',
    desc: '받는 피해 -15%',
    effects: [{ type: 'modifier', target: 'self', stat: 'damageTaken', mult: 0.85, label: '패시브: 피해 감소' }],
  },

  // ── 몬스터 스킬 ──────────────────────────────
  bite: {
    name: '물어뜯기',
    desc: '대상 1체 공격',
    effects: [{ type: 'damage', target: 'enemy', multiplier: 1 }],
  },
  howl: {
    name: '울부짖음',
    desc: '자신 공격력 +30% (3턴)',
    effects: [{ type: 'modifier', target: 'self', stat: 'atk', mult: 1.3, duration: 3, label: '울부짖음' }],
  },
  drainKiss: {
    name: '흡혈 키스',
    desc: '대상 1체 x1.2 피해, 피해량 50% 흡수',
    effects: [{ type: 'damage', target: 'enemy', multiplier: 1.2, lifesteal: 0.5 }],
  },
  darkWorld: {
    name: 'The Dark World',
    desc: '무작위 캐릭터 1체 기절(1턴), 물 속성 피해 -20%',
    effects: [
      { type: 'stun', target: 'enemyRandom', duration: 1 },
      { type: 'modifier', target: 'self', stat: 'damageTaken', mult: 0.8, filter: { element: 'water' }, duration: 2, label: '물 피해 감소' },
    ],
  },
  charmStorm: {
    name: '매혹의 폭풍',
    desc: '아군 전체 x0.8 피해',
    effects: [{ type: 'damage', target: 'enemyAll', multiplier: 0.8 }],
  },
};

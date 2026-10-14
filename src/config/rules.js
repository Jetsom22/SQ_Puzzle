/**
 * 게임 규칙(Rules)
 * ------------------------------------------------------------
 * 전투 규칙의 "숫자와 스위치"는 전부 이곳에 모여 있습니다.
 * 게임 중에도 [규칙 편집] 패널에서 JSON 으로 수정 → 재시작으로 바로 테스트할 수 있습니다.
 */
export const RULES = {
  /** 난수 시드 (null = 매번 랜덤). 숫자를 넣으면 보드/손패가 재현됩니다. */
  seed: null,

  board: {
    /** 기본 보드 레이아웃 id (boards.js). 스테이지에 layout 이 있으면 그쪽이 우선 */
    layout: 'classic',
    /** 보드가 가득 차면 초기 레이아웃으로 재생성 */
    resetWhenFull: true,
    /** 초기 랜덤 블록이 처음부터 라인을 이루지 않도록 보정 */
    avoidInitialLines: true,
  },

  hand: {
    /** 하단 손패 블록 수 */
    size: 4,
    /** 'random' = 속성 무작위 | 'eachElement' = 속성별 1개씩 섞어서 */
    fill: 'random',
  },

  placement: {
    /** 한 턴에 배치하는 블록 수 (기획서: 2) */
    perTurn: 2,
    /**
     * 두 번째 이후 블록의 배치 규칙 (core/Placement.js 의 SYMMETRY 레지스트리)
     * 'point'(점대칭) | 'mirrorH'(좌우) | 'mirrorV'(상하) | 'free'(자유)
     */
    rule: 'point',
    /** 대칭 위치가 막혀 있을 때: 'free' = 아무 빈칸 | 'skip' = 턴 종료 */
    fallback: 'free',
    /** 턴 종료 전 배치 취소 허용 */
    allowUndo: true,
  },

  scoring: {
    /** 라인으로 인정되는 최소 연결 수 */
    minLine: 3,
    /** 라인 판정 방향 (core/Scoring.js 의 DIRECTIONS) */
    directions: ['horizontal', 'vertical', 'diagonal', 'antiDiagonal'],
    /** 연결 수 → 데미지 배율. 표에 없는 길이는 길이 자체를 배율로 사용 */
    lineMultiplier: { 3: 3, 4: 4, 5: 5 },
    /** 라인에 속하지 않은 블록 1개의 배율 */
    singleMultiplier: 1,
    /** true 면 라인에 포함된 블록도 단일 배율(x1)을 추가로 받음 */
    singleAlsoWhenInLine: false,
  },

  combat: {
    /** 자동 타겟 규칙 (core/Targeting.js 의 TARGET_STRATEGIES) */
    targetStrategy: 'elementPriority',
    /** 적 클릭으로 집중 공격 대상 지정 허용 */
    allowFocusTarget: true,
    /** 적이 모두 쓰러지면 남은 캐릭터 공격 생략 */
    stopWhenWaveCleared: true,
  },

  turn: {
    /** 기본 제한 턴 (스테이지 turnLimit 이 우선) */
    limit: 20,
  },

  skill: {
    /** 턴 종료마다 차는 스킬 게이지 */
    chargePerTurn: 1,
    /** 전투 시작 시 스킬 게이지 가득 */
    startCharged: false,
  },
};

# Square Hearts — 전투 프로토타입 (PC 16:9)

기획서 *스퀘어 하츠 게임 소개서 v1.1.x* 의 **인게임 기본 전투**를 웹으로 빠르게 옮긴 프로토타입입니다.
모바일 세로 화면을 **1920×1080 고정 스테이지**(창 크기에 맞춰 레터박스 스케일)로 재배치했습니다.

- 배포: GitHub Pages (`main` 푸시 시 `.github/workflows/deploy-pages.yml` 이 테스트 후 자동 배포)
- 로컬 실행: `npm start` → http://localhost:8080 (ES 모듈이라 `file://` 로 직접 열면 동작하지 않습니다)
- 테스트: `npm test` · 밸런스 시뮬레이션: `npm run sim -- story-1-1 200`

## 구현된 전투 규칙

| 항목 | 기획서 | 설정 위치 |
| --- | --- | --- |
| 배치 | 첫 블록은 빈칸, 두 번째는 **점대칭 위치** | `rules.placement` (`point`/`mirrorH`/`mirrorV`/`free`) |
| 턴 종료 | 블록 2개 배치 시 | `rules.placement.perTurn` |
| 정산 | 블록 1개 = x1 | `rules.scoring.singleMultiplier` |
| 라인 보너스 | 가로·세로·대각 3/4/5 연결 = x3/x4/x5, 합산 | `rules.scoring.lineMultiplier`, `directions`, `minLine` |
| 공격 | 같은 속성 캐릭터가 `공격력 × 배율` | `characters.js` 의 `attack` (단일/전체) |
| 타겟 | 유리 → 동등 → 불리, 적 클릭 시 집중 공격 | `rules.combat`, `core/Targeting.js` |
| 상성 | 불→바람→땅→물→불, 유리 +20% / 불리 −20% | `elements.js` 의 `ELEMENT_CHART` |
| 몬스터 | N턴 카운트다운 후 패턴 스킬 | `monsters.js` 의 `attackInterval`, `pattern` |
| 스킬 | 액티브(턴 충전) / 리더 / 패시브 | `skills.js`, `characters.js` |
| 보드 초기화 | 보드가 가득 차면 초기 레이아웃으로 | `rules.board.resetWhenFull`, `boards.js` |
| 승패 | 모든 웨이브 처치 / 제한 턴 초과·전멸 | `stages.js` 의 `waves`, `turnLimit` |

## 구조

```
src/
  config/      ← 데이터만 (여기만 바꿔도 다른 게임으로 변형 가능)
    elements.js   속성 목록 + 상성표
    rules.js      전투 규칙 스위치/숫자 전부
    boards.js     보드 레이아웃 (# 구멍 . 빈칸 ? 랜덤 * 만능 F/W/A/E 고정)
    skills.js     스킬 = effect 배열 (캐릭터/리더/패시브/몬스터 공용)
    characters.js monsters.js stages.js
    index.js      위 데이터를 묶는 진입점
  core/        ← 순수 로직 (DOM 없음, Node 에서 테스트/시뮬레이션)
    Battle.js       턴 상태 머신, 이벤트 발행
    Board.js        보드 모델     Placement.js  배치 규칙 레지스트리
    Scoring.js      라인/배율     ElementSystem.js 상성
    Damage.js       데미지 파이프라인 (단계 추가/교체 가능)
    Effects.js      스킬 효과 레지스트리   Targeting.js 타겟 규칙 레지스트리
    Unit.js         유닛/상태이상   AutoPlayer.js 오토·추천 수 AI
  ui/          ← 렌더링 + 입력 (core 이벤트를 받아 연출만 담당)
tests/  tools/simulate.mjs
```

### 확장 포인트

- **속성 추가**: `ELEMENTS` 에 항목, `ELEMENT_CHART.strongAgainst` 에 관계 추가 → 보드·손패·UI·AI 자동 반영
- **배치 규칙 추가**: `registerSymmetry('knight', (b, r, c) => [...])`
- **라인 방향 추가**: `core/constants.js` 의 `DIRECTIONS`
- **스킬 효과 추가**: `registerEffect('shield', async (fx, ctx) => { ... })` 후 `skills.js` 에서 `type: 'shield'`
- **데미지 규칙 추가**: `DAMAGE_PIPELINE` 에 `{ id: 'crit', apply(ctx) { ... } }` 삽입
- **타겟 규칙 추가**: `registerTargetStrategy('lowestHp', ...)` 후 `rules.combat.targetStrategy`
- **스테이지별 규칙 덮어쓰기**: `stages.js` 의 `rules: { placement: { rule: 'mirrorH' } }`
- **실행 중 튜닝**: 게임 내 **[규칙 편집]** 에서 RULES/상성표 JSON 을 수정 → 즉시 재시작 (브라우저에 저장)

## 조작 (PC)

| 입력 | 동작 |
| --- | --- |
| 손패 클릭 · `1`–`4` | 블록 선택 |
| 빈칸 클릭 · 드래그 앤 드롭 | 배치 |
| 우클릭 · `Z` | 이번 턴 배치 되돌리기 |
| 캐릭터 카드 클릭 · `Q W E R T` | 액티브 스킬 (게이지가 차면 SKILL 표시) |
| 적 클릭 | 집중 공격 대상 지정/해제 |
| `H` / `Space` | 추천 수 표시 / 바로 두기 |
| `A` | 오토 전투 |

> 캐릭터 일러스트는 아직 없어 속성색 초상(이름 첫 글자)으로 대체했습니다.

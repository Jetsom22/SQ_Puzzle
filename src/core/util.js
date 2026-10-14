/** 깊은 복사 (JSON 호환 데이터용, Infinity 보존) */
export function clone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(clone);
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k] = clone(v);
  return out;
}

/** source 를 target 에 깊게 병합한 새 객체 반환 (배열은 통째로 교체) */
export function deepMerge(target, source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return clone(source ?? target);
  const out = clone(target ?? {});
  for (const [k, v] of Object.entries(source)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? deepMerge(out[k], v) : clone(v);
  }
  return out;
}

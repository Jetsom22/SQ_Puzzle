/**
 * 비동기 이벤트 버스.
 * emit 은 모든 핸들러가 반환한 Promise 를 기다립니다 → UI 연출이 끝난 뒤 로직이 진행됩니다.
 * 핸들러가 없으면(테스트/시뮬레이션) 즉시 진행됩니다.
 */
export class EventBus {
  #handlers = new Map();

  on(type, fn) {
    if (!this.#handlers.has(type)) this.#handlers.set(type, new Set());
    this.#handlers.get(type).add(fn);
    return () => this.#handlers.get(type)?.delete(fn);
  }

  async emit(type, payload = {}) {
    const list = [...(this.#handlers.get(type) ?? []), ...(this.#handlers.get('*') ?? [])];
    if (list.length) await Promise.all(list.map((fn) => fn(payload, type)));
  }
}

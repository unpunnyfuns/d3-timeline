type Handler = (...args: never[]) => void
export interface Emitter<E extends { [K in keyof E]: Handler }> {
  on<K extends keyof E>(event: K, handler: E[K]): () => void
  emit<K extends keyof E>(event: K, ...args: Parameters<E[K]>): void
  clear(): void
}

export const createEmitter = <E extends { [K in keyof E]: Handler }>(): Emitter<E> => {
  const handlers = new Map<keyof E, Set<Handler>>()

  const on: Emitter<E>['on'] = (event, handler) => {
    const set = handlers.get(event) ?? new Set()
    set.add(handler)
    handlers.set(event, set)
    return () => {
      set.delete(handler)
    }
  }

  const emit: Emitter<E>['emit'] = (event, ...args) => {
    const set = handlers.get(event)
    if (!set) return
    for (const handler of set) (handler as (...a: unknown[]) => void)(...args)
  }

  const clear = () => handlers.clear()

  return { on, emit, clear }
}

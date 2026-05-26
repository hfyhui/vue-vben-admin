/** Minimal event bus for inter-component communication */
type Handler = (...args: any[]) => void;

class EventBus {
  private handlers: Map<string, Handler[]> = new Map();

  on(event: string, handler: Handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  off(event: string, handler?: Handler) {
    if (!handler) {
      this.handlers.delete(event);
    } else {
      const list = this.handlers.get(event);
      if (list) {
        const idx = list.indexOf(handler);
        if (idx > -1) list.splice(idx, 1);
      }
    }
  }

  emit(event: string, ...args: any[]) {
    const list = this.handlers.get(event);
    if (list) list.forEach((fn) => fn(...args));
  }
}

export const processEventBus = new EventBus();

/**
 * Widgets rendered into the export screen (an iframe) create ResizeObservers from the app's
 * window. Chromium does deliver those for elements in another same-origin document, but the
 * spec ties observations to the observer's own document, so to be safe each target is observed
 * from its own window.
 */

type Callback = (entries: ResizeObserverEntry[], observer: ResizeObserver) => void;
type ObserverCtor = new (callback: ResizeObserverCallback) => ResizeObserver;
type WindowWithObserver = Window & { ResizeObserver?: ObserverCtor };

const INSTALLED = Symbol.for("ot.report.crossDocumentResizeObserver");

export function installCrossDocumentResizeObserver(win: Window = window): void {
  const Native = (win as WindowWithObserver).ResizeObserver;
  if (!Native || (Native as unknown as Record<symbol, boolean>)[INSTALLED]) return;
  const NativeCtor: ObserverCtor = Native;

  class CrossDocumentResizeObserver implements ResizeObserver {
    private readonly byWindow = new Map<Window, ResizeObserver>();
    private readonly callback: Callback;

    constructor(callback: Callback) {
      this.callback = callback;
    }

    private observerFor(target: Element): ResizeObserver {
      const targetWindow = target.ownerDocument?.defaultView ?? win;
      const existing = this.byWindow.get(targetWindow);
      if (existing) return existing;
      const Ctor: ObserverCtor =
        (targetWindow === win ? undefined : (targetWindow as WindowWithObserver).ResizeObserver) ?? NativeCtor;
      const observer = new Ctor((entries: ResizeObserverEntry[]) => this.callback(entries, this));
      this.byWindow.set(targetWindow, observer);
      return observer;
    }

    observe(target: Element, options?: ResizeObserverOptions): void {
      this.observerFor(target).observe(target, options);
    }

    unobserve(target: Element): void {
      this.observerFor(target).unobserve(target);
    }

    disconnect(): void {
      for (const observer of this.byWindow.values()) observer.disconnect();
      this.byWindow.clear();
    }
  }

  (CrossDocumentResizeObserver as unknown as Record<symbol, boolean>)[INSTALLED] = true;
  (win as WindowWithObserver).ResizeObserver = CrossDocumentResizeObserver;
}

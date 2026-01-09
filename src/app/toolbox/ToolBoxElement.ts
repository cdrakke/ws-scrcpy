// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Optional = Record<string, any>;

type ToolBoxEventListener<T extends HTMLElement> = <K extends keyof HTMLElementEventMap>(
    type: K,
    el: ToolBoxElement<T>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => any;

export abstract class ToolBoxElement<T extends HTMLElement> {
    private listeners: Map<string, Set<ToolBoxEventListener<T>>> = new Map();
    protected constructor(public readonly title: string, public readonly optional?: Optional) {}

    public abstract getElement(): T;
    public abstract getAllElements(): HTMLElement[];

    public addEventListener<K extends keyof HTMLElementEventMap>(
        type: K,
        listener: ToolBoxEventListener<T>,
        options?: boolean | AddEventListenerOptions,
    ): void {
        const set = this.listeners.get(type) || new Set();
        if (!set.size) {
            const element = this.getElement();
            element.addEventListener(type, this.onEvent, options);
        }
        set.add(listener);
        this.listeners.set(type, set);
    }
    public removeEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: ToolBoxEventListener<T>): void {
        const set = this.listeners.get(type);
        if (!set) {
            return;
        }
        set.delete(listener);
        if (!set.size) {
            this.listeners.delete(type);
            const element = this.getElement();
            element.removeEventListener(type, this.onEvent);
        }
    }
    onEvent = <K extends keyof HTMLElementEventMap>(ev: HTMLElementEventMap[K]): void => {
        const set = this.listeners.get(ev.type);
        if (!set) {
            return;
        }
        const type = ev.type as K;
        set.forEach((listener) => {
            listener(type, this);
        });
    };
}

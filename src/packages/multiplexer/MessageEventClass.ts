import { Event2 } from './Event';

export class MessageEvent2 extends Event2 implements MessageEvent {
    // MessageEvent.data, source, and ports are typed as `any` in the DOM spec
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public readonly data: any;
    public readonly origin: string;
    public readonly lastEventId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public readonly source: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public readonly ports: ReadonlyArray<any>;
    constructor(
        type: string,
        { data = null, origin = '', lastEventId = '', source = null, ports = [] }: MessageEventInit = {},
    ) {
        super(type);
        this.data = data;
        this.origin = `${origin}`;
        this.lastEventId = `${lastEventId}`;
        this.source = source;
        this.ports = [...ports];
    }

    initMessageEvent(): void {
        throw Error('Deprecated method');
    }
}

export const MessageEventClass = typeof MessageEvent !== 'undefined' ? MessageEvent : MessageEvent2;

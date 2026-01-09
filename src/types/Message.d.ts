export interface Message {
    id: number;
    type: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
}

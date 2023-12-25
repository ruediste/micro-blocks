import { ArrayQueue, ConstantBackoff, WebsocketBuilder } from "websocket-ts";
import BinaryMessageMapper from "./binaryMessageMapper";
import { useEffect, useState } from "react";

export enum MessageType {
    GRAVITY_SENSOR_VALUE = 0,
    LOG_SNAPSHOT = 1,
    UI_SNAPSHOT = 2,
    BASIC_TRIGGER_CALLBACK = 3,
}

interface MessageHandler {
    onMessage: (msg: DataView) => void;
    onRetry: () => void;
    onReconnect: () => void;
}

const lastMessages: { [key in MessageType]?: DataView } = {};
const messageHandlers: { [key in MessageType]?: Set<MessageHandler> } = {};

let websocketState: 'connected' | 'not-connected' = 'not-connected';
const websocketStateChanged: Set<() => void> = new Set();

const ws = new WebsocketBuilder("ws://" + (process.env.NODE_ENV === 'development' ? 'micro-blocks.local' : window.location.host) + "/api/ws")
    .withBuffer(new ArrayQueue())           // buffer messages when disconnected
    .withBackoff(new ConstantBackoff(1000)) // retry every second
    .onMessage(async (_, message) => {
        let buffer: DataView;
        if (message.data instanceof ArrayBuffer) {
            buffer = new DataView(message.data);
        } else if (message.data instanceof Blob) {
            buffer = new DataView(await new Response(message.data).arrayBuffer());
        }
        else {
            console.log("Received unsupported message", message.type, message);
            return;
        }
        const type = buffer.getUint8(0) as MessageType;
        lastMessages[type] = buffer;
        messageHandlers[type]?.forEach(x => x.onMessage(buffer))
    })
    .onRetry(() => { websocketState = 'not-connected'; websocketStateChanged.forEach(x => x()); Object.values(messageHandlers).forEach(x => x?.forEach(y => y.onRetry())) })
    .onReconnect(() => { websocketState = 'connected'; websocketStateChanged.forEach(x => x()); Object.values(messageHandlers).forEach(x => x?.forEach(y => y.onReconnect())) })
    .onOpen(() => { websocketState = 'connected'; websocketStateChanged.forEach(x => x()); })
    .build();

ws.binaryType = "arraybuffer";

const placeholder = (
    <div className="spinner-border" role="status" >
        <span className="visually-hidden" > Loading...</span>
    </div>
);

export function sendMessage<T>(type: MessageType, mapper: BinaryMessageMapper<T>, value: T) {
    const buffer = new DataView(new ArrayBuffer(mapper.size() + 1));
    buffer.setUint8(0, type);
    ws.send(mapper.toBinary(value, buffer, 1));
}

export function sendMessageRaw<T>(type: MessageType, cb: (writer: BinaryWriter) => void) {
    const writer = new BinaryWriter();
    writer.writeUint8(type);
    cb(writer);
    ws.send(writer.arrayBuffer);
}

type UseLastMessageResult<T> = { state: 'loading', placeholder: React.ReactElement } | { state: 'loaded', value: T };

export function useLastMessage<T>(typeId: MessageType, mapper: BinaryMessageMapper<T>): UseLastMessageResult<T> {
    const readLastMessage: (() => UseLastMessageResult<T>) = () => {
        const buffer = lastMessages[typeId];
        if (buffer === undefined)
            return { state: "loading", placeholder }
        else
            return { state: "loaded", value: mapper.fromBinary(buffer, 1) }
    }

    const [lastMessage, setLastMessage] = useState<UseLastMessageResult<T>>(() => readLastMessage())

    useEffect(() => {
        if (messageHandlers[typeId] === undefined)
            messageHandlers[typeId] = new Set() as any;
        const cbs: MessageHandler = {
            onMessage: (buffer: DataView) => {
                const msg = mapper.fromBinary(buffer, 1);
                console.log("received msg " + JSON.stringify(msg));
                setLastMessage({ state: 'loaded', value: msg })
            },
            onRetry: () => { setLastMessage({ state: 'loading', placeholder }) },
            onReconnect: () => { setLastMessage(readLastMessage) },
        };
        messageHandlers[typeId]!.add(cbs);
        return () => { messageHandlers[typeId]!.delete(cbs); }
    });

    return lastMessage;
}

export class BinaryWriter {
    arrayBuffer = new ArrayBuffer(16);
    buffer = new DataView(this.arrayBuffer);
    pos = 0;
    littleEndian = true;

    constructor() {

    }

    ensureSpace(size: number) {
        if (this.pos + size > this.buffer.byteLength) {
            const newBuffer = new ArrayBuffer(this.arrayBuffer.byteLength * 2);
            new Uint8Array(newBuffer).set(new Uint8Array(this.arrayBuffer));
            this.arrayBuffer = newBuffer;
            this.buffer = new DataView(newBuffer);
        }
    }

    writeUint8(value: number) {
        this.ensureSpace(1);
        this.buffer.setUint8(this.pos, value);
        this.pos += 1;
        return this;
    }

    writeUint16(value: number) {
        this.ensureSpace(2);
        this.buffer.setUint16(this.pos, value, this.littleEndian);
        this.pos += 2;
        return this;
    }
}

export class BinaryReader {
    constructor(public buffer: DataView, public pos: number = 0, public littleEndian: boolean = false) {
    }

    readUint8() {
        const value = this.buffer.getUint8(this.pos);
        this.pos += 1;
        return value;
    }

    readUint16() {
        const value = this.buffer.getUint16(this.pos, this.littleEndian);
        this.pos += 2;
        return value;
    }

    readUint32() {
        const value = this.buffer.getUint32(this.pos, this.littleEndian);
        this.pos += 4;
        return value;
    }

    readFloat32() {
        const value = this.buffer.getFloat32(this.pos, this.littleEndian);
        this.pos += 4;
        return value;
    }

    readStringZ() {
        const startPos = this.pos;
        while (this.readUint8() != 0) {
            // NOP
        }
        return new TextDecoder().decode(this.buffer.buffer.slice(startPos, this.pos - 1));
    }

    readStringN() {
        const count = this.readUint8();
        const str = new TextDecoder().decode(this.buffer.buffer.slice(this.pos, this.pos + count));
        this.pos += count;
        return str;
    }
}

export function useLastMessageRaw<T>(typeId: MessageType, mapper: ((reader: BinaryReader) => T)): UseLastMessageResult<T> {
    const readLastMessage: (() => UseLastMessageResult<T>) = () => {
        const buffer = lastMessages[typeId];
        if (buffer === undefined)
            return { state: "loading", placeholder }
        else
            return { state: "loaded", value: mapper(new BinaryReader(buffer, 1, true)) }
    }

    const [lastMessage, setLastMessage] = useState<UseLastMessageResult<T>>(() => readLastMessage())

    useEffect(() => {
        if (messageHandlers[typeId] === undefined)
            messageHandlers[typeId] = new Set() as any;
        const cbs: MessageHandler = {
            onMessage: (buffer: DataView) => {
                setLastMessage({ state: 'loaded', value: mapper(new BinaryReader(buffer, 1, true)) })
            },
            onRetry: () => { setLastMessage({ state: 'loading', placeholder }) },
            onReconnect: () => { setLastMessage(readLastMessage) },
        };
        messageHandlers[typeId]!.add(cbs);
        return () => { messageHandlers[typeId]!.delete(cbs); }
    });

    return lastMessage;
}

export function useWebsocketState(): typeof websocketState {
    const [state, setState] = useState<typeof websocketState>(websocketState);
    useEffect(() => {
        const listener = () => setState(websocketState);
        websocketStateChanged.add(listener);
        setState(websocketState);
        return () => { websocketStateChanged.delete(listener); }
    });
    return state;
}
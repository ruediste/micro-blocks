import { ArrayQueue, ExponentialBackoff, WebsocketBuilder } from "websocket-ts";
import BinaryMessageMapper from "./binaryMessageMapper";
import { useEffect, useState } from "react";
import { type } from "os";

export enum MessageType {
    GRAVITY_SENSOR_VALUE = 0,
}

interface EffectCallbacks {
    onMessage: (msg: DataView) => void;
    onRetry: () => void;
    onReconnect: () => void;
}

const lastMessages: { [key in MessageType]?: DataView } = {};
const callbacks: { [key in MessageType]?: Set<EffectCallbacks> } = {};

const ws = new WebsocketBuilder("ws://" + (process.env.NODE_ENV === 'development' ? 'micro-blocks.local' : window.location.host) + "/api/ws")
    .withBuffer(new ArrayQueue())           // buffer messages when disconnected
    .withBackoff(new ExponentialBackoff(1000, 3)) // retry with exponential backoff 1s,2s,4s,8s
    .onMessage((_, message) => {
        if (!(message.data instanceof ArrayBuffer)) {
            console.log("Received non array buffer message", message.type, message);
            return;
        }
        const buffer = new DataView(message.data);
        const type = buffer.getUint8(0) as MessageType;
        lastMessages[type] = buffer;
        // console.log("Received message of type " + type);
        callbacks[type]?.forEach(x => x.onMessage(buffer))
    })
    .onRetry(() => { Object.values(callbacks).forEach(x => x?.forEach(y => y.onRetry())) })
    .onReconnect(() => { Object.values(callbacks).forEach(x => x?.forEach(y => y.onReconnect())) })
    .build();
ws.binaryType = "arraybuffer";

const placeholder = (
    <div className="spinner-border" role="status" >
        <span className="visually-hidden" > Loading...</span>
    </div>
);

export function sendMessage<T>(type: MessageType, mapper: BinaryMessageMapper<T>, value: T) {
    console.log("sending msg ", type, JSON.stringify(value));
    const buffer = new DataView(new ArrayBuffer(mapper.size() + 1));
    buffer.setUint8(0, type);
    ws.send(mapper.toBinary(value, buffer, 1));
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
        if (callbacks[typeId] === undefined)
            callbacks[typeId] = new Set() as any;
        const cbs: EffectCallbacks = {
            onMessage: (buffer: DataView) => {
                const msg = mapper.fromBinary(buffer, 1);
                console.log("received msg " + JSON.stringify(msg));
                setLastMessage({ state: 'loaded', value: msg })
            },
            onRetry: () => { setLastMessage({ state: 'loading', placeholder }) },
            onReconnect: () => { setLastMessage(readLastMessage) },
        };
        callbacks[typeId]!.add(cbs);
        return () => { callbacks[typeId]!.delete(cbs); }
    });

    return lastMessage;
}

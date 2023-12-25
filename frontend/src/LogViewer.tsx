import { MessageType, useLastMessage, useLastMessageRaw, useWebsocketState } from "./websocket"

export function LogViewer() {
    const log = useLastMessageRaw(MessageType.LOG_SNAPSHOT, buffer => {
        const firstLine = buffer.readUint8();
        const lineCount = buffer.readUint8();
        const lineLength = buffer.readUint8();
        const linesStart = buffer.pos;
        const lines: string[] = [];
        for (let i = 0; i < lineCount; i++) {
            const lineNr = (firstLine + i) % lineCount;
            buffer.pos = linesStart + lineNr * lineLength;
            lines.push(buffer.readStringZ());
        }
        return lines;
    });
    if (log.state === "loading")
        return log.placeholder;

    return <div>Log Viewer
        <pre>
            {log.value.join("\n")}
        </pre>
    </div>
}
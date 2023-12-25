import { buffer } from "stream/consumers";
import { BinaryReader, MessageType, sendMessage, sendMessageRaw, useLastMessageRaw } from "./websocket";
import { useState } from "react";

enum GuiElementType {
    ButtonElement
}

interface GuiElementBase {
    type: GuiElementType;
    x: number;
    y: number;
    colSpan: number;
    rowSpan: number;
}

interface ButtonElement extends GuiElementBase {
    type: GuiElementType.ButtonElement;
    onClickThread: number;
    onPressThread: number;
    onReleaseThread: number;
    text: string;
}

type GuiElement = ButtonElement;

function readGuiElement(buffer: BinaryReader): GuiElementBase {
    const result = {
        type: buffer.readUint8() as GuiElementType,
        x: buffer.readUint8(),
        y: buffer.readUint8(),
        colSpan: buffer.readUint8(),
        rowSpan: buffer.readUint8(),
    }
    return result;
}

function triggerCallback(threadId: number) {
    console.log("Triggering callback " + threadId);
    sendMessageRaw(MessageType.BASIC_TRIGGER_CALLBACK, writer => { writer.writeUint16(threadId); });
}

function DisplayElement({ element }: { element: GuiElement }) {
    switch (element.type) {
        case GuiElementType.ButtonElement:
            return <button type="button" className="btn btn-secondary"
                onClick={() => { triggerCallback(element.onClickThread); }}
                onMouseDown={() => { triggerCallback(element.onPressThread); }}
                onMouseUp={() => { triggerCallback(element.onReleaseThread); }}
                onTouchStart={() => { triggerCallback(element.onPressThread); }}
                onTouchEnd={() => { triggerCallback(element.onReleaseThread); }}
            >{element.text}</button>
        default:
            return <div>
                Unknown element type {element.type}
            </div>
    }
}

export function GuiDisplay() {
    const gui = useLastMessageRaw(MessageType.UI_SNAPSHOT, buffer => {
        const elementCount = buffer.readUint8();
        const elements: GuiElement[] = [];

        for (let i = 0; i < elementCount; i++) {
            const guiElement = readGuiElement(buffer);

            switch (guiElement.type) {
                case GuiElementType.ButtonElement:
                    const buttonElement: ButtonElement = {
                        ...guiElement,
                        onClickThread: buffer.readUint16(),
                        onPressThread: buffer.readUint16(),
                        onReleaseThread: buffer.readUint16(),
                        text: buffer.readStringN(),
                    }
                    elements.push(buttonElement);
                    break;
                default:
                    throw new Error("Unknown GUI element type " + guiElement.type);
            }
        }
        return elements;
    });
    if (gui.state === "loading")
        return gui.placeholder;

    return <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }} id="gui-viewer">GUI Viewer
        <div style={{ flexGrow: 1, display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gridTemplateRows: "repeat(12, 1fr)" }}>
            {gui.value.map((element, index) =>
                <div className="ui-cell" key={index} style={{
                    gridColumn: `${element.x} / span ${element.colSpan}`,
                    gridRow: `${element.y} / span ${element.rowSpan}`,
                }}>
                    <DisplayElement element={element} />
                </div>)}
        </div>
    </div>
}
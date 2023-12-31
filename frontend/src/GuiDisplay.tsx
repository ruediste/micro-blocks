import { buffer } from "stream/consumers";
import { BinaryReader, MessageType, sendMessage, sendMessageRaw, useLastMessageRaw } from "./websocket";
import { useState } from "react";

enum GuiElementType {
    ButtonElement,
    TextElement,
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
interface TextElement extends GuiElementBase {
    type: GuiElementType.TextElement;
    text: string;
}

type GuiElement = ButtonElement | TextElement;

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

function isElementOfType<TT extends GuiElementType, T extends GuiElement & { type: TT }>(element: T, type: TT): element is T {
    return element.type == type;
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
        case GuiElementType.TextElement:
            return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'lightGray' }} >{element.text}</div>
        default:
            return <div >
                Unknown element type {(element as any).type}
            </div>
    }
}

export function GuiDisplay() {
    const gui = useLastMessageRaw(MessageType.UI_SNAPSHOT, buffer => {
        const elementCount = buffer.readUint8();
        const elements: GuiElement[] = [];

        for (let i = 0; i < elementCount; i++) {
            const base = readGuiElement(buffer);

            switch (base.type) {
                case GuiElementType.ButtonElement: {
                    const buttonElement: ButtonElement = {
                        ...base,
                        type: base.type,
                        onClickThread: buffer.readUint16(),
                        onPressThread: buffer.readUint16(),
                        onReleaseThread: buffer.readUint16(),
                        text: buffer.readStringN(),
                    }
                    elements.push(buttonElement);
                    break;
                }
                case GuiElementType.TextElement: {
                    const buttonElement: TextElement = {
                        ...base,
                        type: base.type,
                        text: buffer.readStringN(),
                    }
                    elements.push(buttonElement);
                    break;
                }
                default:
                    throw new Error("Unknown GUI element type " + base.type);
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
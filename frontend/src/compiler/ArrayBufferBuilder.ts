import { append } from "blockly/core/serialization/blocks";
import functionTable, { functionByNumber, functionCallers } from "./functionTable";
import { BlockCode, BlockType, VariableInfo } from "./compile";

export type ArrayBufferSegment = {
    start: number // inclusive
    end: number // exclusive
} | ArrayBufferSegment[];

export interface FunctionInfos {
    [key: number]: {
        stackDelta: number
    }
}

export type CallArgument = { type: 'Boolean', value: boolean } | BlockCode<'Boolean'>
    | { type: 'Number', value: number } | BlockCode<'Number'> | (VariableInfo & { type: 'Number' })
    | { type: 'uint16', value: number }
    | { type: 'uint8', value: number };

export class ArrayBufferBuilder {
    private buffer = new DataView(new ArrayBuffer(1 << 20)); // one megabyte should do for now, and should not hurt any device running a browser 
    private end = 0
    private appending = false;
    private partStart = 0;

    private segments: ArrayBufferSegment[] = [];

    functionInfos: FunctionInfos = {}

    get isAppending() { return this.appending }

    startSegment() {
        if (this.appending)
            throw new Error("There is still an unclosed appender")

        this.partStart = this.end;
        this.segments = [];
        this.appending = true;
    }

    private endPart() {
        this.checkAppending();
        if (this.end === this.partStart)
            return;
        this.segments.push({ start: this.partStart, end: this.end });
        this.partStart = this.end;
    }

    endSegment(): ArrayBufferSegment {
        this.endPart();
        this.appending = false;
        return this.segments.length === 1 ? this.segments[0] : this.segments;
    }

    addSegment(segment: ArrayBufferSegment) {
        this.endPart();
        this.segments.push(segment);
    }

    private checkAppending() {
        if (!this.appending)
            throw new Error("Appender has already been completed")
    }

    public addUint8(value: number) {
        this.checkAppending();
        this.buffer.setUint8(this.end++, value);
    };

    public addUint16(value: number) {
        this.checkAppending();
        this.buffer.setUint16(this.end, value, true);
        this.end += 2;
    };
    public addFloat(value: number) {
        this.checkAppending();
        this.buffer.setFloat32(this.end, value, true);
        this.end += 4;
    };

    private addOpcodeWithParameter(opcode: number, parameter: number, signed: boolean) {
        if (signed) {
            if (parameter >= -(2 ** 3) && parameter < 2 ** 3) {
                // parameter fits into the opcode
                this.addUint8(opcode << 6 | (parameter & 0xf))
            }
            else if (parameter >= -(2 ** 11) && parameter < 2 ** 11) {
                // use one additional byte
                this.addUint8(opcode << 6 | 0b01 << 4 | (parameter >> 8 & 0xf));
                this.addUint8(parameter & 0xff);
            }
            else if (parameter >= -(2 ** 19) && parameter < 2 ** 19) {
                // use two additional bytes
                this.addUint8(opcode << 6 | 0b10 << 4 | (parameter >> 16 & 0xf));
                this.addUint8(parameter & 0xff);
                this.addUint8(parameter >> 8 & 0xff);
            }
            else throw new Error("Parameter " + parameter + " is out of range")
        } else {
            if (parameter < 2 ** 4) {
                // parameter fits into the opcode
                this.addUint8(opcode << 6 | (parameter & 0xf))
            }
            else if (parameter < 2 ** 12) {
                // use one additional byte
                this.addUint8(opcode << 6 | 0b01 << 4 | (parameter >> 8 & 0xf));
                this.addUint8(parameter & 0xff);
            }
            else if (parameter < 2 ** 20) {
                // use two additional bytes
                this.addUint8(opcode << 6 | 0b10 << 4 | (parameter >> 16 & 0xf));
                this.addUint8(parameter & 0xff);
                this.addUint8(parameter >> 8 & 0xff);
            }
            else throw new Error("Parameter " + parameter + " is out of range")
        }
    }

    addPushUint8(value: number) {
        this.addOpcodeWithParameter(0b00, 1, false);
        this.addUint8(value);
    }
    addPushUint16(value: number) {
        this.addOpcodeWithParameter(0b00, 2, false);
        this.addUint16(value);
    }
    addPushFloat(value: number) {
        this.addOpcodeWithParameter(0b00, 4, false);
        this.addFloat(value);
    }

    addPush(view: DataView) {
        this.addOpcodeWithParameter(0b00, view.byteLength, false);
        for (let i = 0; i < view.byteLength; i++)
            this.addUint8(view.getUint8(i));
    }
    addJump(offset: number) { this.addOpcodeWithParameter(0b01, offset, true) }
    addJz(offset: number) { this.addOpcodeWithParameter(0b10, offset, true) }
    addRawCall(functionNr: number) { this.addOpcodeWithParameter(0b11, functionNr, false) }



    addCall(functionNumber: number, retType: BlockType | null, ...args: CallArgument[]) {
        let stackDelta = 0;
        args.forEach(x => {
            switch (x.type) {
                case 'uint8':
                    stackDelta--;
                    this.addPushUint8(x.value);
                    break;
                case 'Boolean':
                    stackDelta--;
                    if ('code' in x)
                        this.addSegment(x.code)
                    else
                        this.addPushUint8(x.value ? 1 : 0);
                    break;
                case 'Number':
                    stackDelta -= 4;
                    if ('code' in x)
                        this.addSegment(x.code)
                    else if ('offset' in x)
                        functionCallers.variablesGetVar32(this, x);
                    else
                        this.addPushFloat(x.value);
                    break;
                case 'uint16':
                    stackDelta -= 2;
                    this.addPushUint16(x.value);
                    break;
                default:
                    throw new Error("Unknown type " + x);
            }
        });
        this.addRawCall(functionNumber);
        switch (retType) {
            case 'Boolean': stackDelta++; break;
            case 'Number': stackDelta += 4; break;
        }
        const existingInfo = this.functionInfos[functionNumber];
        if (existingInfo !== undefined) {
            if (existingInfo.stackDelta !== stackDelta) {
                throw new Error("Function " + functionByNumber[functionNumber] + "(" + functionNumber + ") was previously used with a stack delta of " + existingInfo.stackDelta + " but now with a stack delta of " + stackDelta)
            }
        } else
            this.functionInfos[functionNumber] = { stackDelta: stackDelta };
    }

    public size(segment: ArrayBufferSegment): number {
        if (Array.isArray(segment))
            return segment.map(x => this.size(x)).reduce((a, b) => a + b, 0);
        else
            return segment.end - segment.start;
    }

    private append(segment: ArrayBufferSegment, pos: number, output: DataView): number {
        if (Array.isArray(segment))
            for (const x of segment) {
                pos = this.append(x, pos, output);
            }
        else {
            for (let i = segment.start; i < segment.end; i++)
                output.setUint8(pos++, this.buffer.getUint8(i));
        }
        return pos;
    }

    toBuffer(segment: ArrayBufferSegment) {
        const size = this.size(segment);
        const buffer = new ArrayBuffer(size);
        const output = new DataView(buffer);
        this.append(segment, 0, output);
        return buffer;
    }
}
import { BlockCode, BlockType, VariableInfo } from "./blockCodeGenerator";
import { functionByNumber, functionCallers } from "./functionTable";

export interface FunctionInfos {
    [key: number]: {
        stackDelta: number
    }
}


export type CallArgument = { type: 'Boolean', value: boolean } | BlockCode<'Boolean'>
    | { type: 'Number', value: number } | BlockCode<'Number'> | (VariableInfo & { type: 'Number' })
    | { type: 'uint16', value: number }
    | { type: 'uint8', value: number }
    | BlockCode<'String'> | (VariableInfo & { type: 'String' });


export class CodeBuilder {
    segments: { start: number, end: number }[] = [];

    constructor(private buffer: CodeBuffer) {
    }

    private withBuffer(action: (buffer: CodeBuffer) => void) {
        if (this.segments.length == 0 || this.segments[this.segments.length - 1].end != this.buffer.end)
            this.segments.push({ start: this.buffer.end, end: this.buffer.end });
        action(this.buffer);
        this.segments[this.segments.length - 1].end = this.buffer.end;
    }

    public toBuffer() {
        const size = this.size();
        const outputBuffer = new ArrayBuffer(size);
        const output = new DataView(outputBuffer);
        let pos = 0
        this.segments.forEach(segment => {
            for (let i = segment.start; i < segment.end; i++)
                output.setUint8(pos++, this.buffer.data.getUint8(i));
        });
        return outputBuffer;
    }


    public size(): number {
        return this.segments.map(x => x.end - x.start).reduce((a, b) => a + b, 0);
    }


    public addUint8(value: number) {
        this.withBuffer(buffer => {
            buffer.data.setUint8(buffer.end++, value);
        });
        return this;
    };

    public addUint8Array(value: Uint8Array) {
        this.withBuffer(buffer => {
            for (let i = 0; i < value.length; i++)
                buffer.data.setUint8(buffer.end++, value[i]);
        });
        return this;
    }

    public addUint16(value: number) {
        this.withBuffer(buffer => {
            buffer.data.setUint16(buffer.end, value, true);
            buffer.end += 2;
        });
        return this;
    };
    public addFloat(value: number) {
        this.withBuffer(buffer => {
            buffer.data.setFloat32(buffer.end, value, true);
            buffer.end += 4;
        });
        return this;
    };

    private addOpcodeWithParameter(opcode: number, parameter: number, signed: boolean) {
        if (signed) {
            if (parameter >= -(2 ** 3) && parameter < 2 ** 3) {
                // parameter fits into the opcode
                this.addUint8((opcode << 6) | (parameter & 0xf))
            }
            else if (parameter >= -(2 ** 11) && parameter < 2 ** 11) {
                // use one additional byte
                this.addUint8((opcode << 6) | (0b01 << 4) | (parameter >> 8 & 0xf));
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
        return this;
    }
    addPushUint16(value: number) {
        this.addOpcodeWithParameter(0b00, 2, false);
        this.addUint16(value);
        return this;
    }
    addPushFloat(value: number) {
        this.addOpcodeWithParameter(0b00, 4, false);
        this.addFloat(value);
        return this;
    }

    addPush(view: DataView) {
        this.addOpcodeWithParameter(0b00, view.byteLength, false);
        for (let i = 0; i < view.byteLength; i++)
            this.addUint8(view.getUint8(i));
        return this;
    }
    addJump(offset: number) { this.addOpcodeWithParameter(0b01, offset, true); return this; }
    addJz(offset: number) { this.addOpcodeWithParameter(0b10, offset, true); return this; }
    addRawCall(functionNr: number) { this.addOpcodeWithParameter(0b11, functionNr, false); return this; }

    addSegment(...codeBuilders: CodeBuilder[]) {
        codeBuilders.forEach(code => this.segments.push(...code.segments));
        return this;
    }

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
                case 'String':
                    stackDelta -= 4;
                    if ('code' in x)
                        this.addSegment(x.code)
                    else if ('offset' in x)
                        functionCallers.variablesGetResourceHandle(this, x);
                    break;
                case 'uint16':
                    stackDelta -= 2;
                    this.addPushUint16(x.value);
                    break;
                default:
                    throw new Error("Unknown type " + (x as any).type);
            }
        });
        this.addRawCall(functionNumber);
        switch (retType) {
            case 'Boolean': stackDelta++; break;
            case 'Number': stackDelta += 4; break;
            case 'String': stackDelta += 4; break;
        }
        const existingInfo = this.buffer.functionInfos[functionNumber];
        if (existingInfo !== undefined) {
            if (existingInfo.stackDelta !== stackDelta) {
                throw new Error("Function " + functionByNumber[functionNumber] + "(" + functionNumber + ") was previously used with a stack delta of " + existingInfo.stackDelta + " but now with a stack delta of " + stackDelta)
            }
        } else
            this.buffer.functionInfos[functionNumber] = { stackDelta: stackDelta };
        return this;
    }
}

export class CodeBuffer {
    public data = new DataView(new ArrayBuffer(1 << 20)); // one megabyte should do for now, and should not hurt any device running a browser 
    public end = 0
    functionInfos: FunctionInfos = {}

    startSegment(action?: (code: CodeBuilder) => void) {
        const code = new CodeBuilder(this);
        action?.(code);
        return code;
    }
}
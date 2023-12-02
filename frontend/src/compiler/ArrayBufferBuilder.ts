import { append } from "blockly/core/serialization/blocks";

export type ArrayBufferSegment = {
    start: number // inclusive
    end: number // exclusive
} | ArrayBufferSegment[];


export class ArrayBufferBuilder {
    private buffer = new DataView(new ArrayBuffer(1 << 20)); // one megabyte should do for now, and should not hurt any device running a browser 
    private end = 0
    private appending = false;
    private segmentStart = 0;

    startSegment() {
        if (this.appending)
            throw new Error("There is still an unclosed appender")

        this.segmentStart = this.end;
        this.appending = true;
    }

    endSegment(): ArrayBufferSegment {
        this.checkNotCompleted();
        this.appending = false;
        return { start: this.segmentStart, end: this.end };
    }


    private checkNotCompleted() {
        if (!this.appending)
            throw new Error("Appender has already been completed")
    }

    public addUint8(value: number) {
        this.checkNotCompleted();
        this.buffer.setUint8(this.end++, value);
    };
    public addUint16(value: number) {
        this.checkNotCompleted();
        this.buffer.setUint16(this.end, value, true);
        this.end += 2;
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
    addPush(view: DataView) {
        this.addOpcodeWithParameter(0b00, view.byteLength, false);
        for (let i = 0; i < view.byteLength; i++)
            this.addUint8(view.getUint8(i));
    }
    addJump(offset: number) { this.addOpcodeWithParameter(0b01, offset, true) }
    addJz(offset: number) { this.addOpcodeWithParameter(0b10, offset, true) }
    addCall(functionNumber: number) { this.addOpcodeWithParameter(0b11, functionNumber, false) }



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
import Blockly, { BlocklyOptions } from 'blockly';

type ArrayBufferSegment = {
    start: number // inclusive
    end: number // exclusive
} | ArrayBufferSegment[];


class ArrayBufferBuilder {
    private buffer = new DataView(new ArrayBuffer(1 << 20)); // one megabyte should do for now, and should not hurt any device running a browser 
    private end = 0
    private appending = false;

    addSegment() {
        if (this.appending)
            throw new Error("There is still an unclosed appender")

        const segmentStart = this.end;
        this.appending = true;
        let completed = false;

        const checkNotCompleted = () => {
            if (completed)
                throw new Error("Appender has already been completed")
        }
        const addUint8 = (value: number) => {
            checkNotCompleted();
            return this.buffer.setUint8(this.end++, value);
        };
        const addUint16 = (value: number) => {
            checkNotCompleted();
            this.buffer.setUint16(this.end, value, true);
            this.end += 2;
        };

        const addOpcodeWithParameter = (opcode: number, parameter: number, signed: boolean) => {
            if (signed) {
                if (parameter >= -(2 ** 3) && parameter < 2 ** 3) {
                    // parameter fits into the opcode
                    addUint8(opcode << 6 | (parameter & 0xf))
                }
                else if (parameter >= -(2 ** 11) && parameter < 2 ** 11) {
                    // use one additional byte
                    addUint8(opcode << 6 | 0b01 << 4 | (parameter >> 8 & 0xf));
                    addUint8(parameter & 0xff);
                }
                else if (parameter >= -(2 ** 19) && parameter < 2 ** 19) {
                    // use two additional bytes
                    addUint8(opcode << 6 | 0b10 << 4 | (parameter >> 16 & 0xf));
                    addUint8(parameter & 0xff);
                    addUint8(parameter >> 8 & 0xff);
                }
                else throw new Error("Parameter " + parameter + " is out of range")
            } else {
                if (parameter < 2 ** 4) {
                    // parameter fits into the opcode
                    addUint8(opcode << 6 | (parameter & 0xf))
                }
                else if (parameter < 2 ** 12) {
                    // use one additional byte
                    addUint8(opcode << 6 | 0b01 << 4 | (parameter >> 8 & 0xf));
                    addUint8(parameter & 0xff);
                }
                else if (parameter < 2 ** 20) {
                    // use two additional bytes
                    addUint8(opcode << 6 | 0b10 << 4 | (parameter >> 16 & 0xf));
                    addUint8(parameter & 0xff);
                    addUint8(parameter >> 8 & 0xff);
                }
                else throw new Error("Parameter " + parameter + " is out of range")
            }
        }

        return {
            addUint8,
            addUint16,
            addYield: () => addUint8(0x00),
            addPushUint8: (value: number) => {
                addOpcodeWithParameter(0b00, 1, false);
                addUint8(value);
            },
            addPushUint16: (value: number) => {
                addOpcodeWithParameter(0b00, 2, false);
                addUint16(value);
            },
            addPush: (view: DataView) => {
                addOpcodeWithParameter(0b00, view.byteLength, false);
                for (let i = 0; i < view.byteLength; i++)
                    addUint8(view.getUint8(i));
            },
            addJump: (offset: number) => addOpcodeWithParameter(0b01, offset, true),
            addJz: (offset: number) => addOpcodeWithParameter(0b10, offset, true),
            addCall: (functionNumber: number) => addOpcodeWithParameter(0b11, functionNumber, false),

            build: () => {
                if (!completed) {
                    this.appending = false;
                    completed = true;
                }
                return { start: segmentStart, end: this.end };
            }
        }
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
        const output = new DataView(new ArrayBuffer(size));
        this.append(segment, 0, output);
        return output;
    }
}

type BlockType = "on_pin_change" | "set_pin" | "logic_boolean";

interface ThreadInfo {
    block: Blockly.Block
    maxStack?: number;
    code?: DataView;
}

const functionTable = {
    waitForPinChange: 0,
    setPin: 1,
};

type BlockCodeGenerator = (block: Blockly.Block, buffer: ArrayBufferBuilder) => { segment: ArrayBufferSegment, maxStack: number };

const blockCodeGenerators: { [type in BlockType]: BlockCodeGenerator } = {
    on_pin_change: (block, buffer) => {
        const setup = buffer.addSegment();
        setup.addPushUint8(block.getFieldValue('PIN'));
        setup.addCall(functionTable.waitForPinChange);
        setup.addYield();
        const setupSegment = setup.build();

        const body = generateCodeForSequence(block.getInputTargetBlock('BODY')!, buffer);

        const loop = buffer.addSegment();
        loop.addJump(-(buffer.size(setupSegment) + buffer.size(body.segment)));

        return { segment: [setupSegment, body.segment, loop.build()], maxStack: Math.max(1, body.maxStack) };
    },

    set_pin: (block, buffer) => {
        const segments: ArrayBufferSegment[] = [];

        let code = buffer.addSegment();
        code.addPushUint8(block.getFieldValue('PIN'));
        segments.push(code.build());

        const value = generateCodeForBlock(block.getInputTargetBlock('VALUE')!, buffer);
        segments.push(value.segment);

        code = buffer.addSegment();
        code.addCall(functionTable.setPin);
        segments.push(code.build());

        return { segment: segments, maxStack: value.maxStack + 1 };
    },

    logic_boolean: (block, buffer) => {
        let code = buffer.addSegment();
        code.addPushUint8(block.getFieldValue('BOOL') === 'TRUE' ? 1 : 0);
        return { segment: code.build(), maxStack: 1 };
    },
}

function generateCodeForBlock(block: Blockly.Block, buffer: ArrayBufferBuilder) {
    const generator = blockCodeGenerators[block.type as BlockType];
    if (generator === undefined) {
        throw new Error("No block code generator defined for " + block.type)
    }

    return generator(block, buffer);
}

function generateCodeForSequence(firstBlock: Blockly.Block, buffer: ArrayBufferBuilder) {
    let maxStack = 0;
    const segments: ArrayBufferSegment[] = [];
    let block: Blockly.Block | null = firstBlock;
    while (block != null) {
        const { segment: childSegment, maxStack: childMaxStack } = generateCodeForBlock(block, buffer);
        segments.push(childSegment);
        maxStack = Math.max(maxStack, childMaxStack);
        block = block.getNextBlock();
    }
    return { segment: segments, maxStack };
}

function generateCodeForThread(thread: ThreadInfo, buffer: ArrayBufferBuilder) {
    const code = generateCodeForBlock(thread.block, buffer);
    thread.code = buffer.toBuffer(code.segment);
    thread.maxStack = code.maxStack;
}


function disassemble(code: DataView) {
    const result: string[] = [];

    let pos = 0;

    function extractParameter(opcode: number, signed: boolean): number {
        let parameter;
        if (signed)
            parameter = (opcode & 0xf) | ((opcode & 0b1000) ? ~0xf : 0)
        else
            parameter = opcode & 0xf;

        switch (opcode >> 4 & 0b11) {
            case 0b00: return parameter;
            case 0b01: return parameter << 8 | code.getInt8(pos++);
            case 0b10:
                pos += 2;
                return parameter << 16 | code.getInt16(pos - 2, true);
            default: throw new Error("Invalid opcode " + opcode);
        }
    }

    while (pos < code.byteLength) {
        const prefix = pos + ": ";
        const opcode = code.getUint8(pos++);

        if (opcode === 0) {
            result.push(prefix + "yield");
            continue;
        }
        const instruction = opcode >> 6 & 0b11;
        switch (instruction) {
            case 0b00: {
                const count = extractParameter(opcode, false);
                let str = prefix + "push ";
                for (let i = 0; i < count; i++) {
                    str += " " + code.getUint8(pos++);
                }
                result.push(str);
            } break;
            case 0b01: result.push(prefix + "jump " + extractParameter(opcode, true)); break;
            case 0b10: result.push(prefix + "jz " + extractParameter(opcode, true)); break;
            case 0b11: result.push(prefix + "call " + extractParameter(opcode, false)); break;
        }
    }
    return result.join("\n");
}

export default function compile(workspace: Blockly.Workspace) {
    try {
        const buffer = new ArrayBufferBuilder();
        const threads: ThreadInfo[] = workspace.getTopBlocks().map(block => ({ block }));
        threads.forEach(thread => generateCodeForThread(thread, buffer));
        threads.forEach((thread, threadNr) => {
            console.log("Thread " + threadNr)
            console.log(disassemble(thread.code!));
        })
    } catch (e) {
        console.error(e);
    }
}
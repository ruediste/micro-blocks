import Blockly, { BlocklyOptions } from 'blockly';
import { ArrayBufferBuilder, ArrayBufferSegment, FunctionInfos } from './ArrayBufferBuilder';

type BlockCodeGenerator = (block: Blockly.Block, buffer: ArrayBufferBuilder) => ArrayBufferSegment;
export const blockCodeGenerators: { [type: string]: BlockCodeGenerator } = {}

interface ThreadInfo {
    nr: number;
    block: Blockly.Block
    maxStack?: number;
    code?: ArrayBufferSegment;
    codeOffset?: number;
    stackOffset?: number;
}

export function generateCodeForBlock(block: Blockly.Block, buffer: ArrayBufferBuilder) {
    const generator = blockCodeGenerators[block.type];
    if (generator === undefined) {
        throw new Error("No block code generator defined for " + block.type)
    }

    return generator(block, buffer);
}

export function generateCodeForSequence(firstBlock: Blockly.Block, buffer: ArrayBufferBuilder): ArrayBufferSegment {
    const segments: ArrayBufferSegment[] = [];
    let block: Blockly.Block | null = firstBlock;
    while (block != null) {
        segments.push(generateCodeForBlock(block, buffer));
        block = block.getNextBlock();
    }
    return segments;
}

class MaxStackSizeCalculator {
    maxStackSize = 0;
    private stackSizes: { [key: number]: number } = {}
    constructor(private code: DataView, private functionInfos: FunctionInfos) {
        this.process(0, 0);
    }

    process(pos: number, stackSize: number) {
        const expectedStackSize = this.stackSizes[pos];
        if (expectedStackSize !== undefined) {
            if (expectedStackSize != stackSize)
                throw new Error("pos " + pos + ": previous stack size was " + expectedStackSize + " but reached position again with stack size " + stackSize)
            return
        }
        else
            this.stackSizes[pos] = stackSize;

        while (pos < this.code.byteLength) {
            const prefix = pos + ": ";
            const instruction = decodeInstruction(this.code, pos)
            switch (instruction.opcode) {
                case "push": stackSize += instruction.count; pos = instruction.nextPc; break;
                case "jump": this.process(instruction.jumpTarget, stackSize); return;
                case "jz": pos = instruction.nextPc; this.process(instruction.jumpTarget, stackSize); break;
                case "call": pos = instruction.nextPc; stackSize += this.functionInfos[instruction.functionNumber].stackDelta; break;
            }
            if (stackSize > this.maxStackSize) {
                this.maxStackSize = stackSize;
            }
        }
    }
}

function generateCodeForThread(thread: ThreadInfo, buffer: ArrayBufferBuilder) {
    thread.code = generateCodeForBlock(thread.block, buffer);

    const code = new DataView(buffer.toBuffer(thread.code));
    console.log("Thread " + thread.nr)
    console.log(disassemble(code));
    thread.maxStack = new MaxStackSizeCalculator(code, buffer.functionInfos).maxStackSize;
    console.log("MaxStack: " + thread.maxStack)
}

function decodeInstruction(code: DataView, pc: number): { nextPc: number } & (
    { opcode: 'push', count: number }
    | { opcode: 'jump', offset: number, jumpTarget: number }
    | { opcode: 'jz', offset: number, jumpTarget: number }
    | { opcode: 'call', functionNumber: number }
) {
    function extractArgument(opcode: number, signed: boolean): number {
        let argument;
        if (signed)
            argument = (opcode & 0xf) | ((opcode & 0b1000) ? ~0xf : 0)
        else
            argument = opcode & 0xf;

        switch (opcode >> 4 & 0b11) {
            case 0b00: return argument;
            case 0b01: return argument << 8 | code.getInt8(pc++);
            case 0b10: return argument << 16 | code.getInt8(pc++) | code.getInt8(pc++) << 8;
            default: throw new Error("Invalid opcode " + opcode);
        }
    }
    const startPc = pc;
    const opcode = code.getUint8(pc++);
    switch (opcode >> 6 & 0b11) {
        case 0b00: {
            const count = extractArgument(opcode, false);
            pc += count;
            return { nextPc: pc, opcode: 'push', count }
        }
        case 0b01: {
            const offset = extractArgument(opcode, true);
            return { nextPc: pc, opcode: 'jump', offset, jumpTarget: offset > 0 ? pc + offset : startPc + offset }
        }
        case 0b10: {
            const offset = extractArgument(opcode, true);
            return { nextPc: pc, opcode: 'jz', offset, jumpTarget: offset > 0 ? pc + offset : startPc + offset }
        }
        case 0b11: {
            const functionNumber = extractArgument(opcode, false);
            return { nextPc: pc, opcode: 'call', functionNumber }
        }
        default:
            throw new Error("Unknown instruction");
    }
}

function disassemble(code: DataView) {
    const result: string[] = [];

    let pos = 0;

    while (pos < code.byteLength) {
        const prefix = pos + ": ";
        const instruction = decodeInstruction(code, pos)
        switch (instruction.opcode) {
            case "push": {
                let str = prefix + "push ";
                for (let i = 0; i < instruction.count; i++) {
                    str += " " + code.getUint8(instruction.nextPc - instruction.count + i);
                }
                result.push(str);
            } break;
            case "jump": result.push(prefix + "jump " + instruction.jumpTarget); break;
            case "jz": result.push(prefix + "jz " + instruction.jumpTarget); break;
            case "call": result.push(prefix + "call " + instruction.functionNumber); break;
        }
        pos = instruction.nextPc;
    }

    return result.join("\n");
}

export default function compile(workspace: Blockly.Workspace): ArrayBuffer | undefined {
    try {
        const buffer = new ArrayBufferBuilder();
        const threads: ThreadInfo[] = workspace.getTopBlocks().map((block, nr) => ({ block, nr }));
        threads.forEach(thread => generateCodeForThread(thread, buffer));
        const headerSize = 7;
        const threadTableSize = threads.length * 4;
        const codeStart = headerSize + threadTableSize;
        const globalVariablesSize = 0;
        let codeOffset = codeStart;
        let stackOffset = globalVariablesSize;
        threads.forEach((thread, threadNr) => {
            thread.codeOffset = codeOffset;
            codeOffset += buffer.size(thread.code!);
            thread.stackOffset = stackOffset;
            stackOffset += thread.maxStack!;
        });

        const segments: ArrayBufferSegment[] = [];
        buffer.startSegment();
        buffer.addUint8(0x4d);
        buffer.addUint8(0x42);
        buffer.addUint8(0);
        buffer.addUint16(threads.length);
        buffer.addUint16(stackOffset);

        console.log("Thread Offsets: " + threads.map(t => t.codeOffset))

        threads.forEach(thread => {
            buffer.addUint16(thread.codeOffset!);
            buffer.addUint16(thread.stackOffset!);
        })
        segments.push(buffer.endSegment());
        threads.forEach(thread => segments.push(thread.code!));

        return buffer.toBuffer(segments);
    } catch (e) {
        console.error(e);
    }
}
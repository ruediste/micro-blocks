import Blockly, { BlocklyOptions, FieldVariable } from 'blockly';
import { ArrayBufferBuilder, ArrayBufferSegment, FunctionInfos } from './ArrayBufferBuilder';
import { functionByNumber } from './functionTable';

export interface VariableInfo {
    type: "Number"
    offset: number
}

export type VariableInfos = {
    [key: string]: VariableInfo
}

export interface BlockCodeGeneratorContext {
    variables: VariableInfos
    expectedType: BlockType

    getVariable: (block: Blockly.Block, name: string) => VariableInfo
}
type BlockCodeGenerator = (block: Blockly.Block, buffer: ArrayBufferBuilder, ctx: BlockCodeGeneratorContext) => BlockCode<BlockType>;
export const blockCodeGenerators: { [type: string]: BlockCodeGenerator } = {}

interface ThreadInfo {
    nr: number;
    block: Blockly.Block
    maxStack?: number;
    code?: ArrayBufferSegment;
    codeOffset?: number;
    stackOffset?: number;
}

export type BlockType =
    'Boolean' // a boolean represented as uint8
    | 'Number' // a number represented as float
    | null // the block does not push a value on the stack
    ;

export interface BlockCode<T extends BlockType> {
    code: ArrayBufferSegment;
    type: T
}

export function generateCodeForBlock<T extends BlockType>(type: T | undefined, block: Blockly.Block | null, buffer: ArrayBufferBuilder, ctx: BlockCodeGeneratorContext): { code: ArrayBufferSegment, type: T } {
    if (buffer.isAppending) {
        throw new Error("Cannot generate code while generating a segment")
    }
    if (block == null) {
        if (type === undefined) {
            throw new Error("No type expected and block is null, cannot create a default value");
        }
        buffer.startSegment();
        switch (type) {
            case null: break;
            case 'Boolean': buffer.addPushUint8(0); break;
            case 'Number': buffer.addPushFloat(0); break;
        }
        return { code: buffer.endSegment(), type }
    }

    const generator = blockCodeGenerators[block.type];
    if (generator === undefined) {
        throw new Error("No block code generator defined for " + block.type)
    }

    const result = generator(block, buffer, type === undefined ? ctx : { ...ctx, expectedType: type });
    if (type !== undefined && result.type != type) {
        throw new Error("Expected block " + block.type + " to generate type " + type + " but got " + result.type);
    }

    return result as any;
}

export function generateCodeForSequence(firstBlock: Blockly.Block | null, buffer: ArrayBufferBuilder, ctx: BlockCodeGeneratorContext): ArrayBufferSegment {
    const segments: ArrayBufferSegment[] = [];
    let block: Blockly.Block | null = firstBlock;
    while (block != null) {
        const code = generateCodeForBlock(null, block, buffer, ctx);
        if (code.type !== null) {
            throw new Error("Expected block not to push anything to the stack but got " + code.type);
        }
        segments.push(code.code);
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
                case "jz": pos = instruction.nextPc; stackSize--; this.process(instruction.jumpTarget, stackSize); break;
                case "call": pos = instruction.nextPc; stackSize += this.functionInfos[instruction.functionNumber].stackDelta; break;
            }
            if (stackSize > this.maxStackSize) {
                this.maxStackSize = stackSize;
            }
        }
    }
}

function generateCodeForThread(thread: ThreadInfo, buffer: ArrayBufferBuilder, ctx: BlockCodeGeneratorContext) {
    thread.code = generateCodeForBlock(null, thread.block, buffer, ctx).code;

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
            default: throw new Error("Invalid opcode " + opcode + " at pos " + pc);
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
            return { nextPc: pc, opcode: 'jump', offset, jumpTarget: offset >= 0 ? pc + offset : startPc + offset }
        }
        case 0b10: {
            const offset = extractArgument(opcode, true);
            return { nextPc: pc, opcode: 'jz', offset, jumpTarget: offset >= 0 ? pc + offset : startPc + offset }
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
    // output as hex
    console.log(Array.from(new Uint8Array(code.buffer, 0, code.byteLength)).map(x => x.toString(16).padStart(2, '0')).join(" "));
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
            case "call": result.push(prefix + "call " + instruction.functionNumber + " (" + functionByNumber[instruction.functionNumber] + ")"); break;
        }
        pos = instruction.nextPc;
    }

    return result.join("\n");
}

export default function compile(workspace: Blockly.Workspace): ArrayBuffer | undefined {
    try {
        const buffer = new ArrayBufferBuilder();

        let globalVariablesSize = 0;
        const variableInfos: VariableInfos = {};
        workspace.getAllVariables().forEach((variable) => {
            console.log(variable)
            variableInfos[variable.name] = { type: variable.type as any, offset: globalVariablesSize };
            globalVariablesSize += 4;
        });
        const threads: ThreadInfo[] = workspace.getTopBlocks().filter(block => block.isEnabled()).map((block, nr) => ({ block, nr }));
        threads.forEach(thread => generateCodeForThread(thread, buffer, { variables: variableInfos, expectedType: null, getVariable: (block, name) => variableInfos[(block.getField('VAR') as FieldVariable).getVariable()!.name] }));
        const headerSize = 7;
        const threadTableSize = threads.length * 4;
        const codeStart = headerSize + threadTableSize;
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
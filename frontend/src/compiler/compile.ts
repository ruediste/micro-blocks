import Blockly, { FieldVariable } from 'blockly';
import functionTable, { functionByNumber, functionCallers } from './functionTable';
import { CodeBuffer, CodeBuilder, FunctionInfos } from './CodeBuffer';
import { BlockCodeGeneratorContext, BlockData, BlockType, ThreadCodeGenerator, VariableInfo, VariableInfos, blockCodeGenerators, threadExtractors } from './blockCodeGenerator';
import '../modules'
import { loadString } from '../modules/text';
export * from './blockCodeGenerator';

export const NO_THREAD = 0xffff;

interface ThreadInfo {
    nr?: number;
    maxStack?: number;
    code?: CodeBuilder;
    codeOffset?: number;
    stackOffset?: number;
    codeGenerator: ThreadCodeGenerator;
}

export function generateCodeForBlock<T extends BlockType>(type: T | undefined, block: Blockly.Block | null, buffer: CodeBuffer, ctx: BlockCodeGeneratorContext): { code: CodeBuilder, type: T } {
    if (block == null) {
        if (type === undefined) {
            throw new Error("No type expected and block is null, cannot create a default value");
        }
        const code = buffer.startSegment();
        switch (type) {
            case null: break;
            case 'Boolean': code.addPushUint8(0); break;
            case 'Number': code.addPushFloat(0); break;
            case 'Colour': code.addPushFloat(0); code.addPushFloat(0); code.addPushFloat(0); break;
            case 'String': return loadString('', buffer, ctx) as any;
            default: throw new Error("Unknown type " + type);
        }
        return { code, type }
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

export function generateCodeForSequence(firstBlock: Blockly.Block | null, buffer: CodeBuffer, ctx: BlockCodeGeneratorContext): CodeBuilder {
    const result = buffer.startSegment();
    let block: Blockly.Block | null = firstBlock;
    while (block != null) {
        const code = generateCodeForBlock(null, block, buffer, ctx);
        if (code.type !== null) {
            throw new Error("Expected block not to push anything to the stack but got " + code.type);
        }
        result.addSegment(code.code);
        block = block.getNextBlock();
    }
    return result;
}

class StackSizeCalculator {
    maxStackSize = 0;
    stackSizes: { [key: number]: number } = {}

    errors: string[] = [];

    constructor(private code: DataView, private functionInfos: FunctionInfos) {
        this.process(0, 0);
    }

    private process(pos: number, stackSize: number) {
        while (pos < this.code.byteLength) {
            const instPos = pos;


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
            const expectedStackSize = this.stackSizes[instPos];
            if (expectedStackSize !== undefined) {
                if (expectedStackSize != stackSize)
                    this.errors.push("pos " + instPos + ": previous stack size was " + expectedStackSize + " but reached position again with stack size " + stackSize)
                return;
            }
            else
                this.stackSizes[instPos] = stackSize;
        }
    }
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
            case 0b01: return argument << 8 | code.getUint8(pc++);
            case 0b10: return argument << 16 | code.getUint8(pc++) | code.getUint8(pc++) << 8;
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

function toHexDump(code: DataView, start: number, end: number) {
    let result = '';
    for (let i = start; i < end; i++) {
        result += code.getUint8(i).toString(16).padStart(2, '0') + ' ';
    }
    return result;
}

function disassemble(code: DataView, stackSizeCalculator: StackSizeCalculator) {
    const result: string[] = [];
    // output as hex
    console.log(toHexDump(code, 0, code.byteLength));
    let pos = 0;
    while (pos < code.byteLength) {
        const instruction = decodeInstruction(code, pos);
        let instr: string = '';
        switch (instruction.opcode) {
            case "push": {
                instr = "push ";
                for (let i = 0; i < instruction.count; i++) {
                    instr += " " + code.getUint8(instruction.nextPc - instruction.count + i);
                }
            } break;
            case "jump": instr = "jump " + instruction.jumpTarget; break;
            case "jz": instr = "jz " + instruction.jumpTarget; break;
            case "call": instr = "call " + instruction.functionNumber + " (" + functionByNumber[instruction.functionNumber] + ")"; break;
            default: throw new Error("Unknown instruction " + (instruction as any).opcode + " at pos " + pos);
        }
        result.push(pos + ": " + instr + (stackSizeCalculator.stackSizes[pos] !== undefined ? " (SS:" + stackSizeCalculator.stackSizes[pos] + ")" : "")
            + " | " + toHexDump(code, pos, instruction.nextPc));
        pos = instruction.nextPc;
    }

    return result.join("\n");
}

export default function compile(workspace: Blockly.Workspace): ArrayBuffer | undefined {
    try {
        const buffer = new CodeBuffer();

        let globalVariablesSize = 0;
        const variableInfos: VariableInfos = {};
        workspace.getAllVariables().forEach((variable) => {
            variableInfos[variable.name] = new VariableInfo(variable.type as any, globalVariablesSize);
            if (variable.type === "Boolean")
                globalVariablesSize++;
            if (variable.type === "Colour")
                globalVariablesSize += 12;
            else
                globalVariablesSize += 4;
        });
        const constantPool = buffer.startSegment();

        const blockData = new BlockData();

        const threads: ThreadInfo[] = [];
        const addThread = (codeGenerator: ThreadCodeGenerator) => {
            const nr = threads.length;
            threads.push({ codeGenerator });
            return nr;
        };

        addThread((buffer, ctx) => {
            const code = buffer.startSegment();
            Object.values(variableInfos).forEach(variable => {
                if (variable.is("String")) {
                    functionCallers.variablesSetResourceHandle(code, variable, loadString('', buffer, ctx));
                }
            });
            code.addCall(functionTable.basicEndThread, null);
            return code;
        });

        workspace.getAllBlocks().forEach(block => {
            const extractor = threadExtractors[block.type];
            if (extractor != null) {
                extractor(block, addThread, { blockData })
            }
        });

        threads.forEach((thread, nr) => thread.nr = nr);

        const headerSize = 7;
        const threadTableSize = threads.length * 4;
        const constantPoolStart = headerSize + threadTableSize;
        let constantPoolOffset = constantPoolStart;

        const ctx: BlockCodeGeneratorContext = {
            variables: variableInfos,
            expectedType: null,
            getVariable: (block, name) => variableInfos[(block.getField('VAR') as FieldVariable).getVariable()!.name],
            addToConstantPool: action => {
                const offset = constantPoolOffset;
                const entry = buffer.startSegment();
                action(entry);
                constantPool.addSegment(entry);
                constantPoolOffset += entry.size();
                return offset;
            },
            blockData
        }
        threads.forEach(thread => thread.code = thread.codeGenerator(buffer, ctx));

        threads.forEach(thread => {
            const code = new DataView(thread.code!.toBuffer());
            console.log("Thread " + thread.nr)
            const stackSizeCalculator = new StackSizeCalculator(code, buffer.functionInfos);
            console.log(disassemble(code, stackSizeCalculator));
            if (stackSizeCalculator.errors.length > 0) {
                throw new Error("Stack size errors:\n" + stackSizeCalculator.errors.join("\n"));
            }
            thread.maxStack = stackSizeCalculator.maxStackSize;
            console.log("MaxStack: " + thread.maxStack)
        });

        const codeStart = constantPoolOffset;
        let codeOffset = codeStart;
        let stackOffset = globalVariablesSize;
        threads.forEach((thread, threadNr) => {
            thread.codeOffset = codeOffset;
            codeOffset += thread.code!.size();
            thread.stackOffset = stackOffset;
            stackOffset += thread.maxStack!;
        });

        const code = buffer.startSegment();
        code.addUint8(0x4d);
        code.addUint8(0x42);
        code.addUint8(0);
        code.addUint16(threads.length);
        code.addUint16(stackOffset);

        console.log("Thread Offsets: " + threads.map(t => t.codeOffset))

        threads.forEach(thread => {
            code.addUint16(thread.codeOffset!);
            code.addUint16(thread.stackOffset!);
        })

        code.addSegment(constantPool);

        threads.forEach(thread => code.addSegment(thread.code!));


        return code.toBuffer();
    } catch (e) {
        console.error(e);
    }
}
import Blockly, { BlocklyOptions } from 'blockly';
import blockCodeGenerators from './blockCodegenerators';
import { ArrayBufferBuilder, ArrayBufferSegment } from './ArrayBufferBuilder';

interface ThreadInfo {
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

export function generateCodeForSequence(firstBlock: Blockly.Block, buffer: ArrayBufferBuilder) {
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
    thread.code = code.segment;
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

export default function compile(workspace: Blockly.Workspace): ArrayBuffer | undefined {
    try {
        const buffer = new ArrayBufferBuilder();
        const threads: ThreadInfo[] = workspace.getTopBlocks().map(block => ({ block }));
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

        threads.forEach(thread => {
            buffer.addUint16(thread.codeOffset!);
            buffer.addUint16(thread.stackOffset!);
        })
        segments.push(buffer.endSegment());
        threads.forEach(thread => segments.push(thread.code!));

        threads.forEach((thread, threadNr) => {
            console.log("Thread " + threadNr + " offset: " + thread.codeOffset)
            console.log(disassemble(new DataView(buffer.toBuffer(thread.code!))));
        })

        return buffer.toBuffer(segments);
    } catch (e) {
        console.error(e);
    }
}
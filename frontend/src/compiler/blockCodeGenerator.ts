import { CodeBuffer, CodeBuilder } from "./CodeBuffer";
import Blockly from 'blockly';

type VariableType = "Number" | "String" | "Boolean" | "Colour";
export class VariableInfo {
    constructor(public type: VariableType, public offset: number) {
    }

    is<T extends VariableType>(t: T): this is VariableInfo & { type: T } {
        return this.type === t;
    }
}


export type BlockType =
    'Boolean' // a boolean represented as uint8
    | 'Number' // a number represented as float
    | 'Colour' // a colour represented as three floats (r,g,b). On the stack, b is topmost
    | 'String' // a string represented as a pointer to a string object
    | null // the block does not push a value on the stack
    ;

export interface BlockCode<T extends BlockType> {
    code: CodeBuilder;
    type: T
}

export type VariableInfos = {
    [key: string]: VariableInfo
}

export interface BlockCodeGeneratorContext {
    variables: VariableInfos
    expectedType: BlockType
    getVariable: (block: Blockly.Block, name: string) => VariableInfo,
    addToConstantPool: (action: (code: CodeBuilder) => void) => number,
    blockData: BlockData
}

export class BlockData {
    data: { [key: string]: any } = {}

    get(block: Blockly.Block) {
        return this.data[block.id];
    }

    set(block: Blockly.Block, value: any) {
        this.data[block.id] = value;
    }
}

export type ThreadCodeGenerator = (buffer: CodeBuffer, ctx: BlockCodeGeneratorContext) => CodeBuilder;
type BlockCodeGenerator = (block: Blockly.Block, buffer: CodeBuffer, ctx: BlockCodeGeneratorContext) => BlockCode<BlockType>;

export const blockCodeGenerators: { [type: string]: BlockCodeGenerator } = {}
export const threadExtractors: { [type: string]: (block: Blockly.Block, addThread: (generator: ThreadCodeGenerator) => number, ctx: { blockData: BlockData }) => void } = {}

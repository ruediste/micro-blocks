import { CodeBuffer, CodeBuilder } from "./CodeBuffer";
import Blockly from 'blockly';

type VariableType = "Number" | "String";
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
    addToConstantPool: (action: (code: CodeBuilder) => void) => number
}
type BlockCodeGenerator = (block: Blockly.Block, buffer: CodeBuffer, ctx: BlockCodeGeneratorContext) => BlockCode<BlockType>;
export const blockCodeGenerators: { [type: string]: BlockCodeGenerator } = {}

import { string } from "blockly/core/utils";
import { CodeBuffer, CodeBuilder } from "./CodeBuffer";
import Blockly from 'blockly';
import { referenceableBlockTypes } from "../modules/blockReference";

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
    blockData: BlockData,
    nextId: () => number
}

export class BlockData {
    data: { [key: string]: any } = {}

    constructor(private workspace: Blockly.Workspace) {
    }

    get(block: Blockly.Block) {
        return this.data[block.id];
    }

    set(block: Blockly.Block, value: any) {
        this.data[block.id] = value;
    }

    getByBlockId(id: any): any {
        if (typeof id !== 'string') {
            return undefined;
        }
        const block = this.workspace.getBlockById(id);
        if (block == null)
            return undefined;
        return this.get(block);
    }
}

export type ThreadCodeGenerator = (buffer: CodeBuffer, ctx: BlockCodeGeneratorContext) => CodeBuilder;
type BlockCodeGenerator = (block: Blockly.Block, buffer: CodeBuffer, ctx: BlockCodeGeneratorContext) => BlockCode<BlockType>;

export interface StrictBlockRegistration {
    init: (this: Blockly.BlockSvg) => void
    onchange?: (this: Blockly.BlockSvg, event: Blockly.Events.Abstract) => void
}

export type WorkspaceData = { [key: string]: any }

export let workspaceData: WorkspaceData = {};

export function setWorkspaceData(data: WorkspaceData) {
    workspaceData = data;
}

/**
 * Order of invocation: threadExtractor, initGenerator, codeGenerator
 */
export interface BlockRegistration {
    block?: StrictBlockRegistration
    threadExtractor?: (block: Blockly.Block, addThread: (generator: ThreadCodeGenerator) => number, ctx: { blockData: BlockData }) => void
    initGenerator?: (block: Blockly.Block, buffer: CodeBuffer, ctx: BlockCodeGeneratorContext) => CodeBuilder
    codeGenerator?: BlockCodeGenerator
    referenceableBy?: string
}

export const blockRegistrations: { [type: string]: BlockRegistration } = {}
export function registerBlock(type: string, registration: BlockRegistration) {
    blockRegistrations[type] = registration;
    if (registration.block !== undefined) Blockly.Blocks[type] = registration.block;
    if (registration.referenceableBy !== undefined) referenceableBlockTypes[type] = registration.referenceableBy;
}

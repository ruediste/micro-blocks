import Blockly from 'blockly';
import { CodeBuffer } from "../compiler/CodeBuffer";
import { BlockCode, BlockCodeGeneratorContext, BlockType, generateCodeForBlock, registerBlock } from "../compiler/compile";
import functionTable, { functionCallers } from "../compiler/functionTable";
import { addCategory } from "../toolbox";

addCategory({
    'kind': 'category',
    'name': 'Text',
    'categorystyle': 'text_category',
    'contents': [
        {
            'type': 'text',
            'kind': 'block',
            'fields': {
                'TEXT': '',
            },
        },
        {
            'type': 'text_join',
            'kind': 'block',
        },
        {
            'type': 'text_print',
            'kind': 'block',
            'inputs': {
                'TEXT': {
                    'shadow': {
                        'type': 'text',
                        'fields': {
                            'TEXT': 'abc',
                        },
                    },
                },
            },
        },
    ]
});

const encoder = new TextEncoder();

export function loadString(value: string, buffer: CodeBuffer, ctx: BlockCodeGeneratorContext): BlockCode<'String'> {
    const offset = ctx.addToConstantPool(code => code.addUint8Array(encoder.encode(value)).addUint8(0))
    return { type: 'String', code: buffer.startSegment().addCall(functionTable.textLoad, 'String', { type: 'uint16', value: offset }) };
}

registerBlock('text', {
    codeGenerator: (block, buffer, ctx) => {
        const text = block.getFieldValue('TEXT') as string;
        return loadString(text, buffer, ctx);
    }
});

export function generateToString<T extends BlockType>(buffer: CodeBuffer, value: BlockCode<T>): BlockCode<'String'> {
    switch (value.type) {
        case 'Number':
            return { type: 'String', code: buffer.startSegment(code => functionCallers.textNumToString(code, value as any)) }
        case 'Colour':
            return { type: 'String', code: buffer.startSegment().addCall(functionTable.textColourToString, 'String', value as any) }
        case 'String':
            return value as any;
        case 'Boolean':
            return { type: 'String', code: buffer.startSegment(code => functionCallers.textBoolToString(code, value as any)) }
        default: throw new Error("Unknown type " + value.type);
    }
}

export function generateBlockToString(block: Blockly.Block, inputName: string, buffer: CodeBuffer, ctx: BlockCodeGeneratorContext): BlockCode<'String'> {
    return generateToString(buffer, generateCodeForBlock(undefined, block.getInputTargetBlock(inputName), buffer, ctx));
}

registerBlock('text_print', {
    codeGenerator: (block, buffer, ctx) => {
        return {
            type: null, code: buffer.startSegment().addCall(functionTable.textPrintString, null,
                generateBlockToString(block, 'TEXT', buffer, ctx))
        };
    }
});

registerBlock('text_join', {
    codeGenerator: (block, buffer, ctx) => {
        if (!block.getInput('ADD0')) {
            return loadString('', buffer, ctx);
        }

        const add0 = block.getInputTargetBlock('ADD0');
        let result = generateToString(buffer, add0 == null ? loadString('', buffer, ctx) : generateCodeForBlock(undefined, add0, buffer, ctx));

        for (let n = 1; block.getInput('ADD' + n); n++) {
            const add = block.getInputTargetBlock('ADD' + n);
            const str = generateToString(buffer, add == null ? loadString('', buffer, ctx) : generateCodeForBlock(undefined, add, buffer, ctx));
            result = { type: 'String', code: buffer.startSegment(code => functionCallers.textJoinString(code, result, str)) };
        }
        return result;
    }
});
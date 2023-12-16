import { blockCodeGenerators, generateCodeForBlock } from "../compiler/compile";
import functionTable from "../compiler/functionTable";
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

blockCodeGenerators.text = (block, buffer, ctx) => {
    const text = block.getFieldValue('TEXT') as string;
    const offset = ctx.addToConstantPool(code => code.addUint8Array(encoder.encode(text)))
    return { type: 'String', code: buffer.startSegment().addCall(functionTable.textLoad, 'String', { type: 'uint16', value: offset }) };
};

blockCodeGenerators.text_print = (block, buffer, ctx) => {
    const text = generateCodeForBlock(undefined, block.getInputTargetBlock('TEXT'), buffer, ctx);
    console.log(text.type);
    switch (text.type) {
        case 'Number':
            return { type: null, code: buffer.startSegment().addCall(functionTable.textPrintNumber, null, text as any) };
        case 'String':
            return { type: null, code: buffer.startSegment().addCall(functionTable.textPrintString, null, text as any) };
        case 'Boolean':
            return { type: null, code: buffer.startSegment().addCall(functionTable.textPrintBool, null, text as any) };
        default: throw new Error("Unknown type " + text.type);
    }
};
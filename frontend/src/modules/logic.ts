import { BlockType, blockCodeGenerators, generateCodeForBlock } from "../compiler/compile";
import functionTable, { functionCallers } from "../compiler/functionTable";
import { addCategory } from "../toolbox";

addCategory({
    'kind': 'category',
    'name': 'Logic',
    'categorystyle': 'logic_category',
    'contents': [
        {
            'type': 'controls_if',
            'kind': 'block',
        },
        {
            'type': 'logic_compare',
            'kind': 'block',
            'fields': {
                'OP': 'EQ',
            },
        },
        {
            'type': 'logic_operation',
            'kind': 'block',
            'fields': {
                'OP': 'AND',
            },
        },
        {
            'type': 'logic_negate',
            'kind': 'block',
        },
        {
            'type': 'logic_boolean',
            'kind': 'block',
            'fields': {
                'BOOL': 'TRUE',
            },
        },
        {
            'type': 'logic_ternary',
            'kind': 'block',
        },
    ],
});

blockCodeGenerators.logic_boolean = (block, buffer) => {
    buffer.startSegment();
    buffer.addPushUint8(block.getFieldValue('BOOL') === 'TRUE' ? 1 : 0);
    return { type: "Boolean", code: buffer.endSegment() };
}


blockCodeGenerators.logic_compare = (block, buffer, ctx) => {
    const op = block.getFieldValue('OP') as 'EQ' | 'NEQ' | 'LT' | 'LTE' | 'GT' | 'GTE';
    const a = generateCodeForBlock('Number', block.getInputTargetBlock('A'), buffer, ctx);
    const b = generateCodeForBlock('Number', block.getInputTargetBlock('B'), buffer, ctx);
    buffer.startSegment();
    functionCallers.logicCompare(buffer, a, b, op);
    return { type: "Boolean", code: buffer.endSegment() };
}

blockCodeGenerators.logic_operation = (block, buffer, ctx) => {
    const op = block.getFieldValue('OP') as 'AND' | 'OR';
    const a = generateCodeForBlock('Boolean', block.getInputTargetBlock('A'), buffer, ctx);
    const b = generateCodeForBlock('Boolean', block.getInputTargetBlock('B'), buffer, ctx);
    buffer.startSegment();
    buffer.addCall(functionTable.logicOperation, 'Boolean', a, b, { type: 'uint8', value: { AND: 0, OR: 1 }[op] });
    return { type: "Boolean", code: buffer.endSegment() };
}

blockCodeGenerators.logic_negate = (block, buffer, ctx) => {
    const a = generateCodeForBlock('Boolean', block.getInputTargetBlock('BOOL'), buffer, ctx);
    buffer.startSegment();
    functionCallers.logicNegate(buffer, a);
    return { type: "Boolean", code: buffer.endSegment() };
}

blockCodeGenerators.logic_ternary = (block, buffer, ctx) => {
    // determine type
    const blockThen = block.getInputTargetBlock('THEN');
    const blockElse = block.getInputTargetBlock('ELSE');

    let codeThen = blockThen == null ? null : generateCodeForBlock(undefined, blockThen, buffer, ctx);
    let codeElse = blockElse == null ? null : generateCodeForBlock(undefined, blockElse, buffer, ctx);

    if (codeThen != null && codeElse != null && codeThen.type !== codeElse.type) {
        throw new Error('Type mismatch in ternary: then has type ' + codeThen.type + ' but else has type ' + codeElse.type);
    }

    if (codeThen == null && codeElse == null) {
        // try to generate code for the output
        return generateCodeForBlock(ctx.expectedType, null, buffer, ctx);
    }

    const type = codeThen?.type ?? codeElse!.type;

    codeThen = codeThen ?? generateCodeForBlock(type, null, buffer, ctx);
    codeElse = codeElse ?? generateCodeForBlock(type, null, buffer, ctx);


    const condition = generateCodeForBlock('Boolean', block.getInputTargetBlock('IF'), buffer, ctx).code;

    buffer.startSegment();
    buffer.addSegment(codeThen.code);
    buffer.addJump(buffer.size(codeElse.code))
    const thenJump = buffer.endSegment();

    buffer.startSegment();
    buffer.addSegment(condition);
    buffer.addJz(buffer.size(thenJump));
    buffer.addSegment(thenJump);
    buffer.addSegment(codeElse.code);

    return { type: type, code: buffer.endSegment() };
}
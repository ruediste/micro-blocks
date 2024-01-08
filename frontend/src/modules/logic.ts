import { generateCodeForBlock, registerBlock } from "../compiler/compile";
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

registerBlock('logic_boolean', {
    codeGenerator: (block, buffer, ctx) => {
        return { type: "Boolean", code: buffer.startSegment().addPushUint8(block.getFieldValue('BOOL') === 'TRUE' ? 1 : 0) };
    }
});


registerBlock('logic_compare', {
    codeGenerator: (block, buffer, ctx) => {
        const op = block.getFieldValue('OP') as 'EQ' | 'NEQ' | 'LT' | 'LTE' | 'GT' | 'GTE';
        const a = generateCodeForBlock('Number', block.getInputTargetBlock('A'), buffer, ctx);
        const b = generateCodeForBlock('Number', block.getInputTargetBlock('B'), buffer, ctx);
        return { type: "Boolean", code: buffer.startSegment(code => functionCallers.logicCompare(code, a, b, op)) };
    }
});

registerBlock('logic_operation', {
    codeGenerator: (block, buffer, ctx) => {
        const op = block.getFieldValue('OP') as 'AND' | 'OR';
        const a = generateCodeForBlock('Boolean', block.getInputTargetBlock('A'), buffer, ctx);
        const b = generateCodeForBlock('Boolean', block.getInputTargetBlock('B'), buffer, ctx);
        return { type: "Boolean", code: buffer.startSegment().addCall(functionTable.logicOperation, 'Boolean', a, b, { type: 'uint8', value: { AND: 0, OR: 1 }[op] }) };
    }
});

registerBlock('logic_negate', {
    codeGenerator: (block, buffer, ctx) => {
        const a = generateCodeForBlock('Boolean', block.getInputTargetBlock('BOOL'), buffer, ctx);
        return { type: "Boolean", code: buffer.startSegment(code => functionCallers.logicNegate(code, a)) };
    }
});

registerBlock('logic_ternary', {
    codeGenerator: (block, buffer, ctx) => {
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

        const thenJump = buffer.startSegment()
            .addSegment(codeThen.code)
            .addJump(codeElse.code.size());

        return {
            type: type, code: buffer.startSegment()
                .addSegment(condition)
                .addJz(thenJump.size())
                .addSegment(thenJump)
                .addSegment(codeElse.code)
        };
    }
});
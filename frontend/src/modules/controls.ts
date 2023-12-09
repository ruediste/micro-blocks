import { get } from "http";
import { ArrayBufferSegment } from "../compiler/ArrayBufferBuilder";
import { blockCodeGenerators, generateCodeForBlock, generateCodeForSequence } from "../compiler/compile";
import functionTable, { functionCallers } from "../compiler/functionTable";
import { addCategory } from "../toolbox";

addCategory({
    'kind': 'category',
    'name': 'Loops',
    'categorystyle': 'loop_category',
    'contents': [
        {
            'type': 'controls_repeat_ext',
            'kind': 'block',
            'inputs': {
                'TIMES': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 10,
                        },
                    },
                },
            },
        },
        {
            'type': 'controls_whileUntil',
            'kind': 'block',
            'fields': {
                'MODE': 'WHILE',
            },
        },
        {
            'type': 'controls_for',
            'kind': 'block',
            'fields': {
                'VAR': {
                    'name': 'i',
                    'type': 'Number',
                },
            },
            'inputs': {
                'FROM': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 1,
                        },
                    },
                },
                'TO': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 10,
                        },
                    },
                },
                'BY': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 1,
                        },
                    },
                },
            },
        },
        // {
        //     'type': 'controls_forEach',
        //     'kind': 'block',
        //     'fields': {
        //         'VAR': {
        //             'name': 'j',
        //         },
        //     },
        // },
    ],
});
blockCodeGenerators.controls_repeat_ext = (block, buffer, ctx) => {
    const times = generateCodeForBlock('Number', block.getInputTargetBlock('TIMES'), buffer, ctx);
    const body = generateCodeForSequence(block.getInputTargetBlock('DO'), buffer, ctx);

    buffer.startSegment();
    buffer.addSegment(body);
    buffer.addCall(functionTable.controlsRepeatExtDone, 'Boolean');
    const main = buffer.endSegment();

    buffer.startSegment();
    buffer.addJz(-buffer.size(main));
    buffer.addCall(functionTable.basicPop32, null, { type: 'Number', code: [] })
    const jump = buffer.endSegment();

    return { type: null, code: [times.code, main, jump] };
};

blockCodeGenerators.controls_if = (block, buffer, ctx) => {
    let n = 0;
    const branches: { condition: ArrayBufferSegment, doBlock: ArrayBufferSegment }[] = [];
    while (block.getInput('IF' + n)) {
        const condition = generateCodeForBlock('Boolean', block.getInputTargetBlock('IF' + n), buffer, ctx).code;
        const doBlock = generateCodeForSequence(block.getInputTargetBlock('DO' + n), buffer, ctx);
        branches.push({ condition, doBlock });
        n++;
    }
    const elseBlock = generateCodeForSequence(block.getInputTargetBlock('ELSE'), buffer, ctx);

    let segments: ArrayBufferSegment[] = [elseBlock];
    for (let i = branches.length - 1; i >= 0; i--) {
        const branch = branches[i];
        buffer.startSegment();
        buffer.addSegment(branch.doBlock);
        buffer.addJump(buffer.size(segments));
        const doJump = buffer.endSegment();

        buffer.startSegment();
        buffer.addSegment(branch.condition);
        buffer.addJz(buffer.size(doJump));

        segments = [buffer.endSegment(), doJump, ...segments];
    }
    return { type: null, code: segments };
};

blockCodeGenerators.controls_whileUntil = (block, buffer, ctx) => {
    const mode = block.getFieldValue('MODE') as 'WHILE' | 'UNTIL';
    const conditionBlock = generateCodeForBlock('Boolean', block.getInputTargetBlock('BOOL'), buffer, ctx);
    const body = generateCodeForSequence(block.getInputTargetBlock('DO'), buffer, ctx);

    let condition: ArrayBufferSegment;
    if (mode === 'WHILE') {
        buffer.startSegment();
        buffer.addCall(functionTable.logicNegate, 'Boolean', conditionBlock);
        condition = buffer.endSegment();
    }
    else {
        condition = conditionBlock.code;
    }

    buffer.startSegment();
    buffer.addJump(buffer.size(body));
    buffer.addSegment(body);
    buffer.addSegment(condition);
    buffer.addJz(-buffer.size([body, condition]));

    return { type: null, code: buffer.endSegment() };
}

blockCodeGenerators.controls_for = (block, buffer, ctx) => {
    const variable = ctx.getVariable(block, 'VAR')
    const from = generateCodeForBlock('Number', block.getInputTargetBlock('FROM'), buffer, ctx);
    const to = generateCodeForBlock('Number', block.getInputTargetBlock('TO'), buffer, ctx);
    const by = generateCodeForBlock('Number', block.getInputTargetBlock('BY'), buffer, ctx);
    const body = generateCodeForSequence(block.getInputTargetBlock('DO'), buffer, ctx);

    buffer.startSegment();
    functionCallers.mathBinary(buffer, variable, by, 'ADD');
    const getAndIncrement = { type: 'Number', code: buffer.endSegment() } as const;

    buffer.startSegment();
    buffer.addSegment(body);
    functionCallers.variablesSetVar32(buffer, variable, getAndIncrement);
    const main = buffer.endSegment();

    buffer.startSegment();
    functionCallers.logicCompare(buffer, variable, to, 'GTE');
    const condition = buffer.endSegment();


    buffer.startSegment();
    functionCallers.variablesSetVar32(buffer, variable, from);
    buffer.addJump(buffer.size(main));
    buffer.addSegment(main);
    buffer.addSegment(condition);
    buffer.addJz(-buffer.size([main, condition]));

    return { type: null, code: buffer.endSegment() };
}
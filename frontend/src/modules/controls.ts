import { CodeBuilder } from "../compiler/CodeBuffer";
import { VariableInfo, generateCodeForBlock, generateCodeForSequence, registerBlock } from "../compiler/compile";
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

registerBlock('controls_repeat_ext', {
    codeGenerator: (block, buffer, ctx) => {

        const times = generateCodeForBlock('Number', block.getInputTargetBlock('TIMES'), buffer, ctx);
        const main = buffer.startSegment(code => {
            code.addSegment(generateCodeForSequence(block.getInputTargetBlock('DO'), buffer, ctx));
            code.addCall(functionTable.controlsRepeatExtDone, 'Boolean');
        });

        return {
            type: null, code: buffer.startSegment(code => {
                code.addSegment(times.code);
                code.addSegment(main);
                code.addJz(-main.size());
                code.addCall(functionTable.basicPop32, null, { type: 'Number', code: buffer.startSegment() })
            })
        };
    }
});

registerBlock('controls_if', {
    codeGenerator: (block, buffer, ctx) => {
        let n = 0;
        const branches: { condition: CodeBuilder, doBlock: CodeBuilder }[] = [];
        while (block.getInput('IF' + n)) {
            const condition = generateCodeForBlock('Boolean', block.getInputTargetBlock('IF' + n), buffer, ctx).code;
            const doBlock = generateCodeForSequence(block.getInputTargetBlock('DO' + n), buffer, ctx);
            branches.push({ condition, doBlock });
            n++;
        }
        const elseBlock = generateCodeForSequence(block.getInputTargetBlock('ELSE'), buffer, ctx);


        let segments = buffer.startSegment();
        segments.addSegment(elseBlock);
        for (let i = branches.length - 1; i >= 0; i--) {
            const branch = branches[i];
            const doJump = buffer.startSegment(code => {
                code.addSegment(branch.doBlock);
                code.addJump(segments.size()); // jump to the end of the block after this branch
            });

            const branchJz = buffer.startSegment(code => {
                code.addSegment(branch.condition);
                code.addJz(doJump.size()); // if false, jump to the end of this branch, otherwise fall through into the code of this branch
            });

            segments = buffer.startSegment(code => {
                code.addSegment(branchJz);
                code.addSegment(doJump);
                code.addSegment(segments);
            });
        }
        return { type: null, code: segments };
    }
});

registerBlock('controls_whileUntil', {
    codeGenerator: (block, buffer, ctx) => {
        const mode = block.getFieldValue('MODE') as 'WHILE' | 'UNTIL';
        const conditionBlock = generateCodeForBlock('Boolean', block.getInputTargetBlock('BOOL'), buffer, ctx);
        const body = generateCodeForSequence(block.getInputTargetBlock('DO'), buffer, ctx);

        let condition: CodeBuilder;
        if (mode === 'WHILE') {
            condition = buffer.startSegment(code => code.addCall(functionTable.logicNegate, 'Boolean', conditionBlock));
        }
        else {
            condition = conditionBlock.code;
        }

        const code = buffer.startSegment();
        code.addJump(body.size());
        code.addSegment(body);
        code.addSegment(condition);
        code.addJz(-(body.size() + condition.size()));

        return { type: null, code };
    }
});

registerBlock('controls_for', {
    codeGenerator: (block, buffer, ctx) => {
        const variable = ctx.getVariable(block, 'VAR') as VariableInfo & { type: 'Number' };
        const from = generateCodeForBlock('Number', block.getInputTargetBlock('FROM'), buffer, ctx);
        const to = generateCodeForBlock('Number', block.getInputTargetBlock('TO'), buffer, ctx);
        const by = generateCodeForBlock('Number', block.getInputTargetBlock('BY'), buffer, ctx);
        const body = generateCodeForSequence(block.getInputTargetBlock('DO'), buffer, ctx);

        const getAndIncrement = { type: 'Number', code: buffer.startSegment(code => functionCallers.mathBinary(code, variable, by, 'ADD')) } as const;

        const main = buffer.startSegment(code => {
            code.addSegment(body);
            functionCallers.variablesSetVar32(code, variable, getAndIncrement);
        });

        const condition = buffer.startSegment(code => functionCallers.logicCompare(code, variable, to, 'GTE'));


        const code = buffer.startSegment();
        functionCallers.variablesSetVar32(code, variable, from);
        code.addJump(main.size());
        code.addSegment(main);
        code.addSegment(condition);
        code.addJz(-(main.size() + condition.size()));

        return { type: null, code };
    }
});
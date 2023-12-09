import { block } from "blockly/core/tooltip";
import { blockCodeGenerators, generateCodeForBlock } from "../compiler/compile";
import functionTable, { functionCallers } from "../compiler/functionTable";
import { addCategory } from "../toolbox";

addCategory({
    'kind': 'category',
    'name': 'Math',
    'categorystyle': 'math_category',
    'contents': [
        {
            'type': 'math_number',
            'kind': 'block',
            'fields': {
                'NUM': 123,
            },
        },
        {
            'type': 'math_arithmetic',
            'kind': 'block',
            'fields': {
                'OP': 'ADD',
            },
            'inputs': {
                'A': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 1,
                        },
                    },
                },
                'B': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 1,
                        },
                    },
                },
            },
        },
        {
            'type': 'math_single',
            'kind': 'block',
            'fields': {
                'OP': 'ROOT',
            },
            'inputs': {
                'NUM': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 9,
                        },
                    },
                },
            },
        },
        {
            'type': 'math_trig',
            'kind': 'block',
            'fields': {
                'OP': 'SIN',
            },
            'inputs': {
                'NUM': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 45,
                        },
                    },
                },
            },
        },
        {
            'type': 'math_constant',
            'kind': 'block',
            'fields': {
                'CONSTANT': 'PI',
            },
        },
        {
            'type': 'math_number_property',
            'kind': 'block',
            'fields': {
                'PROPERTY': 'EVEN',
            },
            'inputs': {
                'NUMBER_TO_CHECK': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 0,
                        },
                    },
                },
            },
        },
        {
            'type': 'math_round',
            'kind': 'block',
            'fields': {
                'OP': 'ROUND',
            },
            'inputs': {
                'NUM': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 3.1,
                        },
                    },
                },
            },
        },
        {
            'type': 'math_modulo',
            'kind': 'block',
            'inputs': {
                'DIVIDEND': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 64,
                        },
                    },
                },
                'DIVISOR': {
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
            'type': 'math_constrain',
            'kind': 'block',
            'inputs': {
                'VALUE': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 50,
                        },
                    },
                },
                'LOW': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 1,
                        },
                    },
                },
                'HIGH': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 100,
                        },
                    },
                },
            },
        },
        {
            'type': 'math_random_int',
            'kind': 'block',
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
                            'NUM': 100,
                        },
                    },
                },
            },
        },
        {
            'type': 'math_random_float',
            'kind': 'block',
        },
        {
            'type': 'math_atan2',
            'kind': 'block',
            'inputs': {
                'X': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 1,
                        },
                    },
                },
                'Y': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 1,
                        },
                    },
                },
            },
        },
    ],
});

blockCodeGenerators.math_arithmetic = (block, buffer, ctx) => {
    const op = block.getFieldValue('OP') as 'ADD' | 'MINUS' | 'MULTIPLY' | 'DIVIDE' | 'POWER';
    const left = generateCodeForBlock('Number', block.getInputTargetBlock('A'), buffer, ctx);
    const right = generateCodeForBlock('Number', block.getInputTargetBlock('B'), buffer, ctx);
    buffer.startSegment();
    functionCallers.mathBinary(buffer, left, right, op);
    return { type: 'Number', code: buffer.endSegment() }
}

blockCodeGenerators.math_number = (block, buffer, ctx) => {
    buffer.startSegment();
    buffer.addPushFloat(parseFloat(block.getFieldValue('NUM')));
    return { type: 'Number', code: buffer.endSegment() }
}

blockCodeGenerators.math_modulo = (block, buffer, ctx) => {
    const dividend = generateCodeForBlock('Number', block.getInputTargetBlock('DIVIDEND'), buffer, ctx);
    const divisor = generateCodeForBlock('Number', block.getInputTargetBlock('DIVISOR'), buffer, ctx);
    buffer.startSegment();
    functionCallers.mathBinary(buffer, dividend, divisor, 'MODULO');
    return { type: 'Number', code: buffer.endSegment() }
}

blockCodeGenerators.math_constant = (block, buffer, ctx) => {
    buffer.startSegment();
    switch (block.getFieldValue('CONSTANT')) {
        case 'PI':
            buffer.addPushFloat(Math.PI);
            break;
        case 'E':
            buffer.addPushFloat(Math.E);
            break;
        case 'GOLDEN_RATIO':
            buffer.addPushFloat(1.61803398875);
            break;
        case 'SQRT2':
            buffer.addPushFloat(Math.SQRT2);
            break;
        case 'SQRT1_2':
            buffer.addPushFloat(Math.SQRT1_2);
            break;
        case 'INFINITY':
            buffer.addPushFloat(Infinity);
            break;

    }
    return { type: 'Number', code: buffer.endSegment() }
}

blockCodeGenerators.math_number_property = (block, buffer, ctx) => {
    const number = generateCodeForBlock('Number', block.getInputTargetBlock('NUMBER_TO_CHECK'), buffer, ctx);
    const property = block.getFieldValue('PROPERTY') as 'EVEN' | 'ODD' | 'PRIME' | 'WHOLE' | 'POSITIVE' | 'NEGATIVE' | 'DIVISIBLE_BY';
    if (property === 'DIVISIBLE_BY') {
        const divisor = generateCodeForBlock('Number', block.getInputTargetBlock('DIVISOR'), buffer, ctx);
        buffer.startSegment();
        functionCallers.mathBinary(buffer, number, divisor, "MODULO");
        const remainder = { type: 'Number', code: buffer.endSegment() } as const

        buffer.startSegment();
        functionCallers.logicCompare(buffer, remainder, { type: 'Number', value: 0 }, 'EQ');
    }
    else {
        buffer.startSegment();
        buffer.addCall(functionTable.mathNumberProperty, 'Boolean', number, { type: 'uint8', value: { EVEN: 0, ODD: 1, PRIME: 2, WHOLE: 3, POSITIVE: 4, NEGATIVE: 5 }[property] })
    }

    return { type: 'Boolean', code: buffer.endSegment() }
}

blockCodeGenerators.math_trig = (block, buffer, ctx) => {
    const op = block.getFieldValue('OP') as 'SIN' | 'COS' | 'TAN' | 'ASIN' | 'ACOS' | 'ATAN';
    const num = generateCodeForBlock('Number', block.getInputTargetBlock('NUM'), buffer, ctx);
    buffer.startSegment();
    functionCallers.mathUnary(buffer, num, op);
    return { type: 'Number', code: buffer.endSegment() }
}

blockCodeGenerators.math_round = (block, buffer, ctx) => {
    const op = block.getFieldValue('OP') as 'ROUND' | 'ROUNDUP' | 'ROUNDDOWN';
    const num = generateCodeForBlock('Number', block.getInputTargetBlock('NUM'), buffer, ctx);
    buffer.startSegment();
    functionCallers.mathUnary(buffer, num, op);
    return { type: 'Number', code: buffer.endSegment() }
}

blockCodeGenerators.math_single = (block, buffer, ctx) => {
    const op = block.getFieldValue('OP') as 'ROOT' | 'ABS' | 'NEG' | 'LN' | 'LOG10' | 'EXP' | 'POW10';
    const num = generateCodeForBlock('Number', block.getInputTargetBlock('NUM'), buffer, ctx);
    buffer.startSegment();
    functionCallers.mathUnary(buffer, num, op);
    return { type: 'Number', code: buffer.endSegment() }
}

blockCodeGenerators.math_random_float = (block, buffer, ctx) => {
    buffer.startSegment();
    buffer.addCall(functionTable.mathRandomFloat, 'Number');
    return { type: 'Number', code: buffer.endSegment() }
}

blockCodeGenerators.math_random_int = (block, buffer, ctx) => {
    const left = generateCodeForBlock('Number', block.getInputTargetBlock('FROM'), buffer, ctx);
    const right = generateCodeForBlock('Number', block.getInputTargetBlock('TO'), buffer, ctx);
    buffer.startSegment();
    functionCallers.mathBinary(buffer, left, right, "RANDOM_INT");
    return { type: 'Number', code: buffer.endSegment() }
}

blockCodeGenerators.math_atan2 = (block, buffer, ctx) => {
    const left = generateCodeForBlock('Number', block.getInputTargetBlock('X'), buffer, ctx);
    const right = generateCodeForBlock('Number', block.getInputTargetBlock('Y'), buffer, ctx);
    buffer.startSegment();
    functionCallers.mathBinary(buffer, left, right, "ATAN2");
    return { type: 'Number', code: buffer.endSegment() }
}

blockCodeGenerators.math_constrain = (block, buffer, ctx) => {
    const value = generateCodeForBlock('Number', block.getInputTargetBlock('VALUE'), buffer, ctx);
    const low = generateCodeForBlock('Number', block.getInputTargetBlock('LOW'), buffer, ctx);
    const high = generateCodeForBlock('Number', block.getInputTargetBlock('HIGH'), buffer, ctx);
    buffer.startSegment();
    buffer.addCall(functionTable.mathConstrain, 'Number', value, low, high);
    return { type: 'Number', code: buffer.endSegment() }
}

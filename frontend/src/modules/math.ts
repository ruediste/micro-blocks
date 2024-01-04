import { block } from "blockly/core/tooltip";
import Blockly from 'blockly';
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
        {
            'type': 'math_map_linear',
            'kind': 'block',
            'inputs': {
                'X1': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 0,
                        },
                    },
                },

                'Y1': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 0,
                        },
                    },
                },

                'X2': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 1,
                        },
                    },
                },
                'Y2': {
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
            'type': 'math_map_temperature',
            'kind': 'block',
        }
    ],
});

blockCodeGenerators.math_arithmetic = (block, buffer, ctx) => {
    const op = block.getFieldValue('OP') as 'ADD' | 'MINUS' | 'MULTIPLY' | 'DIVIDE' | 'POWER';
    const left = generateCodeForBlock('Number', block.getInputTargetBlock('A'), buffer, ctx);
    const right = generateCodeForBlock('Number', block.getInputTargetBlock('B'), buffer, ctx);
    return { type: 'Number', code: buffer.startSegment(code => functionCallers.mathBinary(code, left, right, op)) }
}

blockCodeGenerators.math_number = (block, buffer, ctx) => {
    return { type: 'Number', code: buffer.startSegment().addPushFloat(parseFloat(block.getFieldValue('NUM'))) }
}

blockCodeGenerators.math_modulo = (block, buffer, ctx) => {
    const dividend = generateCodeForBlock('Number', block.getInputTargetBlock('DIVIDEND'), buffer, ctx);
    const divisor = generateCodeForBlock('Number', block.getInputTargetBlock('DIVISOR'), buffer, ctx);
    return { type: 'Number', code: buffer.startSegment(code => functionCallers.mathBinary(code, dividend, divisor, 'MODULO')) }
}

blockCodeGenerators.math_constant = (block, buffer, ctx) => {
    const code = buffer.startSegment();
    switch (block.getFieldValue('CONSTANT')) {
        case 'PI':
            code.addPushFloat(Math.PI);
            break;
        case 'E':
            code.addPushFloat(Math.E);
            break;
        case 'GOLDEN_RATIO':
            code.addPushFloat(1.61803398875);
            break;
        case 'SQRT2':
            code.addPushFloat(Math.SQRT2);
            break;
        case 'SQRT1_2':
            code.addPushFloat(Math.SQRT1_2);
            break;
        case 'INFINITY':
            code.addPushFloat(Infinity);
            break;

    }
    return { type: 'Number', code }
}

blockCodeGenerators.math_number_property = (block, buffer, ctx) => {
    const number = generateCodeForBlock('Number', block.getInputTargetBlock('NUMBER_TO_CHECK'), buffer, ctx);
    const property = block.getFieldValue('PROPERTY') as 'EVEN' | 'ODD' | 'PRIME' | 'WHOLE' | 'POSITIVE' | 'NEGATIVE' | 'DIVISIBLE_BY';
    const code = buffer.startSegment();
    if (property === 'DIVISIBLE_BY') {
        const divisor = generateCodeForBlock('Number', block.getInputTargetBlock('DIVISOR'), buffer, ctx);
        const remainder = { type: 'Number', code: buffer.startSegment(code => functionCallers.mathBinary(code, number, divisor, "MODULO")) } as const
        functionCallers.logicCompare(code, remainder, { type: 'Number', value: 0 }, 'EQ');
    }
    else {
        code.addCall(functionTable.mathNumberProperty, 'Boolean', number, { type: 'uint8', value: { EVEN: 0, ODD: 1, PRIME: 2, WHOLE: 3, POSITIVE: 4, NEGATIVE: 5 }[property] })
    }

    return { type: 'Boolean', code }
}

blockCodeGenerators.math_trig = (block, buffer, ctx) => {
    const op = block.getFieldValue('OP') as 'SIN' | 'COS' | 'TAN' | 'ASIN' | 'ACOS' | 'ATAN';
    const num = generateCodeForBlock('Number', block.getInputTargetBlock('NUM'), buffer, ctx);
    return { type: 'Number', code: buffer.startSegment(code => functionCallers.mathUnary(code, num, op)) }
}

blockCodeGenerators.math_round = (block, buffer, ctx) => {
    const op = block.getFieldValue('OP') as 'ROUND' | 'ROUNDUP' | 'ROUNDDOWN';
    const num = generateCodeForBlock('Number', block.getInputTargetBlock('NUM'), buffer, ctx);
    return { type: 'Number', code: buffer.startSegment(code => functionCallers.mathUnary(code, num, op)) }
}

blockCodeGenerators.math_single = (block, buffer, ctx) => {
    const op = block.getFieldValue('OP') as 'ROOT' | 'ABS' | 'NEG' | 'LN' | 'LOG10' | 'EXP' | 'POW10';
    const num = generateCodeForBlock('Number', block.getInputTargetBlock('NUM'), buffer, ctx);
    buffer.startSegment();
    return { type: 'Number', code: buffer.startSegment(code => functionCallers.mathUnary(code, num, op)) }
}

blockCodeGenerators.math_random_float = (block, buffer, ctx) => {
    return { type: 'Number', code: buffer.startSegment().addCall(functionTable.mathRandomFloat, 'Number') }
}

blockCodeGenerators.math_random_int = (block, buffer, ctx) => {
    const left = generateCodeForBlock('Number', block.getInputTargetBlock('FROM'), buffer, ctx);
    const right = generateCodeForBlock('Number', block.getInputTargetBlock('TO'), buffer, ctx);
    return { type: 'Number', code: buffer.startSegment(code => functionCallers.mathBinary(code, left, right, "RANDOM_INT")) }
}

blockCodeGenerators.math_atan2 = (block, buffer, ctx) => {
    const left = generateCodeForBlock('Number', block.getInputTargetBlock('X'), buffer, ctx);
    const right = generateCodeForBlock('Number', block.getInputTargetBlock('Y'), buffer, ctx);
    return { type: 'Number', code: buffer.startSegment(code => functionCallers.mathBinary(code, left, right, "ATAN2")) }
}

blockCodeGenerators.math_constrain = (block, buffer, ctx) => {
    const value = generateCodeForBlock('Number', block.getInputTargetBlock('VALUE'), buffer, ctx);
    const low = generateCodeForBlock('Number', block.getInputTargetBlock('LOW'), buffer, ctx);
    const high = generateCodeForBlock('Number', block.getInputTargetBlock('HIGH'), buffer, ctx);
    return { type: 'Number', code: buffer.startSegment().addCall(functionTable.mathConstrain, 'Number', value, low, high) }
}

Blockly.Blocks['math_map_linear'] = {
    init: function () {
        this.appendValueInput("VALUE")
            .setCheck("Number")
            .appendField("Map Linear");
        this.appendEndRowInput();
        this.appendValueInput("X1")
            .setCheck("Number")
            .appendField("In1");
        this.appendValueInput("Y1")
            .setCheck("Number")
            .appendField("Out1");
        this.appendEndRowInput();
        this.appendValueInput("X2")
            .setCheck("Number")
            .appendField("In2");
        this.appendValueInput("Y2")
            .setCheck("Number")
            .appendField("Out2");
        this.setOutput(true, "Number");

        this.setColour(230);
        this.setTooltip("");
        this.setHelpUrl("");
    }
};

blockCodeGenerators.math_map_linear = (block, buffer, ctx) => {
    return {
        type: 'Number', code: buffer.startSegment().addCall(functionTable.mathMapLinear, 'Number',
            generateCodeForBlock('Number', block.getInputTargetBlock('VALUE'), buffer, ctx),
            generateCodeForBlock('Number', block.getInputTargetBlock('X1'), buffer, ctx),
            generateCodeForBlock('Number', block.getInputTargetBlock('Y1'), buffer, ctx),
            generateCodeForBlock('Number', block.getInputTargetBlock('X2'), buffer, ctx),
            generateCodeForBlock('Number', block.getInputTargetBlock('Y2'), buffer, ctx),
        )
    };
};

Blockly.Blocks['math_map_temperature'] = {
    init: function () {
        this.appendValueInput("VALUE")
            .setCheck("Number")
            .appendField("Map Temperature");
        this.appendEndRowInput();
        this.appendEndRowInput()
            .appendField("Value 1")
            .appendField(new Blockly.FieldNumber(0.4), "X1")
            .appendField("Temp 1")
            .appendField(new Blockly.FieldNumber(20), "T1");
        this.appendEndRowInput()
            .appendField("Value 2")
            .appendField(new Blockly.FieldNumber(0.5), "X2")
            .appendField("Temp 2")
            .appendField(new Blockly.FieldNumber(30), "T2");
        this.setOutput(true, "Number");
        this.setColour(230);
        this.setTooltip("");
        this.setHelpUrl("");
    }
};

function toResistance(adcFraction: number) {
    if (Math.abs(1 - adcFraction) < 1e-6) {
        return 1e5;
    }
    return (adcFraction) / (1 - adcFraction);
}

blockCodeGenerators.math_map_temperature = (block, buffer, ctx) => {

    // steinhart-hart equation
    const logR1 = Math.log(toResistance(block.getFieldValue('X1')));
    const logR2 = Math.log(toResistance(block.getFieldValue('X2')));
    const t1_inv = 1 / (block.getFieldValue('T1') + 273.15);
    const t2_inv = 1 / (block.getFieldValue('T2') + 273.15);
    const logDiff = logR2 - logR1;

    let a: number
    let b: number
    if (Math.abs(logDiff) < 1e-6) {
        a = 1;
        b = 1;
    }
    else {
        b = (t2_inv - t1_inv) / (logR2 - logR1);
        a = t1_inv - logR1 * b;
    }

    return {
        type: 'Number', code: buffer.startSegment().addCall(functionTable.mathMapTemperature, 'Number',
            generateCodeForBlock('Number', block.getInputTargetBlock('VALUE'), buffer, ctx),
            { type: 'Number', value: a },
            { type: 'Number', value: b },
        )
    };
};
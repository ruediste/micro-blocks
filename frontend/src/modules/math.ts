import { ArrayBufferBuilder, ArrayBufferSegment, FunctionCallParameterValue } from "../compiler/ArrayBufferBuilder";
import { blockCodeGenerators, generateCodeForBlock } from "../compiler/compile";
import functionTable from "../compiler/functionTable";


blockCodeGenerators.math_arithmetic = (block, buffer, ctx) => {
    const op = block.getFieldValue('OP') as 'ADD' | 'MINUS' | 'MULTIPLY' | 'DIVIDE' | 'POWER';
    const left = generateCodeForBlock('Number', block.getInputTargetBlock('A'), buffer, ctx);
    const right = generateCodeForBlock('Number', block.getInputTargetBlock('B'), buffer, ctx);
    buffer.startSegment();
    buffer.addCall(functionTable.mathArithmetic, 'Number', left, right, { type: 'uint8', value: { ADD: 0, MINUS: 1, MULTIPLY: 2, DIVIDE: 3, POWER: 4 }[op] as number });
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
    buffer.addCall(functionTable.mathModulo, 'Number', dividend, divisor);
    return { type: 'Number', code: buffer.endSegment() }
}



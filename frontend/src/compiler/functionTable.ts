import { ArrayBufferBuilder, CallArgument } from "./ArrayBufferBuilder";
import { VariableInfo } from "./compile";

const functionTable = {
    basicYield: 0,
    pinSetupOnChange: 1,
    pinWaitForChange: 2,
    pinSet: 3,
    variablesSetVar32: 4,
    variablesGetVar32: 5,
    mathBinary: 6,
    logicCompare: 7,
    basicDelay: 9,
    controlsRepeatExtDone: 10,
    basicEndThread: 11,
    basicPop32: 12,
    logicOperation: 13,
    logicNegate: 14,
    mathNumberProperty: 15,
    mathUnary: 16,
    mathRandomFloat: 17,
    mathConstrain: 18,
    pinSetAnalog: 19,
    sensorGetGravityValue: 20,
}

const mathUnaryOperationTable = {
    // trig
    SIN: 0, COS: 1, TAN: 2, ASIN: 3, ACOS: 4, ATAN: 5,
    //round
    ROUND: 6, ROUNDUP: 7, ROUNDDOWN: 8,
    // single
    ROOT: 9, ABS: 10, NEG: 11, LN: 12, LOG10: 12, EXP: 14, POW10: 15
};

const mathBinaryOperationTable =
{
    // arithmetic
    ADD: 0, MINUS: 1, MULTIPLY: 2, DIVIDE: 3, POWER: 4,

    // various
    MODULO: 5,
    RANDOM_INT: 6,
    ATAN2: 7
}

export const functionCallers = {
    variablesSetVar32: (buffer: ArrayBufferBuilder, variable: VariableInfo, value: CallArgument & { type: 'Number' }) => buffer.addCall(functionTable.variablesSetVar32, null, { type: 'uint16', value: variable.offset }, value),
    logicNegate: (buffer: ArrayBufferBuilder, a: CallArgument & { type: 'Boolean' }) => buffer.addCall(functionTable.logicNegate, 'Boolean', a),
    mathBinary: (buffer: ArrayBufferBuilder, left: CallArgument & { type: 'Number' }, right: CallArgument & { type: 'Number' }, op: keyof typeof mathBinaryOperationTable) => buffer.addCall(functionTable.mathBinary, 'Number', left, right, { type: 'uint8', value: mathBinaryOperationTable[op] as number }),
    logicCompare: (buffer: ArrayBufferBuilder, a: CallArgument & { type: 'Number' }, b: CallArgument & { type: 'Number' }, op: 'EQ' | 'NEQ' | 'LT' | 'LTE' | 'GT' | 'GTE') => buffer.addCall(functionTable.logicCompare, 'Boolean', a, b, { type: 'uint8', value: { EQ: 0, NEQ: 1, LT: 2, LTE: 3, GT: 4, GTE: 5 }[op] }),
    variablesGetVar32: (buffer: ArrayBufferBuilder, variable: VariableInfo) => buffer.addCall(functionTable.variablesGetVar32, 'Number', { type: 'uint16', value: variable.offset }),
    mathUnary: (buffer: ArrayBufferBuilder, num: CallArgument & { type: 'Number' },
        op: keyof typeof mathUnaryOperationTable
    ) => buffer.addCall(functionTable.mathUnary, 'Number', num, {
        type: 'uint8', value: mathUnaryOperationTable[op]
    }),
}

export const functionByNumber = Object.entries(functionTable).reduce((acc, [key, value]) => {
    acc[value] = key;
    return acc;
}, {} as { [key: number]: string });

export default functionTable;
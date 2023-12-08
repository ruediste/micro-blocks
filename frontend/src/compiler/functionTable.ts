const functionTable = {
    basicYield: 0,
    pinSetupOnChange: 1,
    pinWaitForChange: 2,
    pinSet: 3,
    variablesSetVar32: 4,
    variablesGetVar32: 5,
    mathArithmetic: 6,
    logicCompare: 7,
    mathModulo: 8,
    basicDelay: 9,
    controlsRepeatExtDone: 10,
    basicEndThread: 11,
    basicPop32: 12,
    logicOperation: 13,
    logicNegate: 14,
}

export const functionByNumber = Object.entries(functionTable).reduce((acc, [key, value]) => {
    acc[value] = key;
    return acc;
}, {} as { [key: number]: string });

export default functionTable;
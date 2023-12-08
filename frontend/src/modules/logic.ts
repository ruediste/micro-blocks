import { BlockType, blockCodeGenerators, generateCodeForBlock } from "../compiler/compile";
import functionTable from "../compiler/functionTable";

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
    buffer.addCall(functionTable.logicCompare, 'Boolean', a, b, { type: 'uint8', value: { EQ: 0, NEQ: 1, LT: 2, LTE: 3, GT: 4, GTE: 5 }[op] });
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
    buffer.addCall(functionTable.logicNegate, 'Boolean', a);
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
        const outputCheck = block.outputConnection!.targetConnection?.getCheck()
        if (outputCheck != null && outputCheck.length > 0) {
            const type = outputCheck[0];
            return generateCodeForBlock(outputCheck[0] as BlockType, null, buffer, ctx);
        }
        throw new Error('Cannot determine type of ternary');
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
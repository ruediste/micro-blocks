import { ArrayBufferSegment } from "../compiler/ArrayBufferBuilder";
import { blockCodeGenerators, generateCodeForBlock, generateCodeForSequence } from "../compiler/compile";
import functionTable from "../compiler/functionTable";

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


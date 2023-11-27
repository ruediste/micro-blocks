import Blockly from 'blockly';
import functionTable from './functionTable';
import { generateCodeForBlock, generateCodeForSequence } from './compile';
import { ArrayBufferBuilder, ArrayBufferSegment } from './ArrayBufferBuilder';

type BlockCodeGenerator = (block: Blockly.Block, buffer: ArrayBufferBuilder) => { segment: ArrayBufferSegment, maxStack: number };

const blockCodeGenerators: { [type: string]: BlockCodeGenerator } = {
    on_pin_change: (block, buffer) => {
        buffer.startSegment();
        buffer.addPushUint8(block.getFieldValue('PIN'));
        buffer.addCall(functionTable.waitForPinChange);
        buffer.addYield();
        const setup = buffer.endSegment();

        const body = generateCodeForSequence(block.getInputTargetBlock('BODY')!, buffer);

        buffer.startSegment();
        buffer.addJump(-(buffer.size(setup) + buffer.size(body.segment)));
        const jump = buffer.endSegment();

        return { segment: [setup, body.segment, jump], maxStack: Math.max(1, body.maxStack) };
    },

    set_pin: (block, buffer) => {
        const segments: ArrayBufferSegment[] = [];

        buffer.startSegment();
        buffer.addPushUint8(block.getFieldValue('PIN'));
        segments.push(buffer.endSegment());

        const value = generateCodeForBlock(block.getInputTargetBlock('VALUE')!, buffer);
        segments.push(value.segment);

        buffer.startSegment();
        buffer.addCall(functionTable.setPin);
        segments.push(buffer.endSegment());

        return { segment: segments, maxStack: value.maxStack + 1 };
    },

    logic_boolean: (block, buffer) => {
        buffer.startSegment();
        buffer.addPushUint8(block.getFieldValue('BOOL') === 'TRUE' ? 1 : 0);
        return { segment: buffer.endSegment(), maxStack: 1 };
    },
}

export default blockCodeGenerators;
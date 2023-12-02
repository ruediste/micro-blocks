import Blockly from 'blockly';
import functionTable from './functionTable';
import { generateCodeForBlock, generateCodeForSequence } from './compile';
import { ArrayBufferBuilder, ArrayBufferSegment } from './ArrayBufferBuilder';

type BlockCodeGenerator = (block: Blockly.Block, buffer: ArrayBufferBuilder) => ArrayBufferSegment;

const blockCodeGenerators: { [type: string]: BlockCodeGenerator } = {
    on_pin_change: (block, buffer) => {
        buffer.startSegment();
        buffer.addCall('setupOnPinChange', null, { type: 'uint8', value: block.getFieldValue('PIN') });
        const setup = buffer.endSegment();

        buffer.startSegment();
        buffer.addCall('waitForPinChange', null);
        const wait = buffer.endSegment();
        const body = generateCodeForSequence(block.getInputTargetBlock('BODY')!, buffer);

        buffer.startSegment();
        buffer.addJump(-buffer.size([wait, body]));
        const jump = buffer.endSegment();

        return [setup, wait, body, jump];
    },

    set_pin: (block, buffer) => {
        const segments: ArrayBufferSegment[] = [];
        const value = generateCodeForBlock(block.getInputTargetBlock('VALUE')!, buffer);
        buffer.startSegment();
        buffer.addCall('setPin', null, { type: 'uint8', value: block.getFieldValue('PIN') }, { type: 'uint8', value: value });
        return buffer.endSegment()
    },

    logic_boolean: (block, buffer) => {
        buffer.startSegment();
        buffer.addPushUint8(block.getFieldValue('BOOL') === 'TRUE' ? 1 : 0);
        return buffer.endSegment()
    },
}

export default blockCodeGenerators;
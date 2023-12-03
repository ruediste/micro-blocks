import { blockCodeGenerators } from "../compiler/compile";

blockCodeGenerators.logic_boolean = (block, buffer) => {
    buffer.startSegment();
    buffer.addPushUint8(block.getFieldValue('BOOL') === 'TRUE' ? 1 : 0);
    return buffer.endSegment()
};
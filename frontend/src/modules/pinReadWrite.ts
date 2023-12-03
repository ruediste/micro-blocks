import { ArrayBufferSegment } from "../compiler/ArrayBufferBuilder";
import { blockCodeGenerators, generateCodeForBlock, generateCodeForSequence } from "../compiler/compile";
import Blockly from 'blockly';
import { addCategory } from "../toolbox";

addCategory({
    'kind': 'category',
    'name': 'Basic',
    'colour': "#f00",
    contents: [
        {
            'type': 'pin_on_change',
            'kind': 'block',
        },
        {
            'type': 'pin_set',
            'kind': 'block',
        },]
});


Blockly.Blocks['pin_on_change'] = {
    init: function () {
        this.appendEndRowInput()
            .appendField("On Pin")
            .appendField(new Blockly.FieldNumber(0), "PIN")
            .appendField("change");
        this.appendDummyInput()
            .appendField("Edge")
            .appendField(new Blockly.FieldDropdown([["raising", "RAISIN"], ["falling", "FALLING"], ["BOTH", "BOTH"]]), "EDGE")
            .appendField("Pull")
            .appendField(new Blockly.FieldDropdown([["up", "UP"], ["down", "DOWN"], ["none", "NONE"]]), "PULL")
        this.appendStatementInput("BODY")
            .setCheck(null);
        this.setColour(230);
        this.setTooltip("");
        this.setHelpUrl("");
    }
};

blockCodeGenerators.pin_on_change = (block, buffer) => {
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
};

Blockly.Blocks['pin_set'] = {
    init: function () {
        this.appendValueInput("VALUE")
            .setCheck("Boolean")
            .appendField("Set Pin")
            .appendField(new Blockly.FieldNumber(0, 0), "PIN")
            .appendField("to");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
        this.setTooltip("If the value is false or zero, set the pin to low, high otherwise");
        this.setHelpUrl("");
    }
};

blockCodeGenerators.pin_set = (block, buffer) => {
    const value = generateCodeForBlock(block.getInputTargetBlock('VALUE')!, buffer);
    buffer.startSegment();
    buffer.addCall('setPin', null, { type: 'uint8', value: block.getFieldValue('PIN') }, { type: 'uint8', value: value });
    return buffer.endSegment()
};


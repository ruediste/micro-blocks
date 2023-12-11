import compile, { blockCodeGenerators, generateCodeForBlock, generateCodeForSequence } from "../compiler/compile";
import Blockly from 'blockly';
import { addCategory } from "../toolbox";
import functionTable from "../compiler/functionTable";

addCategory({
    'kind': 'category',
    'name': 'Sensor',
    'colour': "#5b67a5",
    contents: [
        {
            'type': 'sensor_on_gravity_values',
            'kind': 'block',
        },
        {
            'type': 'sensor_get_gravity_value',
            'kind': 'block',
        },
    ]
});

Blockly.Blocks['sensor_on_gravity_values'] = {
    init: function () {
        this.appendEndRowInput()
            .appendField("On Gravity Values")
        this.appendStatementInput("BODY")
            .setCheck(null);
        this.setColour(230);
        this.setTooltip("");
        this.setHelpUrl("");
    }
};

blockCodeGenerators.sensor_on_gravity_values = (block, buffer, ctx) => {
    const body = generateCodeForSequence(block.getInputTargetBlock('BODY')!, buffer, ctx);

    buffer.startSegment();
    buffer.addCall(functionTable.sensorSetupOnGravityValues, null);
    const setup = buffer.endSegment();

    buffer.startSegment();
    buffer.addCall(functionTable.sensorWaitForGravityValues, null);
    buffer.addSegment(body);
    const main = buffer.endSegment();

    buffer.startSegment();
    buffer.addJump(-buffer.size([main]));
    return { type: null, code: [setup, main, buffer.endSegment()] };
};


Blockly.Blocks['sensor_get_gravity_value'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("Get Gravity Axis")
            .appendField(new Blockly.FieldDropdown([["x", "X"], ["y", "Z"], ["z", "Z"]]), "AXIS")
        this.setColour(230);
        this.setTooltip("");
        this.setHelpUrl("");
        this.setOutput('Number');
    }
};

blockCodeGenerators.sensor_get_gravity_value = (block, buffer, ctx) => {
    buffer.startSegment();
    buffer.addCall(functionTable.sensorGetGravityValue, 'Number',
        { type: 'uint8', value: { 'X': 0, 'Z': 1, 'Y': 2 }[block.getFieldValue('AXIS') as string]! },
    );
    return { type: 'Number', code: buffer.endSegment() };
};

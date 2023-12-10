import { blockCodeGenerators, generateCodeForBlock, generateCodeForSequence } from "../compiler/compile";
import Blockly from 'blockly';
import { addCategory } from "../toolbox";
import functionTable from "../compiler/functionTable";

addCategory({
    'kind': 'category',
    'name': 'Sensor',
    'colour': "#5b67a5",
    contents: [
        {
            'type': 'sensor_get_gravity_value',
            'kind': 'block',
        },
    ]
});


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

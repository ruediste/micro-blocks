import compile, { blockCodeGenerators, generateCodeForBlock, generateCodeForSequence } from "../compiler/compile";
import Blockly, { FieldDropdown } from 'blockly';
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
        {
            'type': 'sensor_tcs34725_config',
            'kind': 'block',
        },
        {
            'type': 'sensor_tcs34725_read',
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
    const main = buffer.startSegment()
        .addCall(functionTable.sensorWaitForGravityValues, null)
        .addSegment(generateCodeForSequence(block.getInputTargetBlock('BODY')!, buffer, ctx));

    return {
        type: null, code: buffer.startSegment()
            .addCall(functionTable.sensorSetupOnGravityValues, null)
            .addSegment(main)
            .addJump(-main.size())
    };
};


Blockly.Blocks['sensor_get_gravity_value'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("Get Gravity Axis")
            .appendField(new Blockly.FieldDropdown([["x", "X"], ["y", "Y"], ["z", "Z"]]), "AXIS")
        this.setColour(230);
        this.setTooltip("");
        this.setHelpUrl("");
        this.setOutput('Number');
    }
};

blockCodeGenerators.sensor_get_gravity_value = (block, buffer, ctx) => {
    return {
        type: 'Number', code: buffer.startSegment().addCall(functionTable.sensorGetGravityValue, 'Number',
            { type: 'uint8', value: { 'X': 0, 'Y': 1, 'Z': 2 }[block.getFieldValue('AXIS') as string]! },
        )
    };
};

Blockly.Blocks['sensor_tcs34725_config'] = {
    init: function () {
        this.appendEndRowInput()
            .appendField("TCS34725 Configuration")
            .appendField(new Blockly.FieldTextInput("RgbSensor"), "NAME");
        this.appendEndRowInput()
            .appendField("SDA")
            .appendField(new Blockly.FieldNumber(21, 0, 40), "SDA")
            .appendField("SCL")
            .appendField(new Blockly.FieldNumber(22, 0, 40), "SCL");
        this.setColour(230);
        this.setTooltip("");
        this.setHelpUrl("");
    }
};

Blockly.Blocks['sensor_tcs34725_read'] = {
    init: function () {
        this.appendEndRowInput()
            .appendField("TCS34725 Read ")
            .appendField(new Blockly.FieldDropdown(this.generateOptions), "SENSOR")
            .appendField("Raw")
            .appendField(new Blockly.FieldCheckbox(), "RAW");
        this.setOutput('Colour');
        this.setColour(230);
        this.setTooltip("");
        this.setHelpUrl("");
    },

    onchange: function (this: Blockly.BlockSvg, event: Blockly.Events.Abstract) {
        // filter for name change events on the config block selected by this read block
        // console.log('onchange', event)
        const sensorBlockId = this.getFieldValue('SENSOR');
        if (event instanceof Blockly.Events.BlockChange && event.blockId === sensorBlockId && event.element == 'field' && event.name === 'NAME') {
            console.log('change field')
            const field = (this.getField('SENSOR') as any);
            field.selectedOption = [event.newValue, sensorBlockId];
            field.forceRerender();
        }
        if (event instanceof Blockly.Events.BlockDelete && event.blockId === sensorBlockId) {
            console.log('delete', this)
            this.dispose(true);
        }

    },

    generateOptions: function (this: Blockly.FieldDropdown) {
        const workspace = this.getSourceBlock()?.workspace as Blockly.Workspace;
        const configs = workspace?.getBlocksByType('sensor_tcs34725_config') ?? [];
        if (configs.length == 0)
            return [['', '']];
        return configs.map(config => [config.getFieldValue('NAME'), config.id]);
    }
};

blockCodeGenerators.sensor_tcs34725_read = (block, buffer, ctx) => {
    return {
        type: null, code: buffer.startSegment()
            .addCall(functionTable.tcs34725Setup, null)
    };
};
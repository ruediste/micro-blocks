import { generateCodeForSequence, registerBlock } from "../compiler/compile";
import Blockly, { BlockSvg, FieldDropdown, WorkspaceSvg } from 'blockly';
import { addCategory, toolboxCategoryCallbacks } from "../toolbox";
import functionTable from "../compiler/functionTable";
import { anyBlockOfType, blockReferenceDropdown, onchangeUpdateBlockReference } from "./blockReference";

toolboxCategoryCallbacks.sensor = (workspace) => {
    const tcs34725Available = anyBlockOfType('sensor_tcs34725_config');
    return [{
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
        'type': 'sensor_tcs34725_get_RGB',
        'kind': 'block',
        enabled: tcs34725Available,
    },
    {
        'type': 'sensor_tcs34725_get_clear',
        'kind': 'block',
        enabled: tcs34725Available,
    },
    {
        'type': 'sensor_tcs34725_set_params',
        'kind': 'block',
        enabled: tcs34725Available,
    }];
};


addCategory({
    'kind': 'category',
    'name': 'Sensor',
    'colour': "#5b67a5",
    'custom': 'sensor'
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

registerBlock('sensor_on_gravity_values', {
    codeGenerator: (block, buffer, ctx) => {
        const main = buffer.startSegment()
            .addCall(functionTable.sensorWaitForGravityValues, null)
            .addSegment(generateCodeForSequence(block.getInputTargetBlock('BODY')!, buffer, ctx));

        return {
            type: null, code: buffer.startSegment()
                .addCall(functionTable.sensorSetupOnGravityValues, null)
                .addSegment(main)
                .addJump(-main.size())
        };
    }
});


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

registerBlock('sensor_get_gravity_value', {
    codeGenerator: (block, buffer, ctx) => {
        return {
            type: 'Number', code: buffer.startSegment().addCall(functionTable.sensorGetGravityValue, 'Number',
                { type: 'uint8', value: { 'X': 0, 'Y': 1, 'Z': 2 }[block.getFieldValue('AXIS') as string]! },
            )
        };
    }
});

registerBlock('sensor_tcs34725_config', {
    block: {
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
    },
    referenceableBy: 'NAME',
    initGenerator: (block, buffer, ctx) => {
        const id = ctx.nextId();
        ctx.blockData.set(block, id);
        return buffer.startSegment().addCall(functionTable.tcs34725Setup, null,
            { type: 'uint16', value: id },
            { type: 'uint8', value: block.getFieldValue('SCL') },
            { type: 'uint8', value: block.getFieldValue('SDA') },
        );
    }
});

Blockly.Blocks['sensor_tcs34725_get_RGB'] = {
    init: function (this: BlockSvg) {
        this.appendEndRowInput()
            .appendField("TCS34725 get RGB")
            .appendField<string>(blockReferenceDropdown('sensor_tcs34725_config'), "SENSOR")
            .appendField("Raw")
            .appendField(new Blockly.FieldCheckbox(), "RAW");
        this.setOutput(true, 'Colour');
        this.setColour(230);
        this.setTooltip("");
        this.setHelpUrl("");
    },

    onchange: function (this: Blockly.BlockSvg, event: Blockly.Events.Abstract) {
        onchangeUpdateBlockReference(this, event, 'SENSOR', 'sensor_tcs34725_config');
    }
};

registerBlock('sensor_tcs34725_get_RGB', {
    codeGenerator: (block, buffer, ctx) => {
        return {
            type: 'Colour', code: buffer.startSegment()
                .addCall(functionTable.tcs34725GetRGB, 'Colour',
                    { type: 'uint16', value: ctx.blockData.getByBlockId(block.getFieldValue('SENSOR')) },
                    { type: 'Boolean', value: block.getFieldValue('RAW') === 'TRUE' }
                )
        };
    }
});

Blockly.Blocks['sensor_tcs34725_get_clear'] = {
    init: function (this: BlockSvg) {
        this.appendEndRowInput()
            .appendField("TCS34725 get Clear")
            .appendField<string>(blockReferenceDropdown('sensor_tcs34725_config'), "SENSOR");
        this.setOutput(true, 'Colour');
        this.setColour(230);
        this.setTooltip("");
        this.setHelpUrl("");
    },

    onchange: function (this: Blockly.BlockSvg, event: Blockly.Events.Abstract) {
        onchangeUpdateBlockReference(this, event, 'SENSOR', 'sensor_tcs34725_config');
    }
};


registerBlock('sensor_tcs34725_get_clear', {
    codeGenerator: (block, buffer, ctx) => {
        return {
            type: 'Number', code: buffer.startSegment()
                .addCall(functionTable.tcs34725GetClear, 'Number',
                    { type: 'uint16', value: ctx.blockData.getByBlockId(block.getFieldValue('SENSOR')) },
                )
        };
    }
});

registerBlock('sensor_tcs34725_set_params', {
    block: {
        init: function () {
            this.appendEndRowInput()
                .appendField("TCS34725 Set Params")
                .appendField<string>(blockReferenceDropdown('sensor_tcs34725_config'), "SENSOR")
                .appendField("Gain")
                .appendField<string>(new FieldDropdown([
                    ['1x', '0'],
                    ['4x', '1'],
                    ['16x', '2'],
                    ['60x', '3'],
                ]), "GAIN")
                .appendField("Int Time")
                .appendField(new Blockly.FieldNumber(4, 4, 614), "INT_TIME")

            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(230);
            this.setTooltip("");
            this.setHelpUrl("");
        },

        onchange: function (event) {
            onchangeUpdateBlockReference(this, event, 'SENSOR', 'sensor_tcs34725_config');
        }
    },

    codeGenerator: (block, buffer, ctx) => {
        let intTime = Math.round(256 - block.getFieldValue('INT_TIME') / 2.4);
        intTime = intTime < 0 ? 0 : intTime > 255 ? 255 : intTime;
        return {
            type: null, code: buffer.startSegment()
                .addCall(functionTable.tcs34725SetParams, 'Number',
                    { type: 'uint16', value: ctx.blockData.getByBlockId(block.getFieldValue('SENSOR')) },
                    { type: 'uint8', value: parseInt(block.getFieldValue('GAIN')) },
                    { type: 'uint8', value: intTime },
                )
        };
    }
});



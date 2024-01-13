import { generateCodeForBlock, generateCodeForSequence, registerBlock } from "../compiler/compile";
import Blockly, { BlockSvg, FieldDropdown, WorkspaceSvg } from 'blockly';
import { addCategory, toolboxCategoryCallbacks } from "../toolbox";
import functionTable from "../compiler/functionTable";
import { anyBlockOfType, blockReferenceDropdown, onchangeUpdateBlockReference } from "./blockReference";

toolboxCategoryCallbacks.rgbLed = (workspace) => {
    const rgbLedAvailable = anyBlockOfType('rgbLed_config');
    return [
        {
            'type': 'rgbLed_config',
            'kind': 'block',
        },
        {
            'type': 'rgbLed_set_colour',
            'kind': 'block',
            enabled: rgbLedAvailable,
            'inputs': {
                'INDEX': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 0,
                        },
                    }
                },
            }
        },
        {
            'type': 'rgbLed_show',
            'kind': 'block',
            enabled: rgbLedAvailable,
        }];
};


addCategory({
    'kind': 'category',
    'name': 'RGB Led',
    'colour': "#5b67a5",
    'custom': 'rgbLed'
});


registerBlock('rgbLed_config', {
    block: {
        init: function () {
            this.appendEndRowInput()
                .appendField("RGB LED Configuration")
                .appendField(new Blockly.FieldTextInput("RGB LED"), "NAME");
            this.appendEndRowInput()
                .appendField("Count")
                .appendField(new Blockly.FieldNumber(1, 0, 1000), "COUNT")
                .appendField("PIN")
                .appendField(new Blockly.FieldNumber(16, 0, 40), "PIN");
            this.setColour(230);
            this.setTooltip("");
            this.setHelpUrl("");
        }
    },
    referenceableBy: 'NAME',
    initGenerator: (block, buffer, ctx) => {
        const id = ctx.nextId();
        ctx.blockData.set(block, id);
        return buffer.startSegment().addCall(functionTable.rgbLedSetup, null,
            { type: 'uint16', value: id },
            { type: 'uint16', value: block.getFieldValue('COUNT') },
            { type: 'uint8', value: block.getFieldValue('PIN') },
        );
    }
});


registerBlock('rgbLed_set_colour', {
    block: {
        init: function (this: BlockSvg) {
            this.appendValueInput("INDEX")
                .setCheck("Number")
                .appendField("RGB Set Colour")
                .appendField<string>(blockReferenceDropdown('rgbLed_config'), "LED")
                .appendField("Index ");

            this.appendValueInput("VALUE")
                .setCheck("Colour")
                .appendField("Colour");

            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip("");
            this.setHelpUrl("");
        },

        onchange: function (this: Blockly.BlockSvg, event: Blockly.Events.Abstract) {
            onchangeUpdateBlockReference(this, event, 'LED', 'rgbLed_config');
        }
    },

    codeGenerator: (block, buffer, ctx) => {
        const value = generateCodeForBlock('Colour', block.getInputTargetBlock('VALUE'), buffer, ctx);
        return {
            type: null, code: buffer.startSegment().addCall(functionTable.rgbLedSetColour, null,
                { type: 'uint16', value: ctx.blockData.getByBlockId(block.getFieldValue('LED')) },
                generateCodeForBlock('Number', block.getInputTargetBlock('INDEX'), buffer, ctx),
                value)
        };
    }
});

registerBlock('rgbLed_show', {
    block: {
        init: function (this: BlockSvg) {
            this.appendEndRowInput()
                .appendField("RGB Show")
                .appendField<string>(blockReferenceDropdown('rgbLed_config'), "LED");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip("");
            this.setHelpUrl("");
        },

        onchange: function (this: Blockly.BlockSvg, event: Blockly.Events.Abstract) {
            onchangeUpdateBlockReference(this, event, 'LED', 'rgbLed_config');
        }
    },

    codeGenerator: (block, buffer, ctx) => {
        return {
            type: null, code: buffer.startSegment().addCall(functionTable.rgbShow, null,
                { type: 'uint16', value: ctx.blockData.getByBlockId(block.getFieldValue('LED')) })
        };
    }
});
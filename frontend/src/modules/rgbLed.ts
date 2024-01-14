import { generateCodeForBlock, generateCodeForSequence, registerBlock } from "../compiler/compile";
import Blockly, { BlockSvg, FieldDropdown, WorkspaceSvg } from 'blockly';
import { addCategory, toolboxCategoryCallbacks } from "../toolbox";
import functionTable from "../compiler/functionTable";
import { anyBlockOfType, blockReferenceDropdown, onchangeUpdateBlockReference } from "./blockReference";
import { FieldBitmap } from "../blockly/field-bitmap";

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
        }
        ,
        {
            'type': 'rgbLed_set_bitmap',
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


registerBlock('rgbLed_set_bitmap', {
    block: {
        init: function (this: BlockSvg) {
            this.appendValueInput("COLOUR")
                .setCheck("Colour")
                .appendField("RGB Set Bitmap")
                .appendField<string>(blockReferenceDropdown('rgbLed_config'), "LED")
                .appendField("Rows")
                .appendField(new Blockly.FieldNumber(8, 0, 100), "ROWS")
                .appendField("Columns")
                .appendField(new Blockly.FieldNumber(8, 0, 100), "COLUMNS")
                .appendField("Colour")

            this.appendEndRowInput()
                .appendField("Bitmap")
                .appendField(new FieldBitmap(undefined, undefined, { width: 8, height: 8 }), "BITMAP")

            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.inputsInline = false;
            this.setTooltip("");
            this.setHelpUrl("");
        },

        onchange: function (this: Blockly.BlockSvg, event: Blockly.Events.Abstract) {
            onchangeUpdateBlockReference(this, event, 'LED', 'rgbLed_config');
            if (event instanceof Blockly.Events.BlockChange && event.blockId === this.id) {
                console.log('resize')
                // resize the bitmap
                const rows = this.getFieldValue('ROWS');
                const columns = this.getFieldValue('COLUMNS');
                const bitmapField = this.getField('BITMAP') as FieldBitmap;
                if (bitmapField.imgWidth_ != columns || bitmapField.imgHeight_ != rows) {
                    bitmapField.resizeBitmap(rows, columns);
                }
            }
        }
    },

    codeGenerator: (block, buffer, ctx) => {
        const colour = generateCodeForBlock('Colour', block.getInputTargetBlock('COLOUR'), buffer, ctx);
        const bitmapOffset = ctx.addToConstantPool(code => {
            const bitmap: number[][] = block.getFieldValue('BITMAP');
            const rows: number = block.getFieldValue('ROWS');
            const columns: number = block.getFieldValue('COLUMNS');

            console.log(bitmap, rows, columns)
            code.addUint16(rows * columns);
            for (let row = 0; row < rows; row++) {
                for (let column = 0; column < columns; column++) {
                    code.addUint8(bitmap[row][column]);
                }
            }
        });

        return {
            type: null, code: buffer.startSegment().addCall(functionTable.rgbSetBitmap, null,
                { type: 'uint16', value: ctx.blockData.getByBlockId(block.getFieldValue('LED')) },
                { type: 'uint16', value: bitmapOffset },
                colour)
        };
    }
});

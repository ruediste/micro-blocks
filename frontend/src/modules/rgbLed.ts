import { generateCodeForBlock, generateCodeForSequence, registerBlock } from "../compiler/compile";
import Blockly, { BlockSvg, FieldDropdown, WorkspaceSvg } from 'blockly';
import { addCategory, toolboxCategoryCallbacks } from "../toolbox";
import functionTable from "../compiler/functionTable";
import { anyBlockOfType, blockReferenceDropdown, onchangeUpdateBlockReference } from "./blockReference";
import { FieldBitmap } from "../blockly/field-bitmap";
import { BlockInfo } from "blockly/core/utils/toolbox";

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
                'VALUE': {
                    'shadow': {
                        'type': 'colour_picker_hsv',
                        'fields': {
                            'COLOUR': '#ff0000',
                        },
                    }
                },
            }
        },
        {
            'type': 'rgbLed_show',
            'kind': 'block',
            enabled: rgbLedAvailable,
        },
        {
            'type': 'rgbLed_set_bitmap',
            'kind': 'block',
            enabled: rgbLedAvailable,
            'inputs': {
                'LED_X': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 0,
                        },
                    }
                },
                'LED_Y': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 0,
                        },
                    }
                },
                'LED_WIDTH': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 8,
                        },
                    }
                },
                'LED_HEIGHT': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 8,
                        },
                    }
                },
                'BITMAP_X': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 0,
                        },
                    }
                },
                'BITMAP_Y': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 0,
                        },
                    }
                },
                'SCALE': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 1,
                        },
                    }
                },
                'ROTATION': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 0,
                        },
                    }
                },
                'COLOUR': {
                    'shadow': {
                        'type': 'colour_picker_hsv',
                        'fields': {
                            'COLOUR': '#ff0000',
                        },
                    }
                },
            }
        }] as BlockInfo[];
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
                .appendField("PIN")
                .appendField(new Blockly.FieldNumber(16, 0, 40), "PIN")
                .appendField("Width")
                .appendField(new Blockly.FieldNumber(8, 0, 1000), "WIDTH")
                .appendField("Height")
                .appendField(new Blockly.FieldNumber(8, 0, 1000), "HEIGHT")
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
            { type: 'uint8', value: block.getFieldValue('PIN') },
            { type: 'uint16', value: block.getFieldValue('WIDTH') },
            { type: 'uint16', value: block.getFieldValue('HEIGHT') },
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
            this.appendDummyInput()
                .appendField("RGB Set Bitmap")
                .appendField<string>(blockReferenceDropdown('rgbLed_config'), "LED")
                .appendField("Width")
                .appendField(new Blockly.FieldNumber(8, 0, 1000), "WIDTH")
                .appendField("Height")
                .appendField(new Blockly.FieldNumber(8, 0, 1000), "HEIGHT");

            this.appendEndRowInput();

            this.appendValueInput("LED_X")
                .setCheck("Number")
                .appendField("LED X");

            this.appendValueInput("LED_Y")
                .setCheck("Number")
                .appendField("Y");

            this.appendValueInput("LED_WIDTH")
                .setCheck("Number")
                .appendField("Width");

            this.appendValueInput("LED_HEIGHT")
                .setCheck("Number")
                .appendField("Height");

            this.appendEndRowInput();

            this.appendValueInput("BITMAP_X")
                .setCheck("Number")
                .appendField("Bitmap X");

            this.appendValueInput("BITMAP_Y")
                .setCheck("Number")
                .appendField("Y");

            this.appendValueInput("SCALE")
                .setCheck("Number")
                .appendField("Scale");

            this.appendValueInput("ROTATION")
                .setCheck("Number")
                .appendField("Rotation");

            this.appendEndRowInput();

            this.appendValueInput("COLOUR")
                .setCheck("Colour")
                .appendField("Colour");

            this.appendDummyInput()
                .appendField("Transparent")
                .appendField(new Blockly.FieldCheckbox(), "TRANSPARENT");

            this.appendEndRowInput();

            this.appendEndRowInput()
                .appendField("Bitmap")
                .appendField(new FieldBitmap(undefined, undefined, { width: 8, height: 8 }), "BITMAP")

            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            // this.inputsInline = false;
            this.setTooltip("");
            this.setHelpUrl("");
        },

        onchange: function (this: Blockly.BlockSvg, event: Blockly.Events.Abstract) {
            onchangeUpdateBlockReference(this, event, 'LED', 'rgbLed_config');
            if (event instanceof Blockly.Events.BlockChange && event.blockId === this.id) {
                // resize the bitmap
                const height = this.getFieldValue('HEIGHT');
                const width = this.getFieldValue('WIDTH');
                const bitmapField = this.getField('BITMAP') as FieldBitmap;
                if (bitmapField.imgWidth_ != width || bitmapField.imgHeight_ != height) {
                    bitmapField.resizeBitmap(height, width);
                }
            }
        }
    },

    codeGenerator: (block, buffer, ctx) => {
        const height: number = block.getFieldValue('HEIGHT');
        const width: number = block.getFieldValue('WIDTH');

        const bitmapOffset = ctx.addToConstantPool(code => {
            const bitmap: number[][] = block.getFieldValue('BITMAP');

            code.addUint16(width);
            code.addUint16(height);
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    code.addUint8(bitmap[y][x]);
                }
            }
        });

        return {
            type: null, code: buffer.startSegment().addCall(functionTable.rgbSetBitmap, null,
                { type: 'uint16', value: ctx.blockData.getByBlockId(block.getFieldValue('LED')) },
                { type: 'uint16', value: bitmapOffset },
                generateCodeForBlock('Number', block.getInputTargetBlock('LED_X'), buffer, ctx),
                generateCodeForBlock('Number', block.getInputTargetBlock('LED_Y'), buffer, ctx),
                generateCodeForBlock('Number', block.getInputTargetBlock('LED_WIDTH'), buffer, ctx),
                generateCodeForBlock('Number', block.getInputTargetBlock('LED_HEIGHT'), buffer, ctx),
                generateCodeForBlock('Number', block.getInputTargetBlock('BITMAP_X'), buffer, ctx),
                generateCodeForBlock('Number', block.getInputTargetBlock('BITMAP_Y'), buffer, ctx),
                generateCodeForBlock('Number', block.getInputTargetBlock('SCALE'), buffer, ctx),
                generateCodeForBlock('Number', block.getInputTargetBlock('ROTATION'), buffer, ctx),
                { type: 'Boolean', value: block.getFieldValue('TRANSPARENT') === 'TRUE' },
                generateCodeForBlock('Colour', block.getInputTargetBlock('COLOUR'), buffer, ctx),
            )
        };
    }
});

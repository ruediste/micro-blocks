import { registerBlock } from "../compiler/blockCodeGenerator";
import { generateCodeForBlock } from "../compiler/compile";
import functionTable from "../compiler/functionTable";
import { addCategory } from "../toolbox";
import Blockly from 'blockly';

addCategory({
    'kind': 'category',
    'categorystyle': 'colour_category',
    'name': 'Colour',
    'contents': [
        {
            'type': 'colour_picker',
            'kind': 'block',
            'fields': {
                'COLOUR': '#ff0000',
            },
        },
        {
            'type': 'colour_random',
            'kind': 'block',
        },
        {
            'type': 'colour_rgb',
            'kind': 'block',
            'inputs': {
                'RED': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 1,
                        },
                    },
                },
                'GREEN': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 0.5,
                        },
                    },
                },
                'BLUE': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 0,
                        },
                    },
                },
            },
        },
        {
            'type': 'colour_from_hsv',
            'kind': 'block',
            'inputs': {
                'H': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 0,
                        },
                    },
                },
                'S': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 1,
                        },
                    },
                },
                'V': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 1,
                        },
                    },
                },
            },
        },
        {
            'type': 'colour_blend',
            'kind': 'block',
            'inputs': {
                'COLOUR1': {
                    'shadow': {
                        'type': 'colour_picker',
                        'fields': {
                            'COLOUR': '#ff0000',
                        },
                    },
                },
                'COLOUR2': {
                    'shadow': {
                        'type': 'colour_picker',
                        'fields': {
                            'COLOUR': '#3333ff',
                        },
                    },
                },
                'RATIO': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 0.5,
                        },
                    },
                },
            },
        },
        {
            'type': 'colour_get_channel',
            'kind': 'block',
        },
    ],
})

registerBlock('colour_picker', {
    codeGenerator: (block, buffer, ctx) => {
        const colourStr = block.getFieldValue('COLOUR') as string;
        const r = parseInt(colourStr.substring(1, 3), 16);
        const g = parseInt(colourStr.substring(3, 5), 16);
        const b = parseInt(colourStr.substring(5, 7), 16);
        return {
            type: 'Colour', code: buffer.startSegment().addPushFloat(r / 255).addPushFloat(g / 255).addPushFloat(b / 255)
        };
    }
});

registerBlock('colour_random', {
    codeGenerator: (block, buffer, ctx) => {
        return {
            type: 'Colour', code: buffer.startSegment()
                .addCall(functionTable.mathRandomFloat, 'Number')
                .addCall(functionTable.mathRandomFloat, 'Number')
                .addCall(functionTable.mathRandomFloat, 'Number')
        };
    }
});

registerBlock('colour_rgb', {
    codeGenerator: (block, buffer, ctx) => {
        const r = generateCodeForBlock('Number', block.getInputTargetBlock('RED'), buffer, ctx);
        const g = generateCodeForBlock('Number', block.getInputTargetBlock('GREEN'), buffer, ctx);
        const b = generateCodeForBlock('Number', block.getInputTargetBlock('BLUE'), buffer, ctx);
        return {
            type: 'Colour', code: buffer.startSegment().addSegment(r.code).addSegment(g.code).addSegment(b.code)
        };
    }
});

registerBlock('colour_blend', {
    codeGenerator: (block, buffer, ctx) => {
        return {
            type: 'Colour', code: buffer.startSegment().addCall(functionTable.colourBlend, 'Colour',
                generateCodeForBlock('Colour', block.getInputTargetBlock('COLOUR1'), buffer, ctx),
                generateCodeForBlock('Colour', block.getInputTargetBlock('COLOUR2'), buffer, ctx),
                generateCodeForBlock('Number', block.getInputTargetBlock('RATIO'), buffer, ctx))
        };
    }
});


const channelMap = { R: 0, G: 1, B: 2, H: 3, S: 4, V: 5 }

registerBlock('colour_get_channel', {
    block: {
        init: function (this: Blockly.BlockSvg) {
            this.appendValueInput("VALUE")
                .setCheck("Colour")
                .appendField("Get Colour Channel")
                .appendField(new Blockly.FieldDropdown([['r', 'R'], ['g', 'G'], ['b', 'B'], ['h', 'H'], ['s', 'S'], ['v', 'V']]) as Blockly.Field<string | undefined>, "CHANNEL");
            this.setOutput(true, 'Number');
            this.setColour(20);
            this.setTooltip("");
            this.setHelpUrl("");
        }
    },
    codeGenerator: (block, buffer, ctx) => {
        const channel = block.getFieldValue('CHANNEL') as keyof typeof channelMap;
        const value = generateCodeForBlock('Colour', block.getInputTargetBlock('VALUE'), buffer, ctx);
        return { type: 'Number', code: buffer.startSegment().addCall(functionTable.colourGetChannel, 'Number', value, { type: 'uint8', value: channelMap[channel] }) };
    }
});

registerBlock('colour_from_hsv', {
    block: {
        init: function (this: Blockly.BlockSvg) {
            this.appendEndRowInput()
                .appendField("Colour from HSV");
            this.appendValueInput("H")
                .setCheck("Number")
                .appendField("Hue");
            this.appendValueInput("S")
                .setCheck("Number")
                .appendField("Saturation");
            this.appendValueInput("V")
                .setCheck("Number")
                .appendField("Value");
            this.setOutput(true, 'Colour');
            this.setColour(20);
            this.setTooltip("");
            this.setHelpUrl("");
        }
    },
    codeGenerator: (block, buffer, ctx) => {
        return {
            type: 'Colour', code: buffer.startSegment()
                .addCall(functionTable.colourFromHSV, 'Colour',
                    generateCodeForBlock('Number', block.getInputTargetBlock('H'), buffer, ctx),
                    generateCodeForBlock('Number', block.getInputTargetBlock('S'), buffer, ctx),
                    generateCodeForBlock('Number', block.getInputTargetBlock('V'), buffer, ctx))
        };
    }
});
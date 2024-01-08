import Blockly from 'blockly';
import { NO_THREAD, generateCodeForBlock, generateCodeForSequence, registerBlock } from "../compiler/compile";
import functionTable from "../compiler/functionTable";
import { addCategory } from "../toolbox";
import { generateBlockToString } from "./text";

addCategory({
    'kind': 'category',
    'name': 'GUI',
    'categorystyle': 'text_category',
    'contents': [
        {
            'type': 'gui_button',
            'kind': 'block',
            'inputs': {
                'TEXT': {
                    'shadow': {
                        'type': 'text',
                        'fields': {
                            'TEXT': 'OK',
                        },
                    },
                },
            },
        },
        {
            'type': 'gui_text',
            'kind': 'block',
            'inputs': {
                'TEXT': {
                    'shadow': {
                        'type': 'text',
                        'fields': {
                            'TEXT': 'Hello World',
                        },
                    },
                },
            },
        },
        {
            'type': 'gui_signal_light',
            'kind': 'block',
        }
    ]
});

Blockly.Blocks['gui_button'] = {
    init: function () {
        this.appendEndRowInput()
            .appendField("Show button X:")
            .appendField(new Blockly.FieldNumber(1), "X")
            .appendField("Y:")
            .appendField(new Blockly.FieldNumber(1), "Y")
            .appendField("ColSpan:")
            .appendField(new Blockly.FieldNumber(1), "COL_SPAN")
            .appendField("RowSpan:")
            .appendField(new Blockly.FieldNumber(1), "ROW_SPAN");

        this.appendValueInput("TEXT")
            .setCheck("String")
            .appendField("Text:")

        this.appendStatementInput("ON_CLICK")
            .appendField("OnClick:")
            .setCheck(null);
        this.appendStatementInput("ON_PRESS")
            .appendField("OnPress:")
            .setCheck(null);
        this.appendStatementInput("ON_RELEASE")
            .appendField("OnRelease:")
            .setCheck(null);

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
        this.setTooltip("");
        this.setHelpUrl("");
    }
};


interface ButtonData {
    onClickThread?: number,
    onPressThread?: number,
    onReleaseThread?: number,
}

registerBlock('gui_button', {
    codeGenerator: (block, buffer, ctx) => {
        const data = ctx.blockData.get(block) as ButtonData;
        return {
            type: null, code: buffer.startSegment().addCall(functionTable.guiShowButton, null,
                { type: 'uint8', value: block.getFieldValue('X') },
                { type: 'uint8', value: block.getFieldValue('Y') },
                { type: 'uint8', value: block.getFieldValue('COL_SPAN') },
                { type: 'uint8', value: block.getFieldValue('ROW_SPAN') },
                { type: 'uint16', value: data.onClickThread ?? NO_THREAD },
                { type: 'uint16', value: data.onPressThread ?? NO_THREAD },
                { type: 'uint16', value: data.onReleaseThread ?? NO_THREAD },
                generateCodeForBlock('String', block.getInputTargetBlock('TEXT'), buffer, ctx)
            )
        };
    },
    threadExtractor:


        (block, addThread, ctx) => {
            const data: ButtonData = {};

            {
                const onClick = block.getInputTargetBlock('ON_CLICK')
                if (onClick !== null) {
                    data.onClickThread = addThread((buffer, ctx) => {
                        const body = buffer.startSegment().addCall(functionTable.basicCallbackReady, null).addSegment(generateCodeForSequence(onClick, buffer, ctx));
                        return buffer.startSegment().addSegment(body).addJump(-body.size());
                    });
                }
            }
            {
                const onPress = block.getInputTargetBlock('ON_PRESS')
                if (onPress !== null) {
                    data.onPressThread = addThread((buffer, ctx) => {
                        const body = buffer.startSegment().addCall(functionTable.basicCallbackReady, null).addSegment(generateCodeForSequence(onPress, buffer, ctx));
                        return buffer.startSegment().addSegment(body).addJump(-body.size());
                    });
                }
            }
            {
                const onRelease = block.getInputTargetBlock('ON_RELEASE')
                if (onRelease !== null) {
                    data.onReleaseThread = addThread((buffer, ctx) => {
                        const body = buffer.startSegment().addCall(functionTable.basicCallbackReady, null).addSegment(generateCodeForSequence(onRelease, buffer, ctx));
                        return buffer.startSegment().addSegment(body).addJump(-body.size());
                    });
                }
            }

            ctx.blockData.set(block, data);
        }
});


Blockly.Blocks['gui_text'] = {
    init: function () {
        this.appendEndRowInput()
            .appendField("Show text X:")
            .appendField(new Blockly.FieldNumber(1), "X")
            .appendField("Y:")
            .appendField(new Blockly.FieldNumber(1), "Y")
            .appendField("ColSpan:")
            .appendField(new Blockly.FieldNumber(1), "COL_SPAN")
            .appendField("RowSpan:")
            .appendField(new Blockly.FieldNumber(1), "ROW_SPAN");
        this.appendValueInput("TEXT")
            .appendField("Text:")

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
        this.setTooltip("");
        this.setHelpUrl("");
    }
};

registerBlock('gui_text', {
    codeGenerator: (block, buffer, ctx) => {
        return {
            type: null, code: buffer.startSegment().addCall(functionTable.guiShowText, null,
                { type: 'uint8', value: block.getFieldValue('X') },
                { type: 'uint8', value: block.getFieldValue('Y') },
                { type: 'uint8', value: block.getFieldValue('COL_SPAN') },
                { type: 'uint8', value: block.getFieldValue('ROW_SPAN') },
                generateBlockToString(block, "TEXT", buffer, ctx)
            )
        };
    }
});

Blockly.Blocks['gui_signal_light'] = {
    init: function (this: Blockly.Block) {
        this.appendEndRowInput()
            .appendField("Show Signal Light X:")
            .appendField(new Blockly.FieldNumber(1), "X")
            .appendField("Y:")
            .appendField(new Blockly.FieldNumber(1), "Y")
            .appendField("ColSpan:")
            .appendField(new Blockly.FieldNumber(1), "COL_SPAN")
            .appendField("RowSpan:")
            .appendField(new Blockly.FieldNumber(1), "ROW_SPAN");
        this.appendValueInput("COLOUR")
            .setCheck('Colour')
            .appendField("Colour:")

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
        this.setTooltip("");
        this.setHelpUrl("");
    }
};

registerBlock('gui_signal_light', {
    codeGenerator: (block, buffer, ctx) => {
        return {
            type: null, code: buffer.startSegment().addCall(functionTable.guiShowSignalLight, null,
                { type: 'uint8', value: block.getFieldValue('X') },
                { type: 'uint8', value: block.getFieldValue('Y') },
                { type: 'uint8', value: block.getFieldValue('COL_SPAN') },
                { type: 'uint8', value: block.getFieldValue('ROW_SPAN') },
                generateCodeForBlock('Colour', block.getInputTargetBlock('COLOUR'), buffer, ctx)
            )
        };
    }
});
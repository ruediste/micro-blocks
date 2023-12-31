import { generateCodeForBlock, generateCodeForSequence, registerBlock } from "../compiler/compile";
import Blockly from 'blockly';
import { addCategory } from "../toolbox";
import functionTable from "../compiler/functionTable";

addCategory({
    'kind': 'category',
    'name': 'Pins',
    'colour': "#5b67a5",
    contents: [
        {
            'type': 'pin_on_change',
            'kind': 'block',
            'inputs': {
                'DEBOUNCE': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 200,
                        },
                    }
                },
            }
        },
        {
            'type': 'pin_set',
            'kind': 'block',
            'inputs': {
                'VALUE': {
                    'shadow': {
                        'type': 'logic_boolean',
                        'fields': {
                            'BOOL': {
                                'value': 'TRUE',
                            },
                        },
                    }
                },
            }
        },
        {
            'type': 'pin_set_analog',
            'kind': 'block',
            'inputs': {
                'VALUE': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 0.5,
                        },
                    }
                },
            }
        },
        {
            'type': 'pin_read_analog',
            'kind': 'block'
        }
    ]
});


Blockly.Blocks['pin_on_change'] = {
    init: function () {
        this.appendEndRowInput()
            .appendField("On Pin")
            .appendField(new Blockly.FieldNumber(0), "PIN")
            .appendField("change");

        this.appendDummyInput()
            .appendField("Edge")
            .appendField(new Blockly.FieldDropdown([["raising", "RAISING"], ["falling", "FALLING"], ["BOTH", "BOTH"]]), "EDGE")
            .appendField("Pull")
            .appendField(new Blockly.FieldDropdown([["up", "UP"], ["down", "DOWN"], ["none", "NONE"]]), "PULL")
            .appendField("Debounce")
        this.appendValueInput("DEBOUNCE")
            .setCheck("Number");
        this.appendDummyInput()
            .appendField("ms");

        this.appendStatementInput("BODY")
            .setCheck(null);
        this.setColour(230);
        this.setTooltip("");
        this.setHelpUrl("");
    }
};

registerBlock('pin_on_change', {
    threadExtractor: (block, addThread) => addThread((buffer, ctx) => {
        const debounce = generateCodeForBlock("Number", block.getInputTargetBlock('DEBOUNCE')!, buffer, ctx);

        const setup = buffer.startSegment().addCall(functionTable.pinSetupOnChange, null,
            { type: 'uint8', value: block.getFieldValue('PIN') },
            { type: 'uint8', value: { 'NONE': 0, 'UP': 1, 'DOWN': 2 }[block.getFieldValue('PULL') as string]! },
            { type: 'uint8', value: { 'BOTH': 0, 'RAISING': 1, 'FALLING': 2 }[block.getFieldValue('EDGE') as string]! },
            debounce,
        );

        const wait = buffer.startSegment().addCall(functionTable.pinWaitForChange, null);
        const body = generateCodeForSequence(block.getInputTargetBlock('BODY')!, buffer, ctx);
        const jump = buffer.startSegment().addJump(-(wait.size() + body.size()));

        return buffer.startSegment().addSegment(setup, wait, body, jump);
    })
});

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

registerBlock('pin_set', {
    codeGenerator: (block, buffer, ctx) => {
        const value = generateCodeForBlock('Boolean', block.getInputTargetBlock('VALUE'), buffer, ctx);
        return { type: null, code: buffer.startSegment().addCall(functionTable.pinSet, null, { type: 'uint8', value: block.getFieldValue('PIN') }, value) }
    }
});

Blockly.Blocks['pin_set_analog'] = {
    init: function () {
        this.appendValueInput("VALUE")
            .setCheck("Number")
            .appendField("Set Analog Pin")
            .appendField(new Blockly.FieldNumber(0, 0), "PIN")
            .appendField("to");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
        this.setTooltip("Output a PWM signal with a duty cycle proportional to the value (0-1)");
        this.setHelpUrl("");
    }
};

registerBlock('pin_set_analog', {
    codeGenerator: (block, buffer, ctx) => {
        const value = generateCodeForBlock('Number', block.getInputTargetBlock('VALUE'), buffer, ctx);
        return { type: null, code: buffer.startSegment().addCall(functionTable.pinSetAnalog, null, { type: 'uint8', value: block.getFieldValue('PIN') }, value) }
    }
});

Blockly.Blocks['pin_read_analog'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("Read Analog Pin")
            .appendField(new Blockly.FieldNumber(0, 0, 40), "PIN")
        this.setOutput(true, "Number");
        this.setColour(230);
        this.setTooltip("Read an analog input as a value between 0 and 1");
        this.setHelpUrl("");
    }
};

registerBlock('pin_read_analog', {
    codeGenerator: (block, buffer, ctx) => {
        return { type: 'Number', code: buffer.startSegment().addCall(functionTable.pinReadAnalog, 'Number', { type: 'uint8', value: block.getFieldValue('PIN') }) }
    }
});
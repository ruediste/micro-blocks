import { blockCodeGenerators, generateCodeForBlock, generateCodeForSequence } from "../compiler/compile";
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

blockCodeGenerators.pin_on_change = (block, buffer, ctx) => {
    const debounce = generateCodeForBlock("Number", block.getInputTargetBlock('DEBOUNCE')!, buffer, ctx);

    buffer.startSegment();
    buffer.addCall(functionTable.pinSetupOnChange, null,
        { type: 'uint8', value: block.getFieldValue('PIN') },
        { type: 'uint8', value: { 'NONE': 0, 'UP': 1, 'DOWN': 2 }[block.getFieldValue('PULL') as string]! },
        { type: 'uint8', value: { 'BOTH': 0, 'RAISING': 1, 'FALLING': 2 }[block.getFieldValue('EDGE') as string]! },
        debounce,
    );
    const setup = buffer.endSegment();

    buffer.startSegment();
    buffer.addCall(functionTable.pinWaitForChange, null);
    const wait = buffer.endSegment();
    const body = generateCodeForSequence(block.getInputTargetBlock('BODY')!, buffer, ctx);

    buffer.startSegment();
    buffer.addJump(-buffer.size([wait, body]));
    const jump = buffer.endSegment();

    return { type: null, code: [setup, wait, body, jump] };
};

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

blockCodeGenerators.pin_set = (block, buffer, ctx) => {
    const value = generateCodeForBlock('Boolean', block.getInputTargetBlock('VALUE'), buffer, ctx);
    buffer.startSegment();
    buffer.addCall(functionTable.pinSet, null, { type: 'uint8', value: block.getFieldValue('PIN') }, value);
    return { type: null, code: buffer.endSegment() }
};

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

blockCodeGenerators.pin_set_analog = (block, buffer, ctx) => {
    const value = generateCodeForBlock('Number', block.getInputTargetBlock('VALUE'), buffer, ctx);
    buffer.startSegment();
    buffer.addCall(functionTable.pinSetAnalog, null, { type: 'uint8', value: block.getFieldValue('PIN') }, value);
    return { type: null, code: buffer.endSegment() }
};


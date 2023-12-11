import { blockCodeGenerators, generateCodeForBlock, generateCodeForSequence } from "../compiler/compile";
import Blockly from 'blockly';
import { addCategory } from "../toolbox";
import functionTable, { functionCallers } from "../compiler/functionTable";

addCategory({
    'kind': 'category',
    'name': 'Basic',
    'colour': "#5BA5A5",
    contents: [
        {
            'type': 'basic_on_start',
            'kind': 'block',
        },
        {
            'type': 'basic_forever',
            'kind': 'block',
        },
        {
            'type': 'basic_delay',
            'kind': 'block',
            'inputs': {
                'DELAY': {
                    'shadow': {
                        'type': 'math_number',
                        'fields': {
                            'NUM': 500,
                        },
                    }
                },
            }
        },
    ]
});

Blockly.Blocks['basic_on_start'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("On Start")
        this.appendStatementInput("BODY")
            .setCheck(null);
        this.setColour(180);
        this.setTooltip("");
        this.setHelpUrl("");
    }
};
blockCodeGenerators.basic_on_start = (block, buffer, ctx) => {
    const body = generateCodeForSequence(block.getInputTargetBlock('BODY')!, buffer, ctx);
    buffer.startSegment();
    buffer.addSegment(body);
    buffer.addCall(functionTable.basicEndThread, null);
    return { type: null, code: buffer.endSegment() };
};

Blockly.Blocks['basic_forever'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("Forever")
        this.appendStatementInput("BODY")
            .setCheck(null);
        this.setColour(180);
        this.setTooltip("");
        this.setHelpUrl("");
    }
};


blockCodeGenerators.basic_forever = (block, buffer, ctx) => {
    const bodyBlock = block.getInputTargetBlock('BODY');

    // if the body is empty, just end the thread
    if (bodyBlock == null) {
        buffer.startSegment();
        buffer.addCall(functionTable.basicEndThread, null);
        return { type: null, code: buffer.endSegment() };
    }

    const body = generateCodeForSequence(bodyBlock, buffer, ctx);
    buffer.startSegment();
    buffer.addSegment(body);
    buffer.addJump(-buffer.size(body));
    return { type: null, code: buffer.endSegment() };
};

Blockly.Blocks['basic_delay'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("Delay");
        this.appendValueInput("DELAY")
            .setCheck("Number");
        this.appendDummyInput()
            .appendField("ms");
        this.setColour(180);
        this.setTooltip("");
        this.setHelpUrl("");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
    }
};


blockCodeGenerators.basic_delay = (block, buffer, ctx) => {
    const value = generateCodeForBlock('Number', block.getInputTargetBlock('DELAY'), buffer, ctx);
    buffer.startSegment();
    buffer.addCall(functionTable.basicDelay, null, value);
    return { type: null, code: buffer.endSegment() };
};

import { ThreadCodeGenerator, blockCodeGenerators, generateCodeForBlock, generateCodeForSequence, threadExtractors } from "../compiler/compile";
import Blockly from 'blockly';
import { addCategory, clearToolbox } from "../toolbox";
import functionTable, { functionCallers } from "../compiler/functionTable";
import { CodeBuilder } from "../compiler/CodeBuffer";

clearToolbox();

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

threadExtractors.basic_on_start = (block, addThread) => addThread((buffer, ctx) => {
    const body = generateCodeForSequence(block.getInputTargetBlock('BODY')!, buffer, ctx);
    return buffer.startSegment().addSegment(body).addCall(functionTable.basicEndThread, null);
});

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

threadExtractors.basic_forever = (block, addThread) => addThread((buffer, ctx) => {
    const bodyBlock = block.getInputTargetBlock('BODY');

    // if the body is empty, just end the thread
    if (bodyBlock == null) {
        return buffer.startSegment().addCall(functionTable.basicEndThread, null)
    }

    const body = generateCodeForSequence(bodyBlock, buffer, ctx);
    console.log('body size', body.size())
    return buffer.startSegment()
        .addSegment(body)
        .addJump(-body.size())
});

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
    return { type: null, code: buffer.startSegment().addCall(functionTable.basicDelay, null, value) };
};

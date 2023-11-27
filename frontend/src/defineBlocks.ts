import Blockly from 'blockly';

export function defineBlocks() {
    Blockly.Blocks['set_pin'] = {
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

    Blockly.Blocks['on_pin_change'] = {
        init: function () {
            this.appendEndRowInput()
                .appendField("On Pin")
                .appendField(new Blockly.FieldNumber(0), "PIN")
                .appendField("change");
            this.appendDummyInput()
                .appendField("Edge")
                .appendField(new Blockly.FieldDropdown([["raising", "RAISIN"], ["falling", "FALLING"], ["BOTH", "BOTH"]]), "EDGE")
                .appendField("Pull")
                .appendField(new Blockly.FieldDropdown([["up", "UP"], ["down", "DOWN"], ["none", "NONE"]]), "PULL")
            this.appendStatementInput("BODY")
                .setCheck(null);
            this.setColour(230);
            this.setTooltip("");
            this.setHelpUrl("");
        }
    };
}
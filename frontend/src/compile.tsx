import Blockly, { BlocklyOptions } from 'blockly';

export default function compile(workspace: Blockly.Workspace) {
    workspace.getTopBlocks().forEach(b => {
        console.log(b.type);
    });
}
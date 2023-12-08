import { blockCodeGenerators, generateCodeForBlock, generateCodeForSequence } from "../compiler/compile";
import Blockly, { FieldVariable, Msg, WorkspaceSvg } from 'blockly';
import { addCategory, toolboxCategoryCallbacks } from "../toolbox";
import functionTable from "../compiler/functionTable";

addCategory(
    {
        'kind': 'category',
        'name': 'Variables',
        'custom': 'VARIABLE_DYNAMIC_CUSTOM',
        'categorystyle': 'variable_category',
    });

function flyoutCategoryCustom(workspace: WorkspaceSvg): Element[] {
    // required to register butttton callbacks
    Blockly.VariablesDynamic.flyoutCategory(workspace);

    let xmlList = new Array<Element>();
    let button = document.createElement('button');
    button.setAttribute('text', Msg['NEW_NUMBER_VARIABLE']);
    button.setAttribute('callbackKey', 'CREATE_VARIABLE_NUMBER');
    xmlList.push(button);

    const blockList = Blockly.VariablesDynamic.flyoutCategoryBlocks(workspace);
    xmlList = xmlList.concat(blockList);
    return xmlList;
}

toolboxCategoryCallbacks['VARIABLE_DYNAMIC_CUSTOM'] = flyoutCategoryCustom;

blockCodeGenerators.variables_set_dynamic = (block, buffer, ctx) => {
    const variable = ctx.variables[(block.getField('VAR') as FieldVariable).getVariable()!.name];
    const value = generateCodeForBlock(variable.type, block.getInputTargetBlock('VALUE')!, buffer, ctx);
    buffer.startSegment();
    buffer.addCall(functionTable.variablesSetVar32, null, { type: 'uint16', value: variable.offset }, value);
    return { type: null, code: buffer.endSegment() }
};


blockCodeGenerators.variables_get_dynamic = (block, buffer, ctx) => {
    const variable = ctx.variables[(block.getField('VAR') as FieldVariable).getVariable()!.name]
    buffer.startSegment();
    switch (variable.type) {
        case "Number":
            buffer.addCall(functionTable.variablesGetVar32, 'Number', { type: 'uint16', value: variable.offset });
            break;
        default: throw new Error("Unknown variable type " + variable.type)
    }
    return { type: variable.type, code: buffer.endSegment() };
}

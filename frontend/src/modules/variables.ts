import { blockCodeGenerators, generateCodeForBlock, generateCodeForSequence } from "../compiler/compile";
import Blockly, { FieldVariable, Msg, WorkspaceSvg } from 'blockly';
import { addCategory, toolboxCategoryCallbacks } from "../toolbox";
import functionTable, { functionCallers } from "../compiler/functionTable";

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
    const variable = ctx.getVariable(block, 'VAR')
    const value = generateCodeForBlock(variable.type, block.getInputTargetBlock('VALUE')!, buffer, ctx);
    return { type: null, code: buffer.startSegment(code => functionCallers.variablesSetVar32(code, variable, value as any)) }
};


blockCodeGenerators.variables_get_dynamic = (block, buffer, ctx) => {
    const variable = ctx.getVariable(block, 'VAR')
    const code = buffer.startSegment();
    switch (variable.type) {
        case "Number":
            functionCallers.variablesGetVar32(code, variable);
            break;
        default: throw new Error("Unknown variable type " + variable.type)
    }
    return { type: variable.type, code };
}

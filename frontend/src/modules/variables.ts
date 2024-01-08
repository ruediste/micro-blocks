import { generateCodeForBlock, registerBlock } from "../compiler/compile";
import Blockly, { FlyoutButton, Msg, Variables, WorkspaceSvg } from 'blockly';
import { addCategory, toolboxCategoryCallbacks } from "../toolbox";
import functionTable, { functionCallers } from "../compiler/functionTable";

addCategory(
    {
        'kind': 'category',
        'name': 'Variables',
        'custom': 'VARIABLE_DYNAMIC_CUSTOM',
        'categorystyle': 'variable_category',
    });

function booleanButtonClickHandler(button: FlyoutButton) {
    Variables.createVariableButtonHandler(
        button.getTargetWorkspace(),
        undefined,
        'Boolean',
    );
}

function flyoutCategoryCustom(workspace: WorkspaceSvg): Element[] {
    // required to register butttton callbacks
    Blockly.VariablesDynamic.flyoutCategory(workspace);

    let xmlList = new Array<Element>();

    let button = document.createElement('button');
    button.setAttribute('text', Msg['NEW_NUMBER_VARIABLE']);
    button.setAttribute('callbackKey', 'CREATE_VARIABLE_NUMBER');
    xmlList.push(button);

    button = document.createElement('button');
    button.setAttribute('text', Msg['NEW_STRING_VARIABLE']);
    button.setAttribute('callbackKey', 'CREATE_VARIABLE_STRING');
    xmlList.push(button);

    button = document.createElement('button');
    button.setAttribute('text', 'Create boolean variable...');
    button.setAttribute('callbackKey', 'CREATE_VARIABLE_BOOLEAN');
    xmlList.push(button);

    button = document.createElement('button');
    button.setAttribute('text', Msg['NEW_COLOUR_VARIABLE']);
    button.setAttribute('callbackKey', 'CREATE_VARIABLE_COLOUR');
    xmlList.push(button);

    workspace.registerButtonCallback(
        'CREATE_VARIABLE_BOOLEAN',
        booleanButtonClickHandler,
    );

    const blockList = Blockly.VariablesDynamic.flyoutCategoryBlocks(workspace);
    xmlList = xmlList.concat(blockList);
    return xmlList;
}

toolboxCategoryCallbacks['VARIABLE_DYNAMIC_CUSTOM'] = flyoutCategoryCustom;

registerBlock('variables_set_dynamic', {
    codeGenerator: (block, buffer, ctx) => {
        const variable = ctx.getVariable(block, 'VAR')
        console.log(variable)
        const value = generateCodeForBlock(variable.type, block.getInputTargetBlock('VALUE')!, buffer, ctx);
        if (variable.is("Number"))
            return { type: null, code: buffer.startSegment(code => functionCallers.variablesSetVar32(code, variable, value as any)) }
        else if (variable.is("Boolean"))
            return { type: null, code: buffer.startSegment(code => functionCallers.variablesSetVar8(code, variable, value as any)) }
        else if (variable.is("Colour"))
            return { type: null, code: buffer.startSegment(code => functionCallers.colourSetVar(code, variable, value as any)) }
        else if (variable.is("String"))
            return { type: null, code: buffer.startSegment(code => functionCallers.variablesSetResourceHandle(code, variable, value as any)) }
        else
            throw new Error("Unknown variable type " + variable.type)
    }
});

registerBlock('variables_get_dynamic', {
    codeGenerator: (block, buffer, ctx) => {
        const variable = ctx.getVariable(block, 'VAR')
        const code = buffer.startSegment();
        if (variable.is("Number"))
            functionCallers.variablesGetVar32(code, variable);
        else if (variable.is("Boolean"))
            functionCallers.variablesGetVar8(code, variable);
        else if (variable.is("Colour")) {
            code.addCall(functionTable.variablesGetVar32, 'Number', { type: 'uint16', value: variable.offset }); // r
            code.addCall(functionTable.variablesGetVar32, 'Number', { type: 'uint16', value: variable.offset + 4 }); // g
            code.addCall(functionTable.variablesGetVar32, 'Number', { type: 'uint16', value: variable.offset + 8 }); // b
        }
        else if (variable.is("String"))
            functionCallers.variablesGetResourceHandle(code, variable);
        else
            throw new Error("Unknown variable type " + variable.type)
        return { type: variable.type, code };
    }
});
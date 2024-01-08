import Blockly, { MenuOption, WorkspaceSvg } from 'blockly';
import { workspaceData } from '../compiler/blockCodeGenerator';


export const referenceableBlockTypes: { [key: string]: string } = {};

function data(): { [key: string]: { [key: string]: string } } {
    workspaceData.blockReferences ??= {};
    return workspaceData.blockReferences;
}

export function collectBlockReferencesEventHandler(workspace: WorkspaceSvg) {
    return (event: Blockly.Events.Abstract) => {
        if (event instanceof Blockly.Events.BlockChange && event.blockId !== undefined && event.element == 'field') {
            const block = workspace.getBlockById(event.blockId);
            if (block == null || !(block.type in referenceableBlockTypes))
                return;
            if (event.name === referenceableBlockTypes[block.type]) {
                data()[block.type] ??= {};
                data()[block.type][event.blockId] = event.newValue as string;
            }
        };

        if (event instanceof Blockly.Events.BlockCreate && event.json?.type !== undefined && event.json?.type in referenceableBlockTypes) {
            data()[event.json?.type] ??= {};
            data()[event.json?.type][event.json.id!] = event.json.fields![referenceableBlockTypes[event.json.type]];
        }

        if (event instanceof Blockly.Events.BlockDelete && event.blockId !== undefined && event.oldJson?.type !== undefined && event.oldJson?.type in referenceableBlockTypes) {
            delete data()[event.oldJson?.type][event.blockId];
        }
    }
}

export function blockReferenceDropdown(referencedBlockType: string) {
    return new Blockly.FieldDropdown(function (this: Blockly.FieldDropdown) {
        data()[referencedBlockType] ??= {};
        const result = Object.entries(data()[referencedBlockType]).map(([id, name]) => [name, id]) as MenuOption[];
        if (result.length === 0)
            return [['', '']];
        return result;
    });
}

export function onchangeUpdateBlockReference(block: Blockly.BlockSvg, event: Blockly.Events.Abstract, referencingFieldName: string, referencedBlockType: string) {
    // filter for name change events on the config block selected by this read block
    const sensorBlockId = block.getFieldValue(referencingFieldName);
    if (event instanceof Blockly.Events.BlockChange && event.blockId === sensorBlockId && event.element == 'field' && event.name === referenceableBlockTypes[referencedBlockType]) {
        const field = (block.getField(referencingFieldName) as any);
        field.selectedOption = [event.newValue, sensorBlockId];
        field.forceRerender();
    }
    if (event instanceof Blockly.Events.BlockDelete && event.blockId === sensorBlockId) {
        console.log(event);
        block.dispose(true);
    }
}
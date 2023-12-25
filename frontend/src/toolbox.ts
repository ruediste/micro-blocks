import Blockly, { FlyoutButton, Toolbox, WorkspaceSvg } from "blockly";
import { bumpTopObjectsIntoBounds } from "blockly/core/bump_objects";
import { FlyoutDefinition, ToolboxInfo } from "blockly/core/utils/toolbox";

const toolbox: ToolboxInfo = {
    'kind': 'categoryToolbox',
    'contents': [
    ],
};

export const buttonCallbacks: { [key: string]: (p1: FlyoutButton) => void } = {};
export const toolboxCategoryCallbacks: { [key: string]: (p1: WorkspaceSvg) => FlyoutDefinition } = {};

export function addCategory(category: ToolboxInfo['contents'][number]) {
    toolbox.contents.push(category);
}

const defaultCategories: ToolboxInfo['contents'] = [
    {
        'kind': 'category',
        'name': 'Text',
        'categorystyle': 'text_category',
        'contents': [
            {
                'type': 'text',
                'kind': 'block',
                'fields': {
                    'TEXT': '',
                },
            },
            {
                'type': 'text_multiline',
                'kind': 'block',
                'fields': {
                    'TEXT': '',
                },
            },
            {
                'type': 'text_join',
                'kind': 'block',
            },
            {
                'type': 'text_append',
                'kind': 'block',
                'fields': {
                    'name': 'item',
                },
                'inputs': {
                    'TEXT': {
                        'shadow': {
                            'type': 'text',
                            'fields': {
                                'TEXT': '',
                            },
                        },
                    },
                },
            },
            {
                'type': 'text_length',
                'kind': 'block',
                'inputs': {
                    'VALUE': {
                        'shadow': {
                            'type': 'text',
                            'fields': {
                                'TEXT': 'abc',
                            },
                        },
                    },
                },
            },
            {
                'type': 'text_isEmpty',
                'kind': 'block',
                'inputs': {
                    'VALUE': {
                        'shadow': {
                            'type': 'text',
                            'fields': {
                                'TEXT': '',
                            },
                        },
                    },
                },
            },
            {
                'type': 'text_indexOf',
                'kind': 'block',
                'fields': {
                    'END': 'FIRST',
                },
                'inputs': {
                    'VALUE': {
                        'block': {
                            'type': 'variables_get',
                            'fields': {
                                'VAR': {
                                    'name': 'text',
                                },
                            },
                        },
                    },
                    'FIND': {
                        'shadow': {
                            'type': 'text',
                            'fields': {
                                'TEXT': 'abc',
                            },
                        },
                    },
                },
            },
            {
                'type': 'text_charAt',
                'kind': 'block',
                'fields': {
                    'WHERE': 'FROM_START',
                },
                'inputs': {
                    'VALUE': {
                        'block': {
                            'type': 'variables_get',
                            'fields': {
                                'VAR': {
                                    'name': 'text',
                                },
                            },
                        },
                    },
                },
            },
            {
                'type': 'text_getSubstring',
                'kind': 'block',
                'fields': {
                    'WHERE1': 'FROM_START',
                    'WHERE2': 'FROM_START',
                },
                'inputs': {
                    'STRING': {
                        'block': {
                            'type': 'variables_get',
                            'fields': {
                                'VAR': {
                                    'name': 'text',
                                },
                            },
                        },
                    },
                },
            },
            {
                'type': 'text_changeCase',
                'kind': 'block',
                'fields': {
                    'CASE': 'UPPERCASE',
                },
                'inputs': {
                    'TEXT': {
                        'shadow': {
                            'type': 'text',
                            'fields': {
                                'TEXT': 'abc',
                            },
                        },
                    },
                },
            },
            {
                'type': 'text_trim',
                'kind': 'block',
                'fields': {
                    'MODE': 'BOTH',
                },
                'inputs': {
                    'TEXT': {
                        'shadow': {
                            'type': 'text',
                            'fields': {
                                'TEXT': 'abc',
                            },
                        },
                    },
                },
            },
            {
                'type': 'text_count',
                'kind': 'block',
                'inputs': {
                    'SUB': {
                        'shadow': {
                            'type': 'text',
                            'fields': {
                                'TEXT': '',
                            },
                        },
                    },
                    'TEXT': {
                        'shadow': {
                            'type': 'text',
                            'fields': {
                                'TEXT': '',
                            },
                        },
                    },
                },
            },
            {
                'type': 'text_replace',
                'kind': 'block',
                'inputs': {
                    'FROM': {
                        'shadow': {
                            'type': 'text',
                            'fields': {
                                'TEXT': '',
                            },
                        },
                    },
                    'TO': {
                        'shadow': {
                            'type': 'text',
                            'fields': {
                                'TEXT': '',
                            },
                        },
                    },
                    'TEXT': {
                        'shadow': {
                            'type': 'text',
                            'fields': {
                                'TEXT': '',
                            },
                        },
                    },
                },
            },
            {
                'type': 'text_reverse',
                'kind': 'block',
                'inputs': {
                    'TEXT': {
                        'shadow': {
                            'type': 'text',
                            'fields': {
                                'TEXT': '',
                            },
                        },
                    },
                },
            },

            {
                'type': 'text_print',
                'kind': 'block',
                'inputs': {
                    'TEXT': {
                        'shadow': {
                            'type': 'text',
                            'fields': {
                                'TEXT': 'abc',
                            },
                        },
                    },
                },
            },
            {
                'type': 'text_prompt_ext',
                'kind': 'block',
                'fields': {
                    'TYPE': 'TEXT',
                },
                'inputs': {
                    'TEXT': {
                        'shadow': {
                            'type': 'text',
                            'fields': {
                                'TEXT': 'abc',
                            },
                        },
                    },
                },
            },
        ],
    },
    {
        'kind': 'category',
        'name': 'Lists',
        'categorystyle': 'list_category',
        'contents': [
            {
                'type': 'lists_create_with',
                'kind': 'block',
            },
            {
                'type': 'lists_create_with',
                'kind': 'block',
            },
            {
                'type': 'lists_repeat',
                'kind': 'block',
                'inputs': {
                    'NUM': {
                        'shadow': {
                            'type': 'math_number',
                            'fields': {
                                'NUM': 5,
                            },
                        },
                    },
                },
            },
            {
                'type': 'lists_length',
                'kind': 'block',
            },
            {
                'type': 'lists_isEmpty',
                'kind': 'block',
            },
            {
                'type': 'lists_indexOf',
                'kind': 'block',

                'fields': {
                    'END': 'FIRST',
                },
                'inputs': {
                    'VALUE': {
                        'block': {
                            'type': 'variables_get',
                            'fields': {
                                'VAR': {
                                    'name': 'list',
                                },
                            },
                        },
                    },
                },
            },
            {
                'type': 'lists_getIndex',
                'kind': 'block',
                'fields': {
                    'MODE': 'GET',
                    'WHERE': 'FROM_START',
                },
                'inputs': {
                    'VALUE': {
                        'block': {
                            'type': 'variables_get',
                            'fields': {
                                'VAR': {
                                    'name': 'list',
                                },
                            },
                        },
                    },
                },
            },
            {
                'type': 'lists_setIndex',
                'kind': 'block',
                'fields': {
                    'MODE': 'SET',
                    'WHERE': 'FROM_START',
                },
                'inputs': {
                    'LIST': {
                        'block': {
                            'type': 'variables_get',
                            'fields': {
                                'VAR': {
                                    'name': 'list',
                                },
                            },
                        },
                    },
                },
            },
            {
                'type': 'lists_getSublist',
                'kind': 'block',
                'fields': {
                    'WHERE1': 'FROM_START',
                    'WHERE2': 'FROM_START',
                },
                'inputs': {
                    'LIST': {
                        'block': {
                            'type': 'variables_get',
                            'fields': {
                                'VAR': {
                                    'name': 'list',
                                },
                            },
                        },
                    },
                },
            },
            {
                'type': 'lists_split',
                'kind': 'block',

                'fields': {
                    'MODE': 'SPLIT',
                },
                'inputs': {
                    'DELIM': {
                        'shadow': {
                            'type': 'text',
                            'fields': {
                                'TEXT': ',',
                            },
                        },
                    },
                },
            },
            {
                'type': 'lists_sort',
                'kind': 'block',

                'fields': {
                    'TYPE': 'NUMERIC',
                    'DIRECTION': '1',
                },
            },
            {
                'type': 'lists_reverse',
                'kind': 'block',
            },
        ],
    },
    {
        'kind': 'category',
        'categorystyle': 'colour_category',
        'name': 'Colour',
        'contents': [
            {
                'type': 'colour_picker',
                'kind': 'block',
                'fields': {
                    'COLOUR': '#ff0000',
                },
            },
            {
                'type': 'colour_random',
                'kind': 'block',
            },
            {
                'type': 'colour_rgb',
                'kind': 'block',
                'inputs': {
                    'RED': {
                        'shadow': {
                            'type': 'math_number',
                            'fields': {
                                'NUM': 100,
                            },
                        },
                    },
                    'GREEN': {
                        'shadow': {
                            'type': 'math_number',
                            'fields': {
                                'NUM': 50,
                            },
                        },
                    },
                    'BLUE': {
                        'shadow': {
                            'type': 'math_number',
                            'fields': {
                                'NUM': 0,
                            },
                        },
                    },
                },
            },
            {
                'type': 'colour_blend',
                'kind': 'block',
                'inputs': {
                    'COLOUR1': {
                        'shadow': {
                            'type': 'colour_picker',
                            'fields': {
                                'COLOUR': '#ff0000',
                            },
                        },
                    },
                    'COLOUR2': {
                        'shadow': {
                            'type': 'colour_picker',
                            'fields': {
                                'COLOUR': '#3333ff',
                            },
                        },
                    },
                    'RATIO': {
                        'shadow': {
                            'type': 'math_number',
                            'fields': {
                                'NUM': 0.5,
                            },
                        },
                    },
                },
            },
        ],
    },
    {
        'kind': 'sep',
    },
    {
        'kind': 'category',
        'name': 'Variables',
        'custom': 'VARIABLE_DYNAMIC',
        'categorystyle': 'variable_category',
    },
    {
        'kind': 'category',
        'name': 'Functions',
        'custom': 'PROCEDURE',
        'categorystyle': 'procedure_category',
    },
];

export function addDefaultCategories() {
    //defaultCategories.forEach(c => toolbox.contents.push(c));
}
export function clearToolbox() {
    toolbox.contents = [];
}

export default toolbox;
import { useEffect, useRef } from 'react';
import './App.scss';
import Blockly, { BlocklyOptions } from 'blockly';
import toolbox from './toolbox';
import compile from './compile';


Blockly.common.defineBlocksWithJsonArray([
  {
    "type": "play_sound",
    "message0": "Play %1 foo",
    "args0": [
      {
        "type": "field_dropdown",
        "name": "VALUE",
        "options": [
          ["C4", "sounds/c4.m4a"],
          ["D4", "sounds/d4.m4a"],
          ["E4", "sounds/e4.m4a"],
          ["F4", "sounds/f4.m4a"],
          ["G4", "sounds/g4.m4a"]
        ]
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 355
  },
  {
    "type": "set_pin",
    "message0": "Set Pin %1 to %2",
    "args0": [
      {
        "type": "field_number",
        "name": "pin",
        "value": 0
      },
      {
        "type": "input_value",
        "name": "value"
      }
    ],
    "colour": 230,
    "previousStatement": null,
    "nextStatement": null,
    "tooltip": "If the value is false or zero, set the pin to low, high otherwise",
    "helpUrl": ""
  },
  {
    "type": "on_pin_change",
    "message0": "On Pin %1 change %2 Edge %3 Pull %4 %5 %6",
    "args0": [
      {
        "type": "field_number",
        "name": "pin",
        "value": 0
      },
      {
        "type": "input_end_row"
      },
      {
        "type": "field_dropdown",
        "name": "edge",
        "options": [
          [
            "raising",
            "RAISIN"
          ],
          [
            "falling",
            "FALLING"
          ],
          [
            "BOTH",
            "BOTH"
          ]
        ]
      },
      {
        "type": "field_dropdown",
        "name": "pull",
        "options": [
          [
            "up",
            "UP"
          ],
          [
            "down",
            "DOWN"
          ],
          [
            "none",
            "NONE"
          ]
        ]
      },
      {
        "type": "input_dummy"
      },
      {
        "type": "input_statement",
        "name": "BODY"
      }
    ],
    "colour": 230,
    "tooltip": "",
    "helpUrl": ""
  }
]);

var options: BlocklyOptions = {
  toolbox: toolbox,
  collapse: true,
  comments: true,
  disable: true,
  maxBlocks: Infinity,
  trashcan: true,
  horizontalLayout: false,
  toolboxPosition: 'start',
  css: true,
  media: 'https://blockly-demo.appspot.com/static/media/',
  rtl: false,
  scrollbars: true,
  sounds: true,
  oneBasedIndex: true
};



function MyWorkspace() {
  const ref = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const workspace = useRef<Blockly.WorkspaceSvg | null>(null);


  const resize = () => {
    console.log('resize');
    let element: HTMLElement | null = areaRef.current!;
    let x = 0;
    let y = 0;
    while (element) {
      x += element.offsetLeft;
      y += element.offsetTop;
      element = element.offsetParent as any;
    };
    // Position blocklyDiv over blocklyArea.
    const blocklyDiv = ref.current!;
    blocklyDiv.style.left = x + 'px';
    blocklyDiv.style.top = y + 'px';
    blocklyDiv.style.width = areaRef.current!.offsetWidth + 'px';
    blocklyDiv.style.height = areaRef.current!.offsetHeight + 'px';
    Blockly.svgResize(workspace.current!);
  };

  useEffect(() => {
    ref.current!.innerHTML = '';

    const tmp = Blockly.inject(ref.current!, options);
    // tmp.getTopBlocks(true).forEach((block) => {block.inputList});

    workspace.current = tmp;
    const serializedWorkspace = localStorage.getItem("workspace");
    if (serializedWorkspace != null)
      Blockly.serialization.workspaces.load(JSON.parse(serializedWorkspace), tmp);
    resize();
    window.addEventListener('resize', resize, false);
    return () => window.removeEventListener('resize', resize, false);
  }, []);

  return <>
    <div style={{ display: 'flex', gap: '8px' }}>
      <button type="button" className="btn btn-secondary" onClick={() => localStorage.setItem("workspace", JSON.stringify(Blockly.serialization.workspaces.save(workspace.current!)))}>Save</button>
      <button type="button" className="btn btn-secondary" onClick={() => compile(workspace.current!)}>Compile</button>
    </div >
    <div style={{ flexGrow: 1 }} ref={areaRef}></div>
    <div style={{ position: 'absolute' }} ref={ref}></div>
  </>
}
function App() {
  return (<>
    <MyWorkspace />
  </>
  );
}

export default App;

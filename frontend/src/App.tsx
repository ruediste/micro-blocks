import { useEffect, useRef } from 'react';
import './App.scss';
import Blockly, { BlocklyOptions } from 'blockly';
import toolbox from './toolbox';
import compile from './compile';


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

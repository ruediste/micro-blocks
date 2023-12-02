import { useEffect, useRef } from 'react';
import Blockly, { BlocklyOptions } from 'blockly';
import toolbox from './toolbox';
import compile from './compiler/compile';
import { defineBlocks } from './defineBlocks';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { post } from './system/useData';

defineBlocks();

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

function save(filename: string, data: Blob) {
  const blob = new Blob([data], { type: 'application/octet-stream' });
  const elem = window.document.createElement('a');
  elem.href = window.URL.createObjectURL(blob);
  elem.download = filename;
  document.body.appendChild(elem);
  elem.click();
  document.body.removeChild(elem);
}

export default function Workspace() {
  const ref = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const workspace = useRef<Blockly.WorkspaceSvg | null>(null);

  const resize = () => {
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
      <button type="button" className="btn btn-secondary" onClick={() => {
        const code = compile(workspace.current!);
        if (code !== undefined) {
          // save('block.mb', new Blob([code]));
          post('code').bodyRaw(new Blob([code])).send();
        }
        else
          toast("There was a compilation error");
      }}>Compile</button>
    </div >
    <div style={{ flexGrow: 1 }} ref={areaRef}></div>
    <div style={{ position: 'absolute' }} ref={ref}></div>
  </>
}

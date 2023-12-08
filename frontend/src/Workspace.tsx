import { useEffect, useRef } from 'react';
import Blockly, { BlocklyOptions } from 'blockly';
import toolbox, { buttonCallbacks, toolboxCategoryCallbacks } from './toolbox';
import compile from './compiler/compile';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { post } from './system/useData';

var options: BlocklyOptions = {
  toolbox: toolbox,
  collapse: true,
  comments: true,
  disable: false,
  maxBlocks: Infinity,
  trashcan: true,
  horizontalLayout: false,
  toolboxPosition: 'start',
  css: true,
  media: process.env.PUBLIC_URL + '/blocklyMedia/',
  rtl: false,
  scrollbars: true,
  sounds: true,
  oneBasedIndex: true,
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
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);

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
    Blockly.svgResize(workspaceRef.current!);
  };

  const saveWorkspaceToLocalStorage = () => {
    localStorage.setItem("workspace", JSON.stringify(Blockly.serialization.workspaces.save(workspaceRef.current!)))
  }
  useEffect(() => {
    ref.current!.innerHTML = '';

    const workspace = Blockly.inject(ref.current!, options);
    workspace.addChangeListener(Blockly.Events.disableOrphans);
    Object.entries(buttonCallbacks).forEach(([name, callback]) => workspace.registerButtonCallback(name, callback));
    Object.entries(toolboxCategoryCallbacks).forEach(([name, callback]) => workspace.registerToolboxCategoryCallback(name, callback));

    workspaceRef.current = workspace;
    const serializedWorkspace = localStorage.getItem("workspace");
    if (serializedWorkspace != null) {
      try {
        Blockly.serialization.workspaces.load(JSON.parse(serializedWorkspace), workspace);
      } catch (e) {
        console.error("Error while loading workspace", e);
      }
    }
    resize();
    window.addEventListener('resize', resize, false);
    return () => window.removeEventListener('resize', resize, false);
  }, []);

  return <>
    <div style={{ display: 'flex', gap: '8px' }}>
      <button type="button" className="btn btn-secondary" onClick={saveWorkspaceToLocalStorage}>Save</button>
      <button type="button" className="btn btn-secondary" onClick={() => {
        saveWorkspaceToLocalStorage();
        const code = compile(workspaceRef.current!);
        if (code !== undefined) {
          // save('block.mb', new Blob([code]));
          const progress = toast("Uploading Code...");
          post('code')
            .bodyRaw(new Blob([code]))
            .error(() => { toast.dismiss(progress); toast("Failed to upload the code", { type: 'error' }); })
            .success(() => { toast.dismiss(progress); toast("Code uploaded successfully", { type: 'success' }); })
            .send();
        }
        else
          toast("There was a compilation error", { type: 'error' });
      }}>Run</button>
    </div >
    <div style={{ flexGrow: 1 }} ref={areaRef}></div>
    <div style={{ position: 'absolute' }} ref={ref}></div>
  </>
}

import {
  Navbar,
  Alignment,
  Button,
  ButtonGroup,
  HTMLTable,
  Tree,
  Icon,
  OverlayToaster,
  Intent,
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";

import { Mosaic, MosaicWindow } from "react-mosaic-component";
import "react-mosaic-component/react-mosaic-component.css";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "./App.css";

import { assemble, simulate } from "./emulator";
import BetaVisualization from "./BetaVisualization";
import AssemblyEditor from "./AssemblyEditor";
import MemoryViewer from "./MemoryViewer";
import Registers from "./Registers";

const DEFAULT_ASSEMBLY_CODE = `ADDC(R31, 6, R1)
SUBC(R31, 18, R2)
ADD(R1, R2, R3) | write R1+R2 to R3
HALT() | exit`;

const getItem = (key: string, defaultValue: any = null): any => {
  const value = localStorage.getItem(key);
  if (value === null && defaultValue !== null) {
    return defaultValue;
  }
  return value !== null ? value : defaultValue;
};

const setItem = (key: string, value: string): void => {
  if (value === "") {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, value);
  }
};

const MyTree = () => {
  return (
    <div style={{ maxHeight: "100%", width: "100%", overflowY: "auto" }}>
      <Tree
        contents={[
          {
            id: "reset",
            label: "Reset",
            icon: "reset",
            isExpanded: false,
            secondaryLabel: <Icon icon="small-tick" intent="success" />,
            childNodes: [],
          },
          {
            id: "ld",
            label: "LD(R1,0x0,R3)",
            icon: "cog",
            isExpanded: true,
            secondaryLabel: <Icon icon="hand-left" intent="primary" />,
            childNodes: [
              {
                id: "fetch",
                label: "Fetch",
                icon: "compressed",
                isExpanded: true,
                childNodes: [
                  {
                    id: "read-instruction",
                    label: "Read instruction from memory",
                    icon: "archive",
                    childNodes: [],
                  },
                  {
                    id: "update-pc",
                    label: "Update the Program Counter",
                    icon: "automatic-updates",
                    childNodes: [],
                  },
                ],
              },
              {
                id: "decode",
                label: "Decode",
                icon: "binary-number",
                isExpanded: true,
                childNodes: [
                  {
                    id: "decode-instruction",
                    label: "Decode the instruction",
                    icon: "git-branch",
                    childNodes: [],
                  },
                  {
                    id: "identify-datapaths",
                    label: "Identify registers and data paths",
                    icon: "switch",
                    childNodes: [],
                  },
                  {
                    id: "extract-value",
                    label: "Extract immediate values or memory addresses",
                    icon: "tag-refresh",
                    childNodes: [],
                  },
                ],
              },
            ],
          },
        ]}
        onNodeClick={(node) => console.log(node)}
        className="bp5-tree bp5-elevation-0"
      />
    </div>
  );
};

export type ViewId =
  | "processor"
  | "assembly"
  | "registers"
  | "memory"
  | "timeline"
  | "new";

const TITLE_MAP: Record<ViewId, string> = {
  processor: "Processor",
  assembly: "Assembly Editor",
  registers: "Registers",
  memory: "Memory",
  timeline: "Timeline",
  new: "Empty Window",
};

function App() {
  const assemblyCodeRef = useRef<string>(DEFAULT_ASSEMBLY_CODE);
  const [buffer, setBuffer] = useState<ArrayBuffer>(new ArrayBuffer(1024));
  const [frames, setFrames] = useState<any>([]);
  const [currentFrame, setCurrentFrame] = useState<number>(0);

  const COMPONENT_MAP = {
    processor: () => (
      <div style={{ width: "100%", height: "100%" }}>
        <textarea style={{ width: "100%", height: "100%" }} value={frames.length > 0
            ? JSON.stringify(frames[currentFrame], null, 2)
            : "点那个蓝色按钮开始模拟,之后用Previous Step和Next Step来切换frame"} readOnly={true} />
        {/* <BetaVisualization /> */}
      </div>
    ),
    assembly: () => (
      <AssemblyEditor
        defaultValue={getItem("assemblyCode", DEFAULT_ASSEMBLY_CODE)}
        onChange={(val, viewUpdate) => {
          assemblyCodeRef.current = val;
          setItem("assemblyCode", val);
        }}
      />
    ),
    registers: () => <Registers values={[1]} />,
    memory: () => <MemoryViewer buffer={buffer} />,
    timeline: () => <MyTree />,
    new: () => <h1>I am an empty window.</h1>,
  };

  return (
    <div id="app">
      <Navbar>
        <Navbar.Group align={Alignment.LEFT}>
          <Navbar.Heading>Beta Playground</Navbar.Heading>
          <Navbar.Divider />
          {/* <Button className="bp5-minimal" icon="home" text="New" />
        <Button className="bp5-minimal" icon="document-open" text="Open" />
        <Button className="bp5-minimal" icon="floppy-disk" text="Save" />
        <Navbar.Divider /> */}
          <ButtonGroup large={false}>
            <Button
              icon="manually-entered-data"
              intent="primary"
              onClick={async () => {
                try {
                  let assembled = assemble(assemblyCodeRef.current);
                  console.log(assemblyCodeRef.current);
                  let simulation = simulate(assembled);
                  (
                    await OverlayToaster.createAsync({
                      position: "top",
                    })
                  ).show({
                    message: "Successfully assembled the code",
                    icon: "tick",
                    intent: Intent.SUCCESS,
                  });
                  setBuffer(assembled);
                  setFrames(simulation);
                  setCurrentFrame(0);
                  console.log(simulation);
                } catch (error: any) {
                  console.log(error);
                  (
                    await OverlayToaster.createAsync({
                      position: "top",
                    })
                  ).show({
                    message: `An error occurred during the assembly process: ${error.message}`,
                    icon: "warning-sign",
                    intent: Intent.DANGER,
                  });
                }
              }}
            >
              Write ASM to RAM
            </Button>
            <Button
              icon="fast-backward"
              intent="warning"
              disabled={
                frames.length === 0 || frames === null || currentFrame === 0
              }
            >
              Previous Instruction
            </Button>
            <Button
              icon="step-backward"
              intent="warning"
              disabled={
                frames.length === 0 || frames === null || currentFrame === 0
              }
              onClick={() => setCurrentFrame(currentFrame - 1)}
            >
              Previous Step
            </Button>
            <Button
              icon="play"
              intent="success"
              disabled={
                frames.length === 0 ||
                frames === null ||
                currentFrame === frames.length - 1
              }
              onClick={() => setCurrentFrame(currentFrame + 1)}
            >
              Next Step
            </Button>
            <Button
              icon="fast-forward"
              intent="success"
              disabled={
                frames.length === 0 ||
                frames === null ||
                currentFrame === frames.length - 1
              }
            >
              Next Instruction
            </Button>
            <Button icon="reset" intent="danger">
              Reset
            </Button>
            <Button icon="cog" disabled={true}></Button>
          </ButtonGroup>
        </Navbar.Group>
      </Navbar>
      <Mosaic<ViewId>
        renderTile={(id, path) => {
          const Component = COMPONENT_MAP[id];
            return (
            <MosaicWindow<ViewId>
              path={path}
              createNode={() => "new"}
              title={TITLE_MAP[id]}
              toolbarControls={[]}
            >
              <Component key={id} />
            </MosaicWindow>
            );
        }}
        initialValue={JSON.parse(
          getItem(
            "mosaicLayout",
            JSON.stringify({
              direction: "row",
              first: {
                direction: "column",
                first: "processor",
                second: {
                  direction: "row",
                  first: "memory",
                  second: "registers",
                  splitPercentage: 50,
                },
                splitPercentage: 70,
              },
              second: {
                direction: "column",
                first: "assembly",
                second: "timeline",
                splitPercentage: 50,
              },
              splitPercentage: 60,
            })
          )
        )}
        onChange={(newNode) => setItem("mosaicLayout", JSON.stringify(newNode))}
        blueprintNamespace="bp5"
      />
    </div>
  );
}

export default App;

import { useState } from "react";
import {
  createBrowserRouter,
  Link,
  RouterProvider,
  useLocation,
} from "react-router-dom";
import Workspace from "./Workspace";
import { WifiPage } from "./system/WifiConfig";
import { SystemStatus } from "./system/SystemStatus";
import { ToastContainer } from "react-toastify";
import { LogViewer } from "./LogViewer";
import { GuiDisplay } from "./GuiDisplay";

interface NavEntry {
  title: string;
  path: string;
  component: React.ReactNode;
}

let navEntries: NavEntry[] = [
  { title: "Home", path: "/", component: <Workspace /> },
  { title: "Log", path: "/log", component: <LogViewer /> },
  { title: "GUI", path: "/gui", component: <GuiDisplay /> },
  { title: "Wifi", path: "/wifiConfig", component: <WifiPage /> },
  {
    title: "System Status",
    path: "/systemStatus",
    component: <SystemStatus />,
  },
];

const router = createBrowserRouter(
  navEntries.map((e) => ({
    path: e.path,
    element: (
      <>
        <Navigation />
        {e.component}
      </>
    ),
  }))
);

function Navigation() {
  const location = useLocation();
  const [collapse, setCollapse] = useState(true);
  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">
          MicroBlocks
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          aria-controls="navbarSupportedContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
          onClick={() => setCollapse((x) => !x)}
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className={"collapse navbar-collapse " + (collapse ? "" : "show")}>
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            {navEntries.map((e, idx) => (
              <Link
                key={idx}
                className={
                  "nav-item nav-link" +
                  (location.pathname === e.path ? " active" : "")
                }
                to={e.path}
              >
                {e.title}
              </Link>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}
function App() {
  return <>
    <RouterProvider router={router} />;
    <ToastContainer />
  </>
}

export default App;

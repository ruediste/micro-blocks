import { useEffect, useState } from "react";
import useData, { WithData, post } from "./useData";


interface Configuration {
  wifiOperationMode: number;
  deviceName: string;
  wifiStaSsid: string;
  wifiStaPwd: string;
  wifiApSsid: string;
  wifiApPwd: string;
}

const operationModeChoices = [
  { value: 0, label: "Access Point only" },
  { value: 1, label: "Station with AP fallback" },
  { value: 2, label: "Access Point and Station" },
];

const stationStatus: { [key: number]: string } = {
  0: "OFF",
  1: "CONNECTING",
  2: "CONNECTED",
};

const accessPointStatus: { [key: number]: string } = {
  0: "OFF",
  1: "STARTED"
};

interface WifiStatus {
  version: number;
  stationStatus: number;
  apStatus: number;
}

export function WifiStatus() {
  return <WithData<WifiStatus> url="wifiStatus" refreshMs={1000} versionField="version">
    {(status) => <>
      <div className="mb-3">
        <label className="form-label">Access Point Status</label>
        <input
          type="text"
          className="form-control"
          value={accessPointStatus[status.apStatus]}
          disabled
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Station Status</label>
        <input
          type="text"
          className="form-control"
          value={stationStatus[status.stationStatus]}
          disabled
        />
      </div>
    </>}
  </WithData>
}

export function WifiConfig() {
  const data = useData<Configuration>({ url: "wifiConfig" });
  const [config, setConfig] = useState<Configuration>();
  useEffect(() => {
    if (data.state === "success") {
      setConfig(data.value);
    }
  }, [data.state === "success" ? data.value : undefined]);

  if (data.state !== "success") return data.placeholder;

  if (config === undefined) return <>Loading</>;

  return (
    <>
      <div className="mb-3">
        <label className="form-label">Mode</label>
        <select className="form-select"
          onChange={(e) => setConfig({ ...config, wifiOperationMode: parseInt(e.target.value) })}
        >
          {operationModeChoices.map((choice) =>
            <option
              key={choice.value}
              selected={choice.value == config.wifiOperationMode}
              value={choice.value}>
              {choice.label}</option>)}
        </select>
      </div>

      <div className="mb-3">
        <label className="form-label">Device Name</label>
        <input
          type="text"
          className="form-control"
          value={config.deviceName}
          onChange={(e) => setConfig({ ...config, deviceName: e.target.value })}
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Access Point SSID</label>
        <input
          type="text"
          className="form-control"
          value={config.wifiApSsid}
          onChange={(e) => setConfig({ ...config, wifiApSsid: e.target.value })}
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Access Point Password</label>
        <input
          type="text"
          className="form-control"
          value={config.wifiApPwd}
          onChange={(e) => setConfig({ ...config, wifiApPwd: e.target.value })}
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Station SSID</label>
        <input
          type="text"
          className="form-control"
          value={config.wifiStaSsid}
          onChange={(e) => setConfig({ ...config, wifiStaSsid: e.target.value })}
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Station Password</label>
        <input
          type="text"
          className="form-control"
          value={config.wifiStaPwd}
          onChange={(e) => setConfig({ ...config, wifiStaPwd: e.target.value })}
        />
      </div>


      <button
        type="button"
        className="btn btn-primary"
        onClick={() =>
          post("wifiConfig").acceptJson().body(config).send()
        }
      >
        Apply
      </button>
    </>
  );
}

export function WifiPage() {
  return <>
    <div className="d-flex flex-row" style={{ columnGap: '16px' }}>
      <div>
        <WifiStatus />
      </div>
      <div>
        <WifiConfig />
      </div>
    </div>
  </>
}
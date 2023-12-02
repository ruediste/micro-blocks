import { useState } from "react";
import { WithData, post } from "./useData";

function OtaUpload({ isFrontend }: { isFrontend: boolean }) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [error, setError] = useState<string>();
    const [success, setSuccess] = useState(false);

    const handleSubmission = () => {
        setSuccess(false);
        setError(undefined);
        fetch(
            '/api/update' + (isFrontend ? '?fileSystem' : ''),
            {
                method: 'POST',
                body: selectedFile,
            }
        )
            .then((response) => response.json())
            .then((result) => {
                console.log('Success:', result);
                setSuccess(true);
            })
            .catch((error) => {
                console.error('Error:', error);
                setError("" + error);
            });
    };

    return (
        <div>
            <div className="mb-3">
                <label className="form-label">{isFrontend ? 'Choose frontend file' : 'Choose firmware file'}</label>
                <input className="form-control" type="file" onChange={e => setSelectedFile(e.target.files?.item(0) ?? null)} />
            </div>

            <div>
                <button type="button"
                    disabled={!selectedFile}
                    className="btn btn-primary" onClick={handleSubmission}>Upload</button>
            </div>
            {error ? <div>Error: {error}</div> : null}
        </div>
    )
}

interface SystemStatus {
    temperature: number;
    hall: number;
    freeHeap: number;
}

export function SystemStatus() {
    return (
        <>
            <OtaUpload isFrontend={false} />
            <OtaUpload isFrontend={true} />
            <WithData<SystemStatus> url="systemStatus" refreshMs={1000}>
                {(status) => <>
                    <div className="mb-3">
                        <label className="form-label">Temperature</label>
                        <input
                            type="text"
                            className="form-control"
                            value={status.temperature}
                            disabled
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Hall</label>
                        <input
                            type="text"
                            className="form-control"
                            value={status.hall}
                            disabled
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Free Heap</label>
                        <input
                            type="text"
                            className="form-control"
                            value={status.freeHeap}
                            disabled
                        />
                    </div>
                </>}
            </WithData>
            <button
                type="button"
                className="btn btn-primary mt-5"
                onClick={() => post("restart").send()}
            >
                Restart
            </button>
        </>
    );
}
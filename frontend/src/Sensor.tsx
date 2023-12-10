import { read } from "fs";
import { useEffect, useState } from "react";
import { MessageType, sendMessage } from "./websocket";
import BinaryMessageMapper from "./binaryMessageMapper";

async function askForPermission(): Promise<void> {
    const permission = "accelerometer";
    const result = await navigator.permissions.query({ name: permission as any });
    if (result.state === "denied") {
        console.log("Permission to use " + permission + " is denied.");
        return Promise.reject();
    }
    if (result.state === "granted") {
        console.log("Permission to use " + permission + " is granted.");
        return Promise.resolve();
    }
    if (result.state === "prompt") {
        console.log("Prompting to use " + permission);
        return new Promise<void>((resolve, reject) => {
            result.onchange = () => {
                if (result.state === "granted") {
                    console.log("Permission to use " + permission + " is granted.");
                    resolve();
                }
                if (result.state === "denied") {
                    console.log("Permission to use " + permission + " is denied.");
                    reject();
                }
            }
        });
    }
}

function round(value: number, decimals: number) {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

export default function Sensor() {
    const [reconnect, setReconnect] = useState({});
    const [connectionFailed, setConnectionFailed] = useState(false);
    const [reading, setReading] = useState({ x: 0, y: 0, z: 0 });
    useEffect(() => {
        try {
            askForPermission().then(() => {
                try {
                    const accelerometer = new GravitySensor({ frequency: 5 });
                    accelerometer.onerror = (event) => {
                        // Handle runtime errors.
                        if (event.error.name === 'NotAllowedError') {
                            console.log('Permission to access sensor was denied.');
                        } else if (event.error.name === 'NotReadableError') {
                            console.log('Cannot connect to the sensor.');
                        }
                        setConnectionFailed(true);
                    };
                    accelerometer.onreading = (e) => {
                        // console.log(e);
                        const tmp = { x: accelerometer.x ?? 0, y: accelerometer.y ?? 0, z: accelerometer.z ?? 0 };
                        setReading(tmp);
                        sendMessage(MessageType.GRAVITY_SENSOR_VALUE, new BinaryMessageMapper().float32('x').float32('y').float32('z'), tmp)
                    };
                    accelerometer.start();
                } catch (error: any) {
                    setConnectionFailed(true);
                    // Handle construction errors.
                    if (error.name === 'SecurityError') {
                        console.log('Sensor construction was blocked by the Permissions Policy.');
                    } else if (error.name === 'ReferenceError') {
                        console.log('Sensor is not supported by the User Agent.');
                    } else {
                        throw error;
                    }
                }
            });
        } catch {
            setConnectionFailed(true);
        }
    }, [reconnect]);

    return <>x: {round(reading.x, 2)} y: {round(reading.y, 2)} z: {round(reading.z, 2)}
        {connectionFailed && <button type="button" className="btn btn-secondary" onClick={() => setReconnect({})}>Connect</button >} </>
}
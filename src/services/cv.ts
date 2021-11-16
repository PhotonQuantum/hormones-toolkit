import {WorkerOutput} from "../workers/cv";
import {v4 as uuidv4} from "uuid";

const generate_job_id = (ev: PreWorkerEvent): string => {
    return ev.type + "-" + uuidv4();
}

interface PreWorkerEvent {
    type: "load" | "run",
    data?: ImageData
}

class CV {
    worker: Worker | null = null;
    jobs: Map<string, WorkerOutput | null> = new Map();

    _dispatch(event: PreWorkerEvent) {
        if (this.worker === null) return;

        const job_id = generate_job_id(event);

        this.jobs.set(job_id, null);
        this.worker.postMessage({job: job_id, ...event});

        return new Promise((resolve, _) => {
            let interval = setInterval(() => {
                const output = this.jobs.get(job_id);
                if (output !== null && output !== undefined) {
                    clearInterval(interval);
                    this.jobs.delete(job_id);
                    resolve(output);
                }
            }, 100)
        })
    }

    load() {
        if (this.worker !== null) {
            return new Promise((resolve, _) => {
                resolve({});
            })
        }

        this.worker = new Worker(new URL("../workers/cv.ts", import.meta.url), {"type": "module"}); // load worker

        // Capture events and save [status, event] inside the _status object
        this.worker.onmessage = (e: MessageEvent<WorkerOutput>) => this.jobs.set(e.data.job, e.data.data);
        return this._dispatch({type: "load"});
    }

    run(image: ImageData): Promise<ImageData> {
        return (this._dispatch({type: "run", data: image}) as Promise<ImageData>);
    }
}

export const preprocessor = new CV();
import {Uploader} from "./components/uploader";
import {ReactElement, useEffect, useReducer, useState} from "react";
import {createWorker, Worker} from "tesseract.js";
import {imageDataFromFile} from "./utils/cv";
import {parseLine} from "./utils/parser";
import {preprocessor} from "./services/cv";

type ReadyState = {
    "opencv": boolean,
    "tesseract": boolean
}

type ReadyAction = {
    "type": "opencv" | "tesseract"
}

function readyReducer(prevState: ReadyState, action: ReadyAction): ReadyState {
    switch (action.type) {
        case "opencv": {
            return {
                ...prevState,
                "opencv": true
            }
        }
        case "tesseract": {
            return {
                ...prevState,
                "tesseract": true
            }
        }
    }
}

const createTesseractWorker = async (logger: ((arg: any) => void)) => {
    const worker = createWorker({
        langPath: "./lang-data",
        logger: logger
    });
    await worker.load();
    await worker.loadLanguage("chi_sim");
    await worker.initialize("chi_sim");
    await worker.setParameters({
        tessedit_char_whitelist: '睾酮孕雌二醇促卵泡刺激生成素黄体垂泌乳1234567890./<>pnmolgIUdL'
    })
    return worker;
}

export const App = () => {
    const initialReadyState: ReadyState = {"opencv": false, "tesseract": false};
    const [output, setOutput] = useState<ReactElement[]>([]);
    const [progress, setProgress] = useState<string>("");
    const [ready, dispatchReady] = useReducer(readyReducer, initialReadyState);
    const [tesseract, setTesseract] = useState<Worker | null>(null);
    const [debug, setDebug] = useState(false);

    const updateLog = (obj: any) => {
        if (obj.status === "recognizing text") {
            setProgress((obj.progress * 100).toFixed(2).toString() + "%")
        }
    };

    useEffect(() => {
        (async () => {
            if (tesseract !== null) {
                return;
            }
            const worker = await createTesseractWorker(updateLog);
            setTesseract(worker);
        })();
        dispatchReady({"type": "tesseract"});
        // eslint-disable-next-line
    }, []);

    useEffect(() => {
        (async () => {
            await preprocessor.load();
        })()
        dispatchReady({"type": "opencv"});
    }, []);

    const recognize = (f: File) => {
        (async () => {
            if (tesseract === null) {
                console.log("worker not loaded, bail out");
                return;
            }

            const image = await imageDataFromFile(f);
            if (image === undefined) {
                return;
            }

            const preprocessed = await preprocessor.run(image);
            const outputCanvas = document.getElementById("outputCanvas") as HTMLCanvasElement;
            outputCanvas.height = preprocessed.height;
            outputCanvas.width = preprocessed.width;
            outputCanvas.getContext("2d")?.putImageData(preprocessed, 0, 0);

            const {data} = await tesseract.recognize(outputCanvas);

            const output = data.lines.flatMap((x) => {
                let res = parseLine(x.text);
                if (res.isOk()) {
                    // @ts-ignore
                    return [<li key={res.unwrap().name}>{res.unwrap().display()}</li>];
                } else {
                    console.log("boom", x.text);
                    return [];
                }
            });
            setOutput(output);
        })();
    };
    return (
        <div>
            <h1>Hello world!</h1>
            <p hidden={ready.opencv}>Loading opencv...</p>
            <p hidden={ready.tesseract}>Loading tesseract...</p>
            <Uploader disabled={!(ready.opencv && ready.tesseract)} callback={recognize}/>
            <div>
                <button
                    disabled={!(ready.opencv && ready.tesseract)}
                    onClick={_ => setDebug(true)}
                >
                    Enable Debug
                </button>
            </div>
            <div>
                <h3>Progress</h3>
                <p>{progress}</p>
            </div>
            <div>
                <h3>Output</h3>
                <ul>
                    {output}
                </ul>
            </div>
            <div hidden={!debug}>
                <h3>Source</h3>
                <img id="inputImg" src="#" alt="input file"/>
                <h3>Preprocessed</h3>
                <canvas id="outputCanvas"/>
            </div>
        </div>
    )
}

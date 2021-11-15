import {Uploader} from "./components/uploader";
import {ReactElement, useEffect, useState} from "react";
import {createWorker, Worker} from "tesseract.js";
import {loadImage, run_preprocess} from "./utils/cv";
import {parseLine} from "./utils/parser";

export const App = () => {
    const [output, setOutput] = useState<ReactElement[]>([]);
    const [progress, setProgress] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [worker, setWorker] = useState<Worker | null>(null);
    const [debug, setDebug] = useState(false);
    const updateLog = (obj: any) => {
        if (obj.status === "recognizing text") {
            setProgress((obj.progress * 100).toFixed(2).toString() + "%")
        }
    };
    useEffect(() => {
        (async () => {
            if (worker !== null) {
                return;
            }
            const newWorker = createWorker({
                langPath: "./lang-data",
                logger: updateLog
            });
            await newWorker.load();
            await newWorker.loadLanguage("chi_sim");
            await newWorker.initialize("chi_sim");
            await newWorker.setParameters({
                tessedit_char_whitelist: '睾酮孕雌二醇促卵泡刺激生成素黄体垂泌乳1234567890./<>pnmolgIUdL'
            })
            setWorker(newWorker);
            setLoading(false);
        })();
        // eslint-disable-next-line
    }, [])
    const recognize = (f: File) => {
        (async () => {
            if (worker === null) {
                console.log("worker not loaded, bail out");
                return;
            }
            // @ts-ignore
            if (window.cv === null) {
                console.log("cv not loaded, bail out");
            }

            const inputImg = document.getElementById("inputImg") as HTMLImageElement;
            const outputCanvas = document.getElementById("outputCanvas") as HTMLCanvasElement;

            await loadImage(f, inputImg);
            run_preprocess(inputImg, outputCanvas);
            const {data} = await worker.recognize(outputCanvas);

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
            setLoading(false);
        })();
    };
    return (
        <div>
            <h1>Hello world!</h1>
            <p hidden={!loading}>Loading tesseract...</p>
            <Uploader disabled={loading} callback={recognize}/>
            <div>
                <button disabled={loading} onClick={_ => setDebug(true)}>Enable Debug</button>
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

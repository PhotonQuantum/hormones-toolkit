import {Uploader} from "./components/uploader";
import {ReactElement, useEffect, useState} from "react";
import {createWorker, Worker} from "tesseract.js";
import {imageDataFromFile} from "./utils/cv";
import {parseLine} from "./utils/parser";
import {preprocessor} from "./services/cv";

export const App = () => {
    const [output, setOutput] = useState<ReactElement[]>([]);
    const [progress, setProgress] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [tesseract, setTesseract] = useState<Worker | null>(null);
    const [debug, setDebug] = useState(false);
    const updateLog = (obj: any) => {
        if (obj.status === "recognizing text") {
            setProgress((obj.progress * 100).toFixed(2).toString() + "%")
        }
    };
    useEffect(() => {
        (async () => {
            await preprocessor.load();

            if (tesseract !== null) {
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
            setTesseract(newWorker);
            setLoading(false);
        })();
        // eslint-disable-next-line
    }, [])
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

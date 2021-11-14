import {Uploader} from "./components/uploader";
import {ReactElement, useEffect, useState} from "react";
import {createWorker, Worker} from "tesseract.js";
import {loadImage, run_preprocess} from "./utils/cv";
import {parseLine} from "./utils/parser";

export const App = () => {
  const [output, setOutput] = useState<ReactElement[]>([]);
  const [loading, setLoading] = useState<string>("");
  const [worker, setWorker] = useState<Worker|null>(null);
  const [debug, setDebug] = useState<boolean>(false);
  const updateLog = (obj: any) => {
    if (obj.status === "recognizing text") {
      setLoading((obj.progress * 100).toFixed(2).toString() + "%")
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
    })();
    return () => {
      (async () => {
        if (worker === null) {
          return;
        }
        await worker.terminate()
      })()
    };
    // eslint-disable-next-line
  }, [])
  const recognize = (f: File) => {
    (async () => {
      if (worker === null) {
        console.log("no worker found, bail out");
        return;
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
    })();
  };
  return (
      <div>
        <h1>Hello world!</h1>
        <Uploader callback={recognize}/>
        <div>
          <button onClick={_ => setDebug(true)}>Enable Debug</button>
        </div>
        <div>
          <h3>Progress</h3>
          <p>{loading}</p>
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

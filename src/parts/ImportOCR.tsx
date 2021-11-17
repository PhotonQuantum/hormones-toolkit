import {forwardRef, useEffect, useReducer, useRef, useState} from "react";
import {preprocessor} from "../services/cv";
import {createWorker, Worker} from "tesseract.js";
import {Alert, Box, Collapse, LinearProgress, Stack} from "@mui/material";
import {Uploader} from "../components/Uploader";
import {HormoneEntry, parseLine} from "../utils/parser";
import {imageDataFromFile} from "../utils/cv";

type ReadyState = {
    "opencv": boolean,
    "tesseract": boolean
}

const isAllReady = (state: ReadyState): boolean => state.opencv && state.tesseract;

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

type ImportOCRProps = { onComplete: (entries: HormoneEntry[]) => any };

export const ImportOCR = forwardRef(({onComplete}: ImportOCRProps, ref) => {
    const initialReadyState: ReadyState = {"opencv": false, "tesseract": false};
    const [tesseract, setTesseract] = useState<Worker | null>(null);
    const [processing, setProcessing] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const [ready, dispatchReady] = useReducer(readyReducer, initialReadyState);
    const [file, setFile] = useState<File | null>(null);
    const [fileErr, setFileErr] = useState<boolean>(false);
    let mounted = useRef(false);

    const updateLog = (obj: any) => {
        if (!mounted.current) {
            return;
        }
        if (obj.status === "recognizing text") {
            setProgress(obj.progress * 100)
        }
    };

    useEffect(() => {
        mounted.current = true;
        return () => {
            if (tesseract !== null) {
                // noinspection JSIgnoredPromiseFromCall
                tesseract.terminate()
            }
            mounted.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        (async () => {
            if (tesseract !== null) {
                dispatchReady({"type": "tesseract"});
                return;
            }
            const worker = await createTesseractWorker(updateLog);
            if (!mounted.current) {
                return;
            }
            setTesseract(worker);
            dispatchReady({"type": "tesseract"});
        })();
        // eslint-disable-next-line
    }, []);

    useEffect(() => {
        (async () => {
            await preprocessor.load();
            if (!mounted.current) {
                return;
            }
            dispatchReady({"type": "opencv"});
        })()
    }, []);

    useEffect(() => {
        setProcessing(file !== null);
    }, [file])

    useEffect(() => {
        if (!mounted.current) {
            return;
        }
        (async () => {
            if (file === null || tesseract === null || !isAllReady(ready)) {
                return;
            }

            const image = await imageDataFromFile(file);
            if (image === undefined) {
                setFile(null);
                setFileErr(true);
                return;
            }

            setFileErr(false);
            setProcessing(true);
            const preprocessed = await preprocessor.run(image);
            const outputCanvas = document.createElement("canvas");
            outputCanvas.height = preprocessed.height;
            outputCanvas.width = preprocessed.width;
            outputCanvas.getContext("2d")?.putImageData(preprocessed, 0, 0);

            const {data} = await tesseract.recognize(outputCanvas);

            const output = data.lines.flatMap((x) => {
                let res = parseLine(x.text);
                if (res.isOk()) {
                    return [res.unwrap()];
                } else {
                    console.log("boom", x.text);
                    return [];
                }
            });
            if (!mounted.current) {
                return;
            }
            setProcessing(false);
            onComplete(output);
        })();
        // eslint-disable-next-line
    }, [file, ready]);

    return (
        <Stack alignItems="center" justifyContent="center" ref={ref} sx={{width: "100%"}}>
            <Collapse in={fileErr} sx={{width: "100%"}}>
                <Alert variant="outlined" severity="error" sx={{mb: 2}}>This is not a valid image.</Alert>
            </Collapse>
            <Collapse in={!file}>
                <Uploader text="Select Photo" accept="image/*" onChange={setFile}/>
            </Collapse>
            <Collapse in={processing} sx={{width: "100%"}}>
                <Box sx={{padding: 2}}>
                    <LinearProgress variant={isAllReady(ready) ? "determinate" : "indeterminate"} value={progress}/>
                </Box>
            </Collapse>
        </Stack>
    )
});
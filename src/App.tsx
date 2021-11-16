import {useEffect, useMemo, useReducer, useState} from "react";
import {createWorker, Worker} from "tesseract.js";
import {imageDataFromFile} from "./utils/cv";
import {HormoneEntry, parseLine} from "./utils/parser";
import {preprocessor} from "./services/cv";
import {
    Alert,
    AppBar,
    Box,
    Container,
    createTheme,
    CssBaseline,
    LinearProgress,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    ThemeProvider,
    Toolbar,
    Typography,
    useMediaQuery
} from "@mui/material";
import {CollapseFade} from "./components/CollapseFade";
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import {Uploader} from "./components/Uploader";

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
    const [output, setOutput] = useState<HormoneEntry[]>([]);
    const [progress, setProgress] = useState<number>(0);
    const [ready, dispatchReady] = useReducer(readyReducer, initialReadyState);
    const [tesseract, setTesseract] = useState<Worker | null>(null);
    const [file, setFile] = useState<File | null>(null);

    const updateLog = (obj: any) => {
        if (obj.status === "recognizing text") {
            setProgress(obj.progress * 100)
        }
    };

    useEffect(() => {
        (async () => {
            if (tesseract !== null) {
                dispatchReady({"type": "tesseract"});
                return;
            }
            const worker = await createTesseractWorker(updateLog);
            setTesseract(worker);
            dispatchReady({"type": "tesseract"});
        })();
        // eslint-disable-next-line
    }, []);

    useEffect(() => {
        (async () => {
            await preprocessor.load();
            dispatchReady({"type": "opencv"});
        })()
    }, []);

    useEffect(() => {
        (async () => {
            if (file === null) {
                return;
            }
            if (tesseract === null) {
                console.log("worker not loaded, bail out");
                return;
            }

            const image = await imageDataFromFile(file);
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
                    return [res.unwrap()];
                } else {
                    console.log("boom", x.text);
                    return [];
                }
            });
            setOutput(output);
        })();
    }, [file, tesseract]);

    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode: prefersDarkMode ? 'dark' : 'light',
                },
            }),
        [prefersDarkMode],
    );
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline/>
            <AppBar position="relative">
                <Toolbar>
                    <Typography variant="h6">Hormones Toolkit</Typography>
                </Toolbar>
            </AppBar>
            <Box sx={{mt: 2, mb: 2}}>
                <Container maxWidth="md">
                    <CollapseFade in={!(ready.opencv)}>
                        <Alert severity="info" sx={{mb: 2}}>Loading opencv...</Alert>
                    </CollapseFade>
                    <CollapseFade in={!(ready.tesseract)}>
                        <Alert severity="info" sx={{mb: 2}}>Loading tesseract...</Alert>
                    </CollapseFade>
                    <Stack alignItems="center" justifyContent="center">
                        <Uploader disabled={!(ready.opencv && ready.tesseract)} onChange={setFile} sx={{mb: 2}}/>
                        <CollapseFade in={progress > 0 && progress < 100} sx={{width: "100%"}}>
                            <Paper sx={{mb: 2, padding: 4}}>
                                <LinearProgress variant="determinate" value={progress}/>
                            </Paper>
                        </CollapseFade>
                        <CollapseFade in={output.length > 0} sx={{width: "100%"}}>
                            <TableContainer component={Paper}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Substance</TableCell>
                                            <TableCell align="right">Quantity</TableCell>
                                            <TableCell align="right">Unit</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {output.map((entry) =>
                                            <TableRow key={entry.name}>
                                                <TableCell component="th" scope="row">{entry.name}</TableCell>
                                                <TableCell align="right">{entry.value.display()}</TableCell>
                                                <TableCell align="right">{entry.unit.display()}</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CollapseFade>
                        <canvas hidden={true} id="outputCanvas"/>
                    </Stack>
                </Container>
            </Box>
        </ThemeProvider>
    )
}

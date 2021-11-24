import {useMemo, useState} from "react";
import {PartialHormoneEntry} from "./utils/parser";
import {
    AppBar,
    Box,
    Button,
    Container,
    createTheme,
    CssBaseline,
    Dialog,
    DialogContent,
    DialogTitle,
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
import {ImportOCR} from "./parts/ImportOCR";

export const App = () => {
    const [result, setResult] = useState<PartialHormoneEntry[]>([]);
    const [openOCR, setOpenOCR] = useState<boolean>(false);

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
                    <Stack alignItems="center" justifyContent="center">
                        <Button variant="contained" sx={{mb: 2}} onClick={_ => setOpenOCR(true)}>Import by OCR</Button>
                        <Dialog open={openOCR} onClose={_ => setOpenOCR(false)} fullWidth={true} maxWidth="sm">
                            <DialogTitle>Import by OCR</DialogTitle>
                            <DialogContent>
                                <ImportOCR onComplete={({result}) => {
                                    setOpenOCR(false);
                                    setResult(result);
                                }}/>
                            </DialogContent>
                        </Dialog>
                        <CollapseFade in={result.length > 0} sx={{width: "100%"}}>
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
                                        {result.map((entry) =>
                                            <TableRow key={entry.name.unwrap_or("Unknown")}>
                                                <TableCell component="th" scope="row">{entry.name.unwrap_or("Unknown")}</TableCell>
                                                <TableCell align="right">{entry.value.display()}</TableCell>
                                                <TableCell align="right">{entry.unit.map(item=>item.display()).unwrap_or("Unknown")}</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CollapseFade>
                    </Stack>
                </Container>
            </Box>
        </ThemeProvider>
    )
}

import {Collapse, Fade, Theme} from "@mui/material";
import {SxProps} from "@mui/system";
import {ReactElement} from "react";

interface CollapseFadeProps {
    in: boolean,
    children: ReactElement<any, any>,
    sx?: SxProps<Theme>
}

export const CollapseFade = (props: CollapseFadeProps) => {
    return (
        <Collapse in={props.in} sx={props.sx}>
            <Fade in={props.in}>
                {props.children}
            </Fade>
        </Collapse>
    );
}
import {Collapse, Fade, Theme} from "@mui/material";
import {SxProps} from "@mui/system";
import {forwardRef, ReactElement} from "react";

interface CollapseFadeProps {
    in: boolean,
    children: ReactElement<any, any>,
    sx?: SxProps<Theme>
}

export const CollapseFade = forwardRef((props: CollapseFadeProps, ref) => {
    return (
        <Collapse in={props.in} sx={props.sx} ref={ref}>
            <Fade in={props.in}>
                {props.children}
            </Fade>
        </Collapse>
    );
})
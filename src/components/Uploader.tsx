import {Box, Button} from "@mui/material";
import {SxProps, Theme} from "@mui/system";
import {forwardRef} from "react";

type UploaderProps = { text: string, onChange: (f: File) => any, accept?: string, disabled?: boolean, sx?: SxProps<Theme> };

export const Uploader = forwardRef((prop: UploaderProps, ref) => {
    return (<Box sx={prop.sx} ref={ref}>
        <label htmlFor="uploader">
            <input hidden={true} accept={prop.accept} id="uploader" type="file" onChange={
                ev => {
                    // @ts-ignore
                    if (ev.target.files !== null) {
                        // @ts-ignore
                        prop.onChange(ev.target.files.item(0))
                    }
                }
            }/>
            <Button disabled={prop.disabled} variant="contained" component="span">{prop.text}</Button>
        </label>
    </Box>)
})
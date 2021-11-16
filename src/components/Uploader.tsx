import {Box, Button} from "@mui/material";
import {SxProps, Theme} from "@mui/system";

type UploaderProps = { onChange: (f: File) => any, disabled?: boolean, sx?: SxProps<Theme> };

export const Uploader = (prop: UploaderProps) => {
    return (<Box sx={prop.sx}>
        <label htmlFor="uploader">
            <input hidden={true} accept="image/*" id="uploader" type="file" onChange={
                ev => {
                    // @ts-ignore
                    if (ev.target.files !== null) {
                        // @ts-ignore
                        prop.onChange(ev.target.files.item(0))
                    }
                }
            }/>
            <Button disabled={prop.disabled} variant="contained" component="span">Select Photo</Button>
        </label>
    </Box>)
}

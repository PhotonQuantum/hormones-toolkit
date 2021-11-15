import {useState} from "react";

type UploaderProps = {callback: (f: File) => any, disabled?: boolean};

export const Uploader = (prop: UploaderProps) => {
    const [file, setFile] = useState<File | null>(null);
    return (<div>
        <input disabled={prop.disabled} type="file" accept="image/*" onChange={event => {
            if (event.target.files === null) {
                return;
            }
            setFile(event.target.files.item(0))
        }}/>
        <button disabled={prop.disabled} onClick={() => {
            if (file !== null) {
                prop.callback(file)
            }
        }}>Ok
        </button>
    </div>)
}

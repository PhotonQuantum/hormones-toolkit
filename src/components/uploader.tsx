import {useState} from "react";

export const Uploader = ({callback}: { callback: (f: File) => any }) => {
    const [file, setFile] = useState<File | null>(null);
    return (<div>
        <input type="file" accept="image/*" onChange={event => {
            if (event.target.files === null) {
                return;
            }
            setFile(event.target.files.item(0))
        }}/>
        <button onClick={() => {
            if (file !== null) {
                callback(file)
            }
        }}>Ok
        </button>
    </div>)
}

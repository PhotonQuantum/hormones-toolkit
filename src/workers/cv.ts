import cv, {Mat} from "opencv-ts";
import {MorphShapes, MorphTypes} from "opencv-ts/src/ImageProcessing/ImageFiltering";

const ensureMinHeight = (mat: Mat, expected_height: number) => {
    const {height, width} = mat.size();
    if (height < expected_height) {
        const scale_ratio = expected_height / height;
        cv.resize(mat, mat, new cv.Size(width * scale_ratio, height * scale_ratio), 0, 0, cv.INTER_LANCZOS4);
    }
}

const morphology = (mat: Mat, op: MorphTypes, kernel_shape: MorphShapes, size: number) => {
    const erode_kernel = cv.getStructuringElement(kernel_shape, new cv.Size(2 * size + 1, 2 * size + 1), new cv.Point(size, size));
    cv.morphologyEx(mat, mat, op, erode_kernel, new cv.Point(-1, -1), 1, cv.BORDER_DEFAULT, new cv.Scalar());
}

const runPreprocess = (mat: Mat) => {
    ensureMinHeight(mat, 2000);
    cv.cvtColor(mat, mat, cv.COLOR_BGR2GRAY);
    cv.adaptiveThreshold(mat, mat, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 41, 3);
    morphology(mat, cv.MORPH_ERODE, cv.MORPH_RECT, 0.5);
}

function imageDataFromMat(mat: Mat): ImageData {
    // converts the mat type to cv.CV_8U
    const img = new cv.Mat()
    const depth = mat.type() % 8
    const scale =
        depth <= cv.CV_8S ? 1.0 : depth <= cv.CV_32S ? 1.0 / 256.0 : 255.0
    const shift = depth === cv.CV_8S || depth === cv.CV_16S ? 128.0 : 0.0
    mat.convertTo(img, cv.CV_8U, scale, shift)

    // converts the img type to cv.CV_8UC4
    switch (img.type()) {
        case cv.CV_8UC1:
            cv.cvtColor(img, img, cv.COLOR_GRAY2RGBA)
            break
        case cv.CV_8UC3:
            cv.cvtColor(img, img, cv.COLOR_RGB2RGBA)
            break
        case cv.CV_8UC4:
            break
        default:
            throw new Error(
                'Bad number of channels (Source image must have 1, 3 or 4 channels)'
            )
    }
    const clampedArray = new ImageData(
        new Uint8ClampedArray(img.data),
        img.cols,
        img.rows
    )
    img.delete()
    return clampedArray
}

function ensureCv() {
    return new Promise<void>((resolve, _) => {
        if (cv.Mat) {
            resolve();
            return;
        }

        const interval = setInterval(() => {
            if (cv.Mat) {
                clearInterval(interval);
                resolve();
                return;
            }
        }, 100);
    })
}

export interface WorkerEvent {
    job: string,
    type: "load" | "run",
    data?: ImageData
}

export interface WorkerOutput {
    job: string,
    data: NonNullable<any>
}

onmessage = function (e: MessageEvent<WorkerEvent>) {
    let ev = e.data;
    switch (ev.type) {
        case 'load': {
            // Import Webassembly script
            ensureCv().then(_ => {
                postMessage({job: ev.job, data: true});
            });
            break;
        }
        case 'run': {
            if (!ev.data) {
                break;
            }
            let mat = cv.matFromImageData(ev.data);
            runPreprocess(mat);
            let image = imageDataFromMat(mat);
            mat.delete();
            postMessage({job: ev.job, data: image});
            break;
        }
        default:
            break;
    }
}
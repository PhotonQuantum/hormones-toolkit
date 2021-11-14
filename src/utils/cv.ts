import cv, {Mat} from "opencv-ts";
import {MorphShapes, MorphTypes} from "opencv-ts/src/ImageProcessing/ImageFiltering";

export const loadImage = (f: File, img: HTMLImageElement) => {
    return new Promise((resolve, _reject) => {
        img.src = URL.createObjectURL(f);
        img.onload = resolve
    })
}

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

export const run_preprocess = (input: string | HTMLImageElement | HTMLCanvasElement, output: HTMLCanvasElement) => {
    const mat = cv.imread(input);
    ensureMinHeight(mat, 2000);
    cv.cvtColor(mat, mat, cv.COLOR_BGR2GRAY);
    cv.adaptiveThreshold(mat, mat, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 41, 3);
    morphology(mat, cv.MORPH_ERODE, cv.MORPH_RECT, 0.5);
    cv.imshow(output, mat);
    mat.delete();
}

export const loadImage = (f: File, img: HTMLImageElement) => {
    return new Promise<void>((resolve, _reject) => {
        img.src = URL.createObjectURL(f);
        img.onload = _ => {
            URL.revokeObjectURL(img.src);
            resolve();
        }
    })
}

export const imageDataFromFile = async (f: File) => {
    let image = new Image();
    await loadImage(f, image);

    let canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;

    let ctx = canvas.getContext("2d");
    if (ctx === null) {
        return;
    }

    ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, image.width, image.height);
};
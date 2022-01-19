import axios from "axios";
import { asyncPool } from "./utils";

const app = document.getElementById("app") as HTMLDivElement;

const inputFileEl = document.createElement("input");
inputFileEl.setAttribute("type", "file");
app.appendChild(inputFileEl);

const buttonEl = document.createElement("button");
buttonEl.textContent = "开始上传"
app.appendChild(buttonEl);


let currentFile: File | undefined;

const instance = axios.create({
    baseURL: "http://localhost:3000",
    timeout: 30000,
});

inputFileEl.addEventListener("change", (e) => {
    const files = (e.target as HTMLInputElement).files;
    const [file] = Array.from(files ?? []);

    currentFile = file

    console.log(file);
})

type FileChunkType = { hash: string, chunk: Blob };
buttonEl.addEventListener("click", async () => {
    if (!currentFile) {
        return alert("未选中文件！");
    }

    // let size: number = 1024 * 50  //50KB 切片大小
    const size: number = 1 << 20  // 1MB 切片大小

    let fileChunks: FileChunkType[] = []
    let index = 0 //切片序号

    for (let cur = 0; cur < currentFile.size; cur += size) {
        fileChunks.push({
            hash: String(index++),
            chunk: currentFile.slice(cur, cur + size)
        })
    }

    const start = performance.now();

    await asyncPool<FileChunkType>(3, fileChunks, ({ chunk, hash }) => {
        const formData = new FormData();
        const fileName = currentFile!.name

        formData.append('filename', fileName);
        formData.append('chunk', chunk, `${fileName}*-*${hash}`);

        return instance.post("/upload", formData);
    });

    await instance.post("/merge", {
        fileName: currentFile.name,
        size: currentFile.size,
    });

    console.log(((performance.now() - start) / 1000).toFixed(2));

    console.log('上传完成');
});

export { };
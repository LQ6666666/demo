import path from "path";
import fs from "fs";

import Koa from "koa";
import KoaRouter from "@koa/router";
import multer from "@koa/multer";
import cors from "@koa/cors";
import serve from "koa-static";
import bodyParser from "koa-bodyparser";

const STATIC_SERVE = path.resolve(__dirname, '../build')
// 上传文件最终路径
const STATIC_FILES = path.resolve(__dirname, './static/files')
// 上传文件临时路径
const STATIC_TEMPORARY = path.resolve(__dirname, './static/temporary');

const storage = multer.diskStorage({
    async destination(req, file, cb) {
        let [fileName] = file.originalname.split("*-*");
        const fileDir = path.join(STATIC_TEMPORARY, fileName);

        const isExist = await fs.promises.access(fileDir, fs.constants.F_OK)
            .then(() => true)
            .catch(() => false);

        if (!isExist) {
            console.log(`创建目录：${fileDir}`);
            await fs.promises.mkdir(fileDir).catch(() => console.log(`目录已存在：${fileDir}`));
        }

        cb(null, fileDir);
    },
    async filename(req, file, cb) {
        let [, chunkIndex] = file.originalname.split("*-*");

        cb(null, `${chunkIndex}`);
    },
});

const multerUpload = multer({ storage });

const app = new Koa();
const router = new KoaRouter();

router.get("/", async (ctx) => {
    ctx.body = "文件上传切片案例";
});

router.post("/upload", multerUpload.single("chunk"), async (ctx, next) => {
    ctx.body = "done";
});

router.post("/merge", async (ctx, next) => {
    const { fileName, size } = ctx.request.body as { fileName: string; size: number };
    const filePath = path.join(STATIC_TEMPORARY, fileName);
    const targetPath = path.join(STATIC_FILES, fileName);
    const chunks = await fs.promises.readdir(filePath).then(res => res.sort((a, b) => +a - +b));

    await fs.promises.rm(targetPath).catch(() => false);

    const writeStream = fs.createWriteStream(targetPath);

    for (const chunk of chunks) {
        const chunkPath = path.join(filePath, chunk);
        const data = await fs.promises.readFile(chunkPath);
        writeStream.write(data);
        await fs.promises.rm(chunkPath);
    }

    writeStream.end();
    writeStream.close();

    await fs.promises.rmdir(filePath).catch(() => false);

    if ((await fs.promises.stat(targetPath)).size === size) {
        ctx.body = fileName;
    } else {
        ctx.response.status = 400;
        ctx.body = "文件合并错误！";
    }
});

app.use(cors());
app.use(bodyParser());
app.use(serve(STATIC_FILES));
app.use(router.routes());
app.use(router.allowedMethods());

app.listen(3000, () => {
    console.log("服务器启动了");
});
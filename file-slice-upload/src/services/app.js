import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import Koa from "koa";
import KoaRouter from "@koa/router";
import multer from "@koa/multer";
import serve from "koa-static";
import bodyParser from "koa-bodyparser";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// 静态文件服务器
const STATIC_SERVE = path.resolve(__dirname, "../../dist");

const STATIC_DIR = path.resolve(__dirname, "static");
// 上传文件最终路径
const STATIC_FILES = path.resolve(STATIC_DIR, "files");
// 上传文件临时路径
const STATIC_TEMPORARY = path.resolve(STATIC_DIR, "temporary");

try {
  fs.mkdirSync(STATIC_DIR);
} catch (error) {}

try {
  fs.mkdirSync(STATIC_FILES);
} catch (error) {}

try {
  fs.mkdirSync(STATIC_TEMPORARY);
} catch (error) {}

const storage = multer.diskStorage({
  async destination(req, file, cb) {
    const [fileName] = file.originalname.split("-");
    const fileDir = path.join(STATIC_TEMPORARY, fileName);

    try {
      const statObj = await fs.promises.stat(fileDir);

      if (!statObj.isDirectory()) {
        throw new Error("不是文件夹");
      }
    } catch (error) {
      await fs.promises.mkdir(fileDir).catch(e => {
        if (e?.code === "EEXIST") return;
        console.log(e);
      });
    }

    cb(null, fileDir);
  },
  async filename(req, file, cb) {
    const [, chunkIndex] = file.originalname.split("-");
    cb(null, chunkIndex);
  }
});

const multerUpload = multer({ storage });

const app = new Koa();
const router = new KoaRouter();

router.get("/", async ctx => {
  ctx.body = "文件上传切片";
});

router.post("/upload", multerUpload.single("chunk"), async (ctx, next) => {
  ctx.body = "done";
});

// 秒传 or 返回已上传的切片
// 这里应该存在数据库
const fileHashMap = new Map();
router.get("/verify", async (ctx, next) => {
  const { fileHash } = ctx.query;

  if (!fileHash) {
    ctx.status = 400;
    ctx.body = "请传入 fileHash";
    return;
  }

  const filePath = fileHashMap.get(fileHash);
  if (filePath) {
    ctx.body = { isExist: true, filePath };
    return;
  }

  const uploadedList = await fs.promises
    .readdir(path.join(STATIC_TEMPORARY, fileHash))
    .then(async fileNameList => {
      const statObjList = await Promise.all(
        fileNameList.map(name => fs.promises.stat(path.join(STATIC_TEMPORARY, fileHash, name)))
      );
      return statObjList.map((statObj, index) => ({
        name: fileNameList[index],
        size: statObj.size
      }));
    })
    .catch(() => []);

  ctx.body = { isExist: false, uploadedList };
});

// 写入文件流
const pipeStream = (path, writeStream) =>
  new Promise(resolve => {
    const readStream = fs.createReadStream(path);
    readStream.on("end", () => {
      fs.promises.unlink(path);
      resolve(void 0);
    });
    readStream.pipe(writeStream);
  });

router.post("/merge", async (ctx, next) => {
  const { fileName, size, chunkSize, fileHash } = ctx.request.body;

  if (!fileName || !size || !chunkSize || !fileHash) {
    ctx.response.status = 400;
    ctx.body = "fileName size  chunkSize fileHash 不能为空";
    return;
  }

  const filePath = path.join(STATIC_TEMPORARY, fileHash);
  const targetPath = path.join(STATIC_FILES, fileName);

  const chunks = await fs.promises.readdir(filePath).then(res => res.sort((a, b) => +a - +b));

  await fs.promises.rm(targetPath).catch(() => {});

  // 并发写入文件
  await Promise.all(
    chunks.map((chunkPath, index) =>
      pipeStream(
        path.resolve(filePath, chunkPath),
        fs.createWriteStream(targetPath, {
          start: index * chunkSize
        })
      )
    )
  );

  await fs.promises.rmdir(filePath).catch(() => {});

  if ((await fs.promises.stat(targetPath)).size === size) {
    fileHashMap.set(fileHash, fileName);
    ctx.body = fileName;
  } else {
    ctx.response.status = 400;
    ctx.body = "文件合并错误！";
  }
});

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    ctx.status = error.status || 500;
    ctx.body = error.message;
  }
});
app.use(bodyParser());
app.use(serve(STATIC_SERVE));
app.use(router.routes());
app.use(router.allowedMethods());

app.listen(3000, () => {
  console.log("服务器启动了");
});

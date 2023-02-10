import { UploadProps, UploadFile, Space } from "antd";

import { useState } from "react";
import { Progress, Upload, Button, message } from "antd";
import axios from "axios";

import { calculateFileHash, createFileChunk, asyncPool } from "@/utils";
import { CHUNK_SIZE } from "@/constants";

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL
});

export default function App() {
  const [uploading, setUploading] = useState(false);
  const [bigFile, setBigFile] = useState<{ file: UploadFile; hash: undefined | string } | null>(
    null
  );
  const [hashProgress, setHashProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [controllerList, setControllerList] = useState<AbortController[]>([]);
  const [isAbort, setIsAbort] = useState(false);

  const props: UploadProps = {
    showUploadList: false,
    beforeUpload: file => (
      setBigFile({
        file,
        hash: undefined
      }),
      false
    )
  };

  const handleUpload = async () => {
    if (bigFile === null) return;

    const file = bigFile.file as unknown as File;
    const fileChunkBlobs = createFileChunk(file);

    const fileHash =
      bigFile.hash ||
      (await calculateFileHash(fileChunkBlobs, progress => setHashProgress(+progress.toFixed(2))));

    if (!bigFile.hash) {
      setBigFile({ ...bigFile, hash: fileHash });
    } else {
      setHashProgress(100);
    }

    let fileChunks = fileChunkBlobs.map((chunk, index) => ({
      chunk,
      chunkIndex: `${fileHash}-${index}`
    }));

    setUploading(true);
    try {
      const { isExist, uploadedList } = await verifyUpload(fileHash);

      if (isExist) {
        setUploadProgress(100);
        setUploading(false);
        message.success("上传成功");
        return;
      }

      // 服务器已经存在的 chunk 不在上传
      const uploadedChunkIndexMap = new Map<string, number>();
      uploadedList!.forEach(({ name, size }) => uploadedChunkIndexMap.set(name, size));
      fileChunks = fileChunks.filter(({ chunk, chunkIndex }) => {
        const size = uploadedChunkIndexMap.get(chunkIndex.split("-")[1]);
        if (size === undefined) return true;
        // 大小也要一致
        return size !== chunk.size;
      });

      const chunkUploadProgressList = new Array<number>(fileChunks.length + 1).fill(0);
      const controllerList = Array.from({ length: fileChunks.length }, () => new AbortController());
      setControllerList(controllerList);

      await uploadChunks(
        fileChunks,
        file,
        fileHash,
        (progress, index) => {
          // 计算上传进度条
          if (progress !== chunkUploadProgressList[index]) {
            chunkUploadProgressList[index] = progress;
            setUploadProgress(uploadPercentage(chunkUploadProgressList));
          }
        },
        controllerList
      );

      await mergeChunks(file, fileHash, CHUNK_SIZE).then(() => {
        chunkUploadProgressList[chunkUploadProgressList.length - 1] = 100;
        setUploadProgress(uploadPercentage(chunkUploadProgressList));
      });

      message.success("上传成功");
    } catch (error) {
      console.error(error);
    }
    setUploading(false);
    setIsAbort(false);
  };

  const verifyUpload = async (fileHash: string) => {
    const { data } = await instance.get<{
      isExist: boolean;
      filePath: string | undefined;
      uploadedList: { name: string; size: number }[] | undefined;
    }>("/verify", {
      params: { fileHash }
    });
    return data;
  };

  const uploadPercentage = (progressList: number[]) => {
    return Math.floor(
      (progressList.reduce((prev, cur) => prev + cur) / (progressList.length * 100)) * 100
    );
  };

  const uploadChunks = (
    chunks: { chunk: Blob; chunkIndex: string }[],
    file: File,
    fileHash: string,
    onProgress: (progress: number, index: number) => void,
    controllers: AbortController[]
  ) => {
    // 异步并发控制
    const promises = asyncPool(
      5,
      chunks.map(({ chunk, chunkIndex }, index) => {
        const formData = new FormData();
        formData.append("chunk", chunk, chunkIndex);
        formData.append("filename", file.name);

        return {
          formData,
          // 用于暂停
          controller: controllers[index]
        };
      }),
      ({ formData, controller }, index) => {
        if (isAbort) {
          return Promise.reject(new Error("请求暂停"));
        }

        const promise = instance.post("/upload", formData, {
          onUploadProgress: ({ loaded, total }) => {
            const progress = total ? Math.floor((loaded / total) * 100) : 0;
            onProgress(progress, index);
          },
          signal: controller.signal
        });
        return promise;
      }
    );

    // 并发请求
    return promises;
  };

  const mergeChunks = (file: File, fileHash: string, chunkSize: number) => {
    return instance.post("/merge", {
      fileName: file.name,
      size: file.size,
      fileHash,
      chunkSize
    });
  };

  const handleStop = () => {
    setIsAbort(true);
    controllerList.forEach(c => c.abort());
    setControllerList([]);
  };

  const handleClear = () => {
    setIsAbort(false);
    setControllerList([]);
    setHashProgress(0);
    setUploadProgress(0);
  };

  return (
    <div style={{ width: "50vw", margin: "0 auto" }}>
      <Space>
        <Upload {...props}>
          <Button loading={uploading} disabled={isAbort}>
            选择文件
          </Button>
        </Upload>

        <Button onClick={handleUpload} type="primary" disabled={!bigFile} loading={uploading}>
          {uploading ? "正在上传中" : "开始上传"}
        </Button>

        <Button onClick={handleStop} disabled={isAbort || !uploading}>
          暂停
        </Button>

        <Button onClick={handleClear}>清除</Button>
      </Space>

      <div style={{ margin: "10px 0" }}>
        文件 hash 计算进度
        <Progress percent={hashProgress} />
      </div>

      <div>
        上传进度
        <Progress percent={uploadProgress}></Progress>
      </div>
    </div>
  );
}

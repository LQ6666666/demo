import { CHUNK_SIZE } from "@/constants";

export { asyncPool } from "./async-pool";

export const createFileChunk = (file: File, chunkSize = CHUNK_SIZE) => {
  const fileChunks: Blob[] = [];

  for (let cur = 0; cur < file.size; cur += chunkSize) {
    fileChunks.push(file.slice(cur, cur + CHUNK_SIZE));
  }

  return fileChunks;
};

export const calculateFileHash = (
  fileChunks: Blob[],
  onProgress?: (percentage: number) => void
) => {
  return new Promise<string>((resolve, reject) => {
    const worker = new Worker(new URL("@/assets/web-worker/hash.js", import.meta.url), {
      type: "module"
    });

    worker.postMessage({ fileChunks });

    worker.onmessage = e => {
      const { hash, percentage } = e.data as { hash: string | undefined; percentage: number };
      if (hash) {
        onProgress?.(100);
        resolve(hash);
        worker.terminate();
      } else {
        onProgress?.(percentage);
      }
    };

    worker.onerror = e => reject(e);
  });
};

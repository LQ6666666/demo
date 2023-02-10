import SparkMD5 from "spark-md5";

// 生成文件 hash
self.onmessage = e => {
  const { fileChunks } = e.data;
  const spark = new SparkMD5.ArrayBuffer();
  let percentage = 0;
  let count = 0;

  const loadNext = index => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(fileChunks[index]);

    reader.onload = e => {
      count++;
      spark.append(e.target.result);
      if (count === fileChunks.length) {
        self.postMessage({
          percentage: 100,
          hash: spark.end()
        });
        self.close();
      } else {
        percentage += 100 / fileChunks.length;
        self.postMessage({ percentage });
        loadNext(count);
      }
    };
  };

  loadNext(0);
};

function loader(source) {
  console.log("logger1-loader");
  return source + "\n";
}

module.exports = loader;

function loader(source) {
  console.log("logger2-loader");
  return source + "\n";
}

module.exports = loader;

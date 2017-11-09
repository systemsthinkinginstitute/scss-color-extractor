const fs = require("fs");
const promisify = require("es6-promisify");

const readFile = promisify(fs.readFile);
const readDir = promisify(fs.readdir);
const writeFile = promisify(fs.writeFile);

async function isDir(path) {
  const stats = await promisify(fs.stat)(path);
  return stats.isDirectory();
}

module.exports = { readFile, writeFile, readDir, isDir };

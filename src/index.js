const { parseStylesheet } = require("./parse");

const fs = require("./fs-promise");
const opts = require("yargs").argv;

const prettyPrint = obj => console.log(JSON.stringify(obj, null, 2));

async function readFile(filename) {
  const data = await fs.readFile(filename, "utf8");
  const parsed = parseStylesheet(data);
  return parsed.map(d => Object.assign({ filename }, d));
}

const scss = /.\.scss$/;

async function readRecursively(path) {
  const paths = await fs.readDir(path);
  let data = [];
  for (let idx in paths) {
    const child = path + paths[idx];
    try {
      const isDir = await fs.isDir(child);
      if (isDir) {
        const newData = await readRecursively(child + "/");
        data = data.concat(newData);
      } else if (scss.test(child)) {
        const newData = await readFile(child);
        data = data.concat(newData);
      }
    } catch (e) {
      console.log(`While reading ${child}`, e);
    }
  }
  return data;
}

async function main(path) {
  const isDir = await fs.isDir(path);
  let output;
  if (isDir) {
    if (!/.\/$/.test(path)) path = path + "/";
    output = await readRecursively(path);
  } else if (scss.test(path)) {
    output = await readFile(path);
  } else {
    throw new Error("Sorry, I couldn't read that file.");
  }

  const outputText = output
    .map(
      d =>
        `At ${d.filename}:${d.line}:
    ${d.rule}`
    )
    .join("\n");
  if (opts.out) {
    await fs.writeFile(opts.out, outputText, "utf8");
  } else {
    console.log(outputText);
  }
}

main(opts._[0]);

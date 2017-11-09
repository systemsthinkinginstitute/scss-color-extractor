const { parse, stringify } = require("scss-parser");
const createQueryWrapper = require("query-ast");
const {
  COLOR_FUNCTION_VALUES,
  COLOR_IDENTIFIER_VALUES,
  CSS_COLOR_LITERALS
} = require("./constants");
const fs = require("./fs-promise");
const opts = require("yargs").argv;

const prettyPrint = obj => console.log(JSON.stringify(obj, null, 2));

const parseStylesheet = stylesheet => {
  const $ = createQueryWrapper(parse(stylesheet));
  
  const extractIdentifier = declaration => {
    const identifier = declaration.find("identifier");
    if (identifier && identifier.first()) {
      return identifier.first().value();
    } else {
      return null;
    }
  };
  
  const extractColorHex = value => {
    return value.find("color_hex");
  };
  
  const extractColorFunction = value => {
    return value.find("function").filter(fn => {
      const fnIdentifier = $(fn).find("identifier");
      if (fnIdentifier && fnIdentifier.first()) {
        return COLOR_FUNCTION_VALUES.includes(fnIdentifier.first().value());
      } else {
        return false;
      }
    });
  };
  
  const extractColorLiteral = value => {
    return value.find("identifier").filter(id => {
      return CSS_COLOR_LITERALS.includes(
        $(id)
        .value()
        .toLowerCase()
      );
    });
  };
  
  const extractColorValues = declaration => {
    const values = declaration.find("value");
    return extractColorHex(values)
    .concat(extractColorFunction(values))
    .concat(extractColorLiteral(values));
  };
  
  const colorDeclarations = $("declaration").filter(node => {
    return COLOR_IDENTIFIER_VALUES.includes(extractIdentifier($(node)));
  });
  
  return colorDeclarations
  .filter(declaration => extractColorValues($(declaration)).length())
  .map(d => ({
    rule: stringify($(d).get(0)),
    line: d.node.start.line
  }));
};

// this is a really awful hack that needs to be taken care of soon
const tryParsingTwice = stylesheet => {
  try {
    return parseStylesheet(stylesheet);
  } catch (e) {
    if (e.message.includes('Expecting punctuation: "}"')) {
      return parseStylesheet(stylesheet + "}");
    } else {
      throw e;
    }
  }
};

async function readFile(filename) {
  const data = await fs.readFile(filename, "utf8");
  const parsed = tryParsingTwice(data);
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
    if (!/.\/$/.test(path))
      path = path + "/";
    output = await readRecursively(path);
  } else if (scss.test(path)) {
    output = await readFile(path);
  } else {
    throw new Error("Sorry, I couldn't read that file.");
  }

  const outputText = output.map(d => (
    `At ${d.filename}:${d.line}:
    ${d.rule}`
  )).join('\n');
  if (opts.out) {
    await fs.writeFile(opts.out, outputText, "utf8");
  } else {
    console.log(outputText);
  }
}

main(opts._[0]);
const gonzales = require("gonzales-pe");
const {
  COLOR_FUNCTION_VALUES,
  COLOR_IDENTIFIER_VALUES,
  CSS_COLOR_LITERALS
} = require("./constants");

const parseStylesheet = stylesheet => {
  const parseTree = gonzales.parse(stylesheet, { syntax: "scss" });

  let flaggedColorDeclarations = [];

  const isColorDeclaration = declaration => {
    let wellIsIt = false;

    declaration.traverseByType("property", prop => {
      prop.traverseByType("ident", ident => {
        wellIsIt = wellIsIt || COLOR_IDENTIFIER_VALUES.includes(ident.content);
      });
    });

    return wellIsIt;
  };

  const extractColorHex = value => {
    let hexes = [];
    value.traverseByType("color", n => {
      hexes.push(n);
    });
    return hexes;
  };

  const extractColorFunction = value => {
    let fns = [];
    value.traverseByType("function", fn => {
      if (fn.first() && COLOR_FUNCTION_VALUES.includes(fn.first().content))
        fns.push(fn);
    });
    return fns;
  };

  const extractColorLiteral = value => {
    let lits = [];
    value.traverseByType("ident", (ident, _, parent) => {
      if (
        parent.type !== "variable" &&
        CSS_COLOR_LITERALS.includes(ident.content)
      ) {
        lits.push(ident);
      }
    });
    return lits;
  };

  const extractColors = value => {
    return extractColorHex(value)
      .concat(extractColorFunction(value))
      .concat(extractColorLiteral(value));
  };

  const extractColorValues = declaration => {
    let literals = [];
    declaration.traverseByType("value", val => {
      literals = literals.concat(extractColors(val));
    });
    return literals;
  };

  const extractInfo = node => ({
    rule: node.toString() + ";",
    line: node.start.line
  });

  parseTree.traverseByType("declaration", dec => {
    if (isColorDeclaration(dec) && extractColorValues(dec).length > 0) {
      flaggedColorDeclarations.push(extractInfo(dec));
    }
  });

  return flaggedColorDeclarations;
};

module.exports = { parseStylesheet };

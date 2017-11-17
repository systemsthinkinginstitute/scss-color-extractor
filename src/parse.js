const gonzales = require('gonzales-pe');
const {
  COLOR_FUNCTION_VALUES,
  COLOR_IDENTIFIER_VALUES,
  CSS_COLOR_LITERALS
} = require("./constants");

const parseStylesheet = stylesheet => {
  const parseTree = gonzales.parse(stylesheet);

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
    return value.find("identifier").filter(id =>
      CSS_COLOR_LITERALS.includes(
        $(id)
          .value()
          .toLowerCase()
      )
    );
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

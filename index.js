const { parse, stringify } = require('scss-parser');
const createQueryWrapper = require('query-ast');
const fs = require('fs');

const COLOR_IDENTIFIER_VALUES = [
  "color",
  "background",
  "background-color",
  "background-image",
  "border",
  "border-top",
  "border-right",
  "border-bottom",
  "border-left",
  "border-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline",
  "outline-color",
  "text-shadow",
  "box-shadow"
];

const COLOR_FUNCTION_VALUES = [
  "rgb",
  "rgba",
  "hsl",
  "hsla"
];

const CSS_COLOR_NAMES_CAP = ["AliceBlue", "AntiqueWhite", "Aqua", "Aquamarine", "Azure", "Beige", "Bisque", "Black", "BlanchedAlmond", "Blue", "BlueViolet", "Brown", "BurlyWood", "CadetBlue", "Chartreuse", "Chocolate", "Coral", "CornflowerBlue", "Cornsilk", "Crimson", "Cyan", "DarkBlue", "DarkCyan", "DarkGoldenRod", "DarkGray", "DarkGrey", "DarkGreen", "DarkKhaki", "DarkMagenta", "DarkOliveGreen", "Darkorange", "DarkOrchid", "DarkRed", "DarkSalmon", "DarkSeaGreen", "DarkSlateBlue", "DarkSlateGray", "DarkSlateGrey", "DarkTurquoise", "DarkViolet", "DeepPink", "DeepSkyBlue", "DimGray", "DimGrey", "DodgerBlue", "FireBrick", "FloralWhite", "ForestGreen", "Fuchsia", "Gainsboro", "GhostWhite", "Gold", "GoldenRod", "Gray", "Grey", "Green", "GreenYellow", "HoneyDew", "HotPink", "IndianRed", "Indigo", "Ivory", "Khaki", "Lavender", "LavenderBlush", "LawnGreen", "LemonChiffon", "LightBlue", "LightCoral", "LightCyan", "LightGoldenRodYellow", "LightGray", "LightGrey", "LightGreen", "LightPink", "LightSalmon", "LightSeaGreen", "LightSkyBlue", "LightSlateGray", "LightSlateGrey", "LightSteelBlue", "LightYellow", "Lime", "LimeGreen", "Linen", "Magenta", "Maroon", "MediumAquaMarine", "MediumBlue", "MediumOrchid", "MediumPurple", "MediumSeaGreen", "MediumSlateBlue", "MediumSpringGreen", "MediumTurquoise", "MediumVioletRed", "MidnightBlue", "MintCream", "MistyRose", "Moccasin", "NavajoWhite", "Navy", "OldLace", "Olive", "OliveDrab", "Orange", "OrangeRed", "Orchid", "PaleGoldenRod", "PaleGreen", "PaleTurquoise", "PaleVioletRed", "PapayaWhip", "PeachPuff", "Peru", "Pink", "Plum", "PowderBlue", "Purple", "Red", "RosyBrown", "RoyalBlue", "SaddleBrown", "Salmon", "SandyBrown", "SeaGreen", "SeaShell", "Sienna", "Silver", "SkyBlue", "SlateBlue", "SlateGray", "SlateGrey", "Snow", "SpringGreen", "SteelBlue", "Tan", "Teal", "Thistle", "Tomato", "Turquoise", "Violet", "Wheat", "White", "WhiteSmoke", "Yellow", "YellowGreen"];

const CSS_COLOR_LITERALS = CSS_COLOR_NAMES_CAP.map(x => x.toLowerCase());

const DUMMY_STYLESHEET = `
node {
  .relationship {
    h5 {
      color: rgba(0, 0, 0, 0.6);
      font-size: 14px;
      font-weight: 500;
      margin-top: -5px;
    }

    .backdrop {
      padding: 10px 3px 5px 5px;
    }

    &.container {
      transform: translate(-10px, -8px);
    }

    .menu-tool {
      top: 7px;
    }

    .dot {
      height: 10px;
      top: 4px;
      width: 10px;
      &.has-children {
        cursor: pointer;
        font-size: 10px;
        height: 12px;
        left: -8px;
        text-align: center;
        top: 3px;
        width: 12px;

        &.fa-caret-up {
          line-height: 12px;
        }

        &.fa-caret-down {
          line-height: 14px;
        }
      }
    }

    .child {
      .relationship-tool {
        left: -1px;
      }
    }

    .relationship-tool {
      left: -2px;
    }

    .child > .backdrop > .row > .dot {
      top: 2px;
    }
  }

  .no-pointer-events {
    pointer-events: none;
  }
  .drag-subject {
    pointer-events: none;
    z-index: 10000;
  }
  .drag-subject.layout-freehand {
    pointer-events: none;
    z-index: 0;
  }
  .backing node-collapsed-tag {
    visibility: hidden;
  }

  .length-warning {
    color: $orange;
    display: none;
    font-size: 12px;
    font-weight: bold;

    &.visible {
      display: block;
      font-size: 12px;
      margin-top: 1px;
    }
  }
}`;

const prettyPrint = obj => console.log(JSON.stringify(obj, null, 2));

const parseStylesheet = (filename, stylesheet) => {
  const $ = createQueryWrapper(parse(stylesheet));
  
  const extractIdentifier = declaration => {
    const identifier = declaration.find('identifier');
    if (identifier && identifier.first()) {
      return identifier.first().value();
    } else {
      return null;
    }
  }

  const extractColorHex = value => {
    return value.find("color_hex");
  };

  const extractColorFunction = value => {
    return value.find("function").filter(fn => {
      const fnIdentifier = $(fn).find('identifier');
      if (fnIdentifier && fnIdentifier.first()) {
        return COLOR_FUNCTION_VALUES.includes(fnIdentifier.first().value());
      } else {
        return false;
      }
    });
  }

  const extractColorLiteral = value => {
    return value.find("identifier").filter(id => {
      return CSS_COLOR_LITERALS.includes($(id).value().toLowerCase());
    })
  }

  const extractColorValues = declaration => {
    const values = declaration.find('value');
    return extractColorHex(values)
            .concat(extractColorFunction(values))
            .concat(extractColorLiteral(values));
  }

  const colorDeclarations = $('declaration').filter(node => {
    return COLOR_IDENTIFIER_VALUES.includes(extractIdentifier($(node)));
  });

  return colorDeclarations.filter(declaration => (
    extractColorValues($(declaration)).length()
  )).map(d => (
    `${stringify($(d).get(0))} in ${filename}@${d.node.start.line}:${d.node.start.column}`
  ));
}

fs.readFile('test.scss', 'utf8', (err, data) => prettyPrint(parseStylesheet('test.scss', data)));
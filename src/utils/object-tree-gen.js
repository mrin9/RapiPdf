/* eslint-disable no-unused-vars */
const indentGuideLayout = {
  hLineWidth(i, node) {
    // return (i === 0 || i === 1 || i === node.table.body.length) ? 0 : 0.5;
    return 0;
  },
  hLineColor(i, node) {
    return (i === 0 || i === node.table.body.length) ? 'black' : 'lightgray';
  },
  vLineWidth(i, node) {
    return (i === 0 && node.table.body.length > 3) ? 1 : 0;
  },
  vLineColor(i, node) { return '#F9EBEA'; },
  paddingTop() { return 0; },
  paddingBottom() { return 0; },
};

const noBorderLayout = {
  hLineWidth(i, node) { return 0; },
  vLineWidth(i, node) { return 0; },
  paddingTop() { return 0; },
  paddingBottom() { return 0; },
};

/* eslint-enable no-unused-vars */

/* Generates an object containing type and constraint info */
export function getTypeInfo(schema) {
  if (!schema) {
    return;
  }
  const info = {
    type: schema.$ref
      ? '{recursive}'
      : schema.enum
        ? 'enum'
        : schema.format
          ? schema.format
          : schema.type,
    format: schema.format ? schema.format : '',
    pattern: (schema.pattern && !schema.enum) ? schema.pattern : '',
    readOrWriteOnly: schema.readOnly
      ? 'read-only'
      : schema.writeOnly
        ? 'write-only'
        : '',
    deprecated: schema.deprecated ? 'deprecated' : '',
    default: schema.default === 0 ? '0' : (schema.default ? schema.default : ''),
    description: schema.description ? schema.description : '',
    allowedValues: '',
    constrain: '',
    arrayType: '',
    typeInfoText: '',
  };
  if (info.type === '{recursive}') {
    info.description = schema.$ref.substring(schema.$ref.lastIndexOf('/') + 1);
  }

  // Set the Type
  if (schema.enum) {
    let opt = '';
    schema.enum.map((v) => {
      opt += `${v}, `;
    });
    info.type = 'enum';
    info.allowedValues = opt.slice(0, -2);
  } else if (schema.type) {
    info.type = schema.type;
  }

  if (schema.type === 'array' || schema.items) {
    const arraySchema = schema.items;
    info.arrayType = `${schema.type} of ${arraySchema.type}`;
    info.default = arraySchema.default === 0 ? '0 ' : (arraySchema.default ? arraySchema.default : '');
    if (arraySchema.enum) {
      let opt = '';
      arraySchema.enum.map((v) => {
        opt += `${v}, `;
      });
      info.allowedValues = opt.slice(0, -2);
    }
  } else if (schema.type === 'integer' || schema.type === 'number') {
    if (schema.minimum !== undefined && schema.maximum !== undefined) {
      info.constrain = `${schema.exclusiveMinimum ? '>' : 'between '}${schema.minimum} and ${schema.exclusiveMaximum ? '<' : ''} ${schema.maximum}`;
    } else if (schema.minimum !== undefined && schema.maximum === undefined) {
      info.constrain = `${schema.exclusiveMinimum ? '>' : '>='}${schema.minimum}`;
    } else if (schema.minimum === undefined && schema.maximum !== undefined) {
      info.constrain = `${schema.exclusiveMaximum ? '<' : '<='}${schema.maximum}`;
    }
    if (schema.multipleOf !== undefined) {
      info.constrain = `multiple of ${schema.multipleOf}`;
    }
  } else if (schema.type === 'string') {
    if (schema.minLength !== undefined && schema.maxLength !== undefined) {
      info.constrain = `${schema.minLength} to ${schema.maxLength} chars`;
    } else if (schema.minLength !== undefined && schema.maxLength === undefined) {
      info.constrain = `min:${schema.minLength} chars`;
    } else if (schema.minLength === undefined && schema.maxLength !== undefined) {
      info.constrain = `max:${schema.maxLength} chars`;
    }
  }
  info.typeInfoText = `${info.type}~|~${info.readOrWriteOnly} ${info.deprecated}~|~${info.constrain}~|~${info.default}~|~${info.allowedValues}~|~${info.pattern}~|~${info.description}`;
  return info;
}

/**
 * For changing OpenAPI-Schema to an Object Notation,
 * This Object would further be an input to `objectToTree()` to generate a pdfDefs representing an Object-Tree
 * @param {object} schema - Schema object from OpenAPI spec
 * @param {object} obj - recursivly pass this object to generate object notation
 * @param {number} level - contains the recursion depth
 */
export function schemaInObjectNotation(schema, obj = {}, level = 0) {
  if (!schema) {
    return;
  }
  if (schema.type === 'object' || schema.properties) { // If Object
    obj['::description'] = schema.description ? schema.description : '';
    obj['::type'] = 'object';
    for (const key in schema.properties) {
      if (schema.required && schema.required.includes(key)) {
        obj[`${key}*`] = schemaInObjectNotation(schema.properties[key], {}, (level + 1), key);
      } else {
        obj[key] = schemaInObjectNotation(schema.properties[key], {}, (level + 1), key);
      }
    }
  } else if (schema.items) { // If Array
    obj['::description'] = schema.description ? schema.description : '';
    obj['::type'] = 'array';
    obj['::props'] = schemaInObjectNotation(schema.items, {}, (level + 1));
  } else if (schema.allOf) {
    const objWithAllProps = {};
    if (schema.allOf.length === 1 && !schema.allOf[0].properties && !schema.allOf[0].items) {
      // If allOf has single item and the type is not an object or array, then its a primitive
      const tempSchema = schema.allOf[0];
      return `${getTypeInfo(tempSchema).typeInfoText}`;
    }
    // If allOf is an array of multiple elements, then all the keys makes a single object
    schema.allOf.map((v) => {
      if (v.type === 'object' || v.properties || v.allOf || v.anyOf || v.oneOf) {
        const partialObj = schemaInObjectNotation(v, {}, (level + 1));
        Object.assign(objWithAllProps, partialObj);
      } else if (v.type === 'array' || v.items) {
        const partialObj = [schemaInObjectNotation(v, {}, (level + 1))];
        Object.assign(objWithAllProps, partialObj);
      } else if (v.type) {
        const prop = `prop${Object.keys(objWithAllProps).length}`;
        const typeObj = getTypeInfo(v);
        objWithAllProps[prop] = `${typeObj.typeInfoText}`;
      } else {
        return '';
      }
    });

    obj = objWithAllProps;
  } else if (schema.anyOf || schema.oneOf) {
    let i = 1;
    const objWithAnyOfProps = {};
    const xxxOf = schema.anyOf ? 'anyOf' : 'oneOf';
    schema[xxxOf].map((v) => {
      if (v.type === 'object' || v.properties || v.allOf || v.anyOf || v.oneOf) {
        const partialObj = schemaInObjectNotation(v, {}, (level + 1));
        objWithAnyOfProps[`OPTION:${i}`] = partialObj;
        i++;
      } else if (v.type === 'array' || v.items) {
        const partialObj = [schemaInObjectNotation(v, {}, (level + 1))];
        Object.assign(objWithAnyOfProps, partialObj);
      } else {
        const prop = `prop${Object.keys(objWithAnyOfProps).length}`;
        objWithAnyOfProps[prop] = `${getTypeInfo(v).typeInfoText}`;
      }
    });
    obj[(schema.anyOf ? 'ANY:OF' : 'ONE:OF')] = objWithAnyOfProps;
  } else {
    const typeObj = getTypeInfo(schema);
    if (typeObj.typeInfoText) {
      return `${typeObj.typeInfoText}`;
    }
    return '';
  }
  return obj;
}

/**
 * For changing an object to Tree (array of pdfDefs, which when feeded to pdfMake would produce a indented object tree)
 * @param {object} obj - keys to iterate
 * @param {string} prevKeyDataType  - data-type of previous key, it is either 'primitive', 'object' or 'array', based on this appropriate braces are used
 * @param {string} prevKey  - name of the key from previous recursive call stack
 */
export function objectToTree(obj, localize, prevKeyDataType = 'object', prevKey = 'object') {
  if (typeof obj !== 'object') {
    const typeAndDescr = obj.split('~|~');
    const descrStack = [];
    if (prevKeyDataType === 'array') {
      typeAndDescr[0] = `[${typeAndDescr[0]}]`;
    }
    if (typeAndDescr[1].trim()) {
      descrStack.push({
        text: `${typeAndDescr[1]}`, margin: [0, 1, 0, 0], style: ['small', 'b', 'darkGray'],
      });
    }
    if (typeAndDescr[2]) {
      descrStack.push({
        text: `${typeAndDescr[2]}`, margin: [0, 1, 0, 0], style: ['small', 'mono', 'darkGray'],
      });
    }
    if (typeAndDescr[3]) {
      descrStack.push({
        text: [
          { text: 'DEFAULT: ', style: ['sub', 'b', 'darkGray'] },
          { text: typeAndDescr[3], style: ['small', 'lightGray', 'mono', 'darkGray'] },
        ],
        margin: [0, 1, 0, 0],
      });
    }
    if (typeAndDescr[4]) {
      descrStack.push({
        text: [
          { text: 'ALLOWED: ', style: ['sub', 'b', 'darkGray'] },
          { text: typeAndDescr[4], style: ['small', 'lightGray', 'mono', 'darkGray'] },
        ],
      });
    }
    if (typeAndDescr[5]) {
      descrStack.push({
        text: [
          { text: 'PATTERN: ', style: ['sub', 'b', 'darkGray'] },
          { text: typeAndDescr[5], style: ['small', 'lightGray', 'mono', 'darkGray'] },
        ],
      });
    }
    if (typeAndDescr[6]) {
      descrStack.push({
        text: `${typeAndDescr[6]}`,
        style: ['sub', 'lightGray'],
        margin: [0, 3, 0, 0],
      });
    }

    return [
      { text: prevKey, style: ['sub', 'mono'], margin: 0 },
      { text: (typeAndDescr[0] ? typeAndDescr[0] : ''), style: ['sub', 'mono', 'lightGray'], margin: 0 },
      { stack: descrStack, margin: 0 },
    ];
  }

  // Important - pdfMake needs one row with all the cells for colSpan to work properly
  const rows = [
    [{ text: '', margin: 0 }, { text: '', margin: 0 }, { text: '', margin: 0 }],
  ];

  for (const key in obj) {
    // If ANY_OF or ONE_OF
    if (key === 'ANY:OF' || key === 'ONE:OF') {
      const allOptions = [];
      for (const k in obj[key]) {
        allOptions.push(objectToTree(obj[key][k], localize, 'object', k));
      }
      return [
        {
          colSpan: 3,
          stack: [
            { text: `${prevKey}`, style: ['small', 'mono'] },
            {
              margin: [10, 0, 0, 0],
              stack: [
                { text: `${key.replace(':', ' ')}`, style: ['sub', 'blue', 'b'], margin: [0, 5, 0, 0] },
                ...allOptions,
              ],
            },
          ],
        },
      ];
    }
    if (typeof obj[key] === 'object' && obj[key]['::type']) {
      let objectDef;
      if (obj[key]['::type'] === 'array') {
        objectDef = objectToTree(obj[key]['::props'], localize, obj[key]['::type'], key);
      } else {
        objectDef = objectToTree(obj[key], localize, obj[key]['::type'], key);
      }
      rows.push(objectDef);
    } else if (key.startsWith('::') === false) {
      const primitiveDef = objectToTree(obj[key], localize, 'primitive', key);
      rows.push(primitiveDef);
    }
  }

  let keyDef;
  if (prevKey.startsWith('OPTION:')) {
    keyDef = {
      text: [
        { text: `${prevKey.replace(':', ' ')}`, style: ['sub', 'b', 'blue'] },
        { text: `${prevKeyDataType === 'array' ? '[{' : '{'}`, style: ['small', 'mono'] },
      ],
    };
  } else {
    keyDef = {
      stack: [
        { text: `${prevKey} ${prevKeyDataType === 'array' ? '[{' : '{'}`, style: ['small', 'mono'] },
        { text: `${prevKeyDataType === 'array' ? 'Array of object: ' : ''} ${obj['::description'] ? obj['::description'] : ''}`, style: ['sub', 'gray'] },
      ],
    };
  }

  return [{
    colSpan: 3,
    stack: [
      keyDef,
      {
        margin: [10, 0, 0, 0],
        layout: noBorderLayout,
        // layout: indentGuideLayout,
        table: {
          headerRows: 0,
          widths: ['auto', 'auto', '*'],
          dontBreakRows: true,
          body: rows,
        },
      },
      { text: `${prevKeyDataType === 'array' ? '}]' : '}'}`, style: ['small', 'mono'] },
    ],
  }];
}


/**
 * For changing an object to Table-Tree (array of pdfDefs, which when feeded to pdfMake would produce a indented table tree)
 * @param {object} obj - keys to iterate
 * @param {string} keyDataType  - is 'primitive', 'object' or 'array', based on this appropriate braces are used
 * @param {string} keyName  - name of the key from previous recursive call stack
 * @param {string} keyDescr - description of the key
 */

export function objectToTableTree(obj, allRows = [], level = 0) {
  const leftMargin = level * 10;
  // let retunRows = [];
  if (!obj || typeof obj === 'string') {
    return [{ text: '' }];
  }
  for (const key in obj) {
    if (typeof obj[key] === 'object' && Array.isArray(obj[key]) === false) {
      const objRow = [
        { text: key, style: ['sub', 'mono'], margin: [leftMargin, 0, 0, 0] },
        { text: 'object', style: ['sub', 'mono', 'lightGray'], margin: 0 },
        { text: '', margin: 0 },
      ];
      allRows.push(objRow);
      /*
      if (Array.isArray(obj[key])) {
        if ( typeof )
      }
      */
      objectToTableTree(obj[key], allRows, (level + 1));
    } else if (typeof obj[key] === 'object' && Array.isArray(obj[key])) {
      const objRow = [
        { text: key, style: ['sub', 'mono'], margin: [leftMargin, 0, 0, 0] },
        { text: 'array', style: ['sub', 'mono', 'lightGray'], margin: 0 },
        { text: '', margin: 0 },
      ];
      allRows.push(objRow);
      objectToTableTree(obj[key][0], allRows, (level + 1));
    } else if (typeof obj[key] === 'string' && (key.startsWith('::') === false)) {
      const typeAndDescr = obj[key].split('~|~');
      const descrStack = [];
      if (typeAndDescr[1].trim()) {
        descrStack.push({
          text: `${typeAndDescr[1]}`, style: ['sub', 'b', 'darkGray'],
        });
      }
      if (typeAndDescr[2]) {
        descrStack.push({
          text: `${typeAndDescr[2]}`, style: ['sub', 'mono', 'darkGray'],
        });
      }
      if (typeAndDescr[3]) {
        descrStack.push({
          text: [
            { text: 'DEFAULT: ', style: ['sub', 'b', 'darkGray'] },
            { text: typeAndDescr[3], style: ['sub', 'lightGray', 'mono', 'darkGray'] },
          ],
        });
      }
      if (typeAndDescr[4]) {
        descrStack.push({
          text: [
            { text: 'ALLOWED: ', style: ['sub', 'b', 'darkGray'] },
            { text: typeAndDescr[4], style: ['sub', 'lightGray', 'mono', 'darkGray'] },
          ],
        });
      }
      if (typeAndDescr[5]) {
        descrStack.push({
          text: [
            { text: 'PATTERN: ', style: ['sub', 'b', 'darkGray'] },
            { text: typeAndDescr[5], style: ['sub', 'lightGray', 'mono', 'darkGray'] },
          ],
        });
      }
      if (typeAndDescr[6]) {
        descrStack.push({
          text: `${typeAndDescr[6]}`,
          style: ['sub', 'lightGray'],
          margin: [0, 3, 0, 0],
        });
      }
      allRows.push([
        { text: key, style: ['sub', 'mono'], margin: [leftMargin, 0, 0, 0] },
        { text: (typeAndDescr[0] ? typeAndDescr[0] : ''), style: ['sub', 'mono', 'lightGray'], margin: 0 },
        { text: (typeAndDescr[1] ? typeAndDescr[1] : ''), style: ['sub', 'mono', 'lightGray'], margin: 0 },
        // { stack: ((descrStack && descrStack.length) > 0 ? descrStack : [{ text: '' }]), margin: 0 },
      ]);
    }
  }
  return allRows;
}

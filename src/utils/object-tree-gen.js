const rowLinesOnlyTableLayout = {
  hLineWidth() {
    // return (i === 0 || i === 1 || i === node.table.body.length) ? 0 : 0.5;
    return 0;
  },
  vLineWidth() {
    return 0;
  },
  // hLineColor: function (i, node) {
  //   return (i === 0 || i === node.table.body.length) ? 'black' : 'lightgray';
  // },
  paddingTop() { return 0; },
  paddingBottom() { return 0; },
};

/* Generates an object containing type and constraint info */
export function getTypeInfo(schema, overrideAttributes = null) {
  if (!schema) {
    return;
  }
  const typeProps = {
    format: schema.format ? schema.format : '',
    pattern: (schema.pattern && !schema.enum) ? schema.pattern : '',
    readOnly: schema.readOnly ? 'read-only' : '',
    writeOnly: schema.writeOnly ? 'write-only' : '',
    depricated: schema.deprecated ? 'depricated' : '',
    default: schema.default === 0 ? '0 ' : (schema.default ? schema.default : ''),
    type: '',
    arrayType: '',
    allowedValues: '',
    constrain: '',
    typeInfoText: '',
  };

  // Set the Type
  if (schema.enum) {
    let opt = '';
    schema.enum.map((v) => {
      opt += `${v}, `;
    });
    typeProps.type = 'enum';
    typeProps.allowedValues = opt.slice(0, -2);
  } else if (schema.type) {
    typeProps.type = schema.type;
  }

  if (schema.type === 'array' || schema.items) {
    const arraySchema = schema.items;
    typeProps.arrayType = `${schema.type} of ${arraySchema.type}`;
    typeProps.default = arraySchema.default === 0 ? '0 ' : (arraySchema.default ? arraySchema.default : '');
    if (arraySchema.enum) {
      let opt = '';
      arraySchema.enum.map((v) => {
        opt += `${v}, `;
      });
      typeProps.allowedValues = opt.slice(0, -2);
    }
  } else if (schema.type === 'integer' || schema.type === 'number') {
    if (schema.minimum !== undefined && schema.maximum !== undefined) {
      typeProps.constrain = `${schema.exclusiveMinimum ? '>' : 'between '}${schema.minimum} and ${schema.exclusiveMaximum ? '<' : ''} ${schema.maximum}`;
    } else if (schema.minimum !== undefined && schema.maximum === undefined) {
      typeProps.constrain = `${schema.exclusiveMinimum ? '>' : '>='}${schema.minimum}`;
    } else if (schema.minimum === undefined && schema.maximum !== undefined) {
      typeProps.constrain = `${schema.exclusiveMaximum ? '<' : '<='}${schema.maximum}`;
    }
    if (schema.multipleOf !== undefined) {
      typeProps.constrain = `multiple of ${schema.multipleOf}`;
    }
  } else if (schema.type === 'string') {
    if (schema.minLength !== undefined && schema.maxLength !== undefined) {
      typeProps.constrain = `${schema.minLength} to ${schema.maxLength} chars`;
    } else if (schema.minLength !== undefined && schema.maxLength === undefined) {
      typeProps.constrain = `min:${schema.minLength} chars`;
    } else if (schema.minLength === undefined && schema.maxLength !== undefined) {
      typeProps.constrain = `max:${schema.maxLength} chars`;
    }
  }

  if (overrideAttributes) {
    if (overrideAttributes.readOnly) {
      typeProps.readOnly = 'read-only';
    }
    if (overrideAttributes.writeOnly) {
      typeProps.writeOnly = 'write-only';
    }
    if (overrideAttributes.deprecated) {
      typeProps.deprecated = 'depricated';
    }
  }

  let typeInfoText = `${typeProps.format ? typeProps.format : typeProps.type}`;
  if (typeProps.allowedValues) {
    typeInfoText += `:(${typeProps.allowedValues})`;
  }
  if (typeProps.readOnly) {
    typeInfoText += ' read-only';
  }
  if (typeProps.writeOnly) {
    typeInfoText += ' write-only';
  }
  if (typeProps.deprecated) {
    typeInfoText += ' depricated';
  }
  if (typeProps.constrain) {
    typeInfoText += `\u00a0${typeProps.constrain}`;
  }
  if (typeProps.pattern) {
    typeInfoText += `\u00a0${typeProps.pattern}`;
  }
  typeProps.typeInfoText = typeInfoText;
  return typeProps;
}

/**
 * For changing OpenAPI-Schema to an Object Notation,
 * This Object would further be an input to `objectToTree()` to generate a pdfDefs representing an Object-Tree
 * @param {object} schema - Schema object from OpenAPI spec
 * @param {number} level - contains the recursion depth
 */
export function schemaToObject(schema, level = 0) {
  let obj = {};
  if (schema === null) {
    return;
  }
  if (schema.type === 'object' || schema.properties) {
    // obj[':object_description'] = schema.description ? schema.description : '';
    for (const key in schema.properties) {
      obj[`${key}${schema.required && schema.required.includes(key) ? '*' : ''}`] = schemaToObject(schema.properties[key], {});
    }
  } else if (schema.type === 'array' || schema.items) {
    if (level === 0) {
      // if root level schema is of type array, then convert to object
      obj = schemaToObject(schema.items, level + 1);
    } else {
      obj = [schemaToObject(schema.items, level + 1)];
    }
  } else if (schema.allOf) {
    const objWithAllProps = {};
    if (schema.allOf.length === 1 && !schema.allOf[0].properties && !schema.allOf[0].items) {
      // If allOf has single item and the type is not an object or array, then its a primitive
      if (schema.allOf[0].$ref) {
        const objType = schema.allOf[0].$ref.substring(schema.allOf[0].$ref.lastIndexOf('/') + 1);
        return `{ ${objType} } ~|~ Recursive Object`;
      }
      const tempSchema = schema.allOf[0];
      return `${getTypeInfo(tempSchema).typeInfoText}~|~${tempSchema.description ? tempSchema.description : ''}`;
    }
    // If allOf is an array of multiple elements, then all the keys makes a single object
    schema.allOf.map((v) => {
      if (v.type === 'object' || v.properties || v.allOf || v.anyOf || v.oneOf) {
        const partialObj = schemaToObject(v, level + 1);
        Object.assign(objWithAllProps, partialObj);
      } else if (v.type === 'array' || v.items) {
        const partialObj = [schemaToObject(v, level + 1)];
        Object.assign(objWithAllProps, partialObj);
      } else if (v.type) {
        const prop = `prop${Object.keys(objWithAllProps).length}`;
        const typeObj = getTypeInfo(v);
        objWithAllProps[prop] = `${typeObj.typeInfoText}~|~${v.description ? v.description : ''}`;
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
        const partialObj = schemaToObject(v, level + 1);
        objWithAnyOfProps[`OPTION:${i}`] = partialObj;
        i++;
      } else if (v.type === 'array' || v.items) {
        const partialObj = [schemaToObject(v, level + 1)];
        Object.assign(objWithAnyOfProps, partialObj);
      } else {
        const prop = `prop${Object.keys(objWithAnyOfProps).length}`;
        objWithAnyOfProps[prop] = `${getTypeInfo(v).typeInfoText}~|~${v.description ? v.description : ''}`;
      }
    });
    obj[(schema.anyOf ? 'ANY:OF' : 'ONE:OF')] = objWithAnyOfProps;
  } else {
    const typeObj = getTypeInfo(schema);
    if (typeObj.typeInfoText) {
      return `${typeObj.typeInfoText}~|~${schema.description ? schema.description : ''}`;
    }
    return '~|~';
  }
  return obj;
}

/**
 * For changing an object to Tree (array of pdfDefs, which when feeded to pdfMake would produce a indented object tree)
 * @param {object} obj - keys to iterate
 * @param {string} keyDataType  - is 'primitive', 'object' or 'array', based on this appropriate braces are used
 * @param {string} keyName  - name of the key from previous recursive call stack
 * @param {string} keyDescr - description of the key
 */
export function objectToTree(obj, keyDataType = 'object', keyName = 'object', keyDescr = '') {
  if (typeof obj !== 'object') {
    const typeAndDescr = obj.split('~|~');
    return [
      { text: keyName, style: ['small', 'mono'], margin: 0 },
      { text: (typeAndDescr[0] ? typeAndDescr[0] : ''), style: ['small', 'mono', 'lightGray'], margin: 0 },
      { text: (typeAndDescr[1] ? typeAndDescr[1] : ''), style: ['small', 'lightGray'], margin: [0, 2, 0, 0] },
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
        allOptions.push(objectToTree(obj[key][k], 'object', k));
      }
      return [
        {
          colSpan: 3,
          stack: [
            { text: `${keyName}`, style: ['small', 'mono'] },
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
    if (typeof obj[key] === 'object') {
      if (Array.isArray(obj[key])) {
        const arrayDef = objectToTree(obj[key], 'array', (key === '0' ? '' : key));
        rows.push(arrayDef);
      } else {
        const objectDef = objectToTree(obj[key], 'object', (key === '0' ? '' : key));
        rows.push(objectDef);
      }
    } else {
      const primitiveDef = objectToTree(obj[key], 'primitive', (key === '0' ? '' : key));
      rows.push(primitiveDef);
    }
  }

  let keyDef;
  if (keyName.startsWith('OPTION:')) {
    keyDef = {
      text: [
        { text: `${keyName.replace(':', ' ')}`, style: ['sub', 'b', 'blue'] },
        { text: `${keyDataType === 'array' ? '[' : '{'}`, style: ['small', 'mono'] },
      ],
    };
  } else {
    keyDef = { text: `${keyName} ${keyDataType === 'array' ? '[' : '{'}`, style: ['small', 'mono'] };
  }

  return [{
    colSpan: 3,
    stack: [
      keyDef,
      { text: keyDescr, style: ['sub', 'blue'], margin: [0, 2, 0, 0] },
      {
        margin: [10, 0, 0, 0],
        widths: ['auto', '10', '*'],
        layout: rowLinesOnlyTableLayout,
        table: {
          dontBreakRows: true,
          body: rows,
        },
      },
      { text: `${keyDataType === 'array' ? ']' : '}'}`, style: ['small', 'mono'] },
    ],
  }];
}

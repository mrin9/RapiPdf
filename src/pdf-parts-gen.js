import marked from 'marked';
import htmlToPdfmake from 'html-to-pdfmake';
import { rowLinesTableLayout } from '@/table-layouts';
import {
  getTypeInfo,
  schemaInObjectNotation,
  objectToTree,
  objectToTableTree,
} from '@/object-tree-gen';

function markdownToPdfmake(markdown) {
  const html = marked(markdown);
  return htmlToPdfmake(html);
}

// Info Def
export function getInfoDef(spec, bookTitle, localize) {
  let content;
  if (spec.info) {
    let contactDef = [];
    let contactName;
    let contactEmail;
    let contactUrl;
    let termsOfService;

    if (spec.info.contact) {
      if (spec.info.contact.name) {
        contactName = { text: [{ text: `\n${localize.name}: `, style: ['b', 'small'] }, { text: spec.info.contact.name, style: ['small'] }] };
      }
      if (spec.info.contact.email) {
        contactEmail = { text: [{ text: `\n${localize.email}: `, style: ['b', 'small'] }, { text: spec.info.contact.email, style: ['small'] }] };
      }
      if (spec.info.contact.url) {
        contactUrl = { text: [{ text: `\n${localize.url}: `, style: ['b', 'small'] }, { text: spec.info.contact.url, style: ['small', 'blue'], link: spec.info.contact.url }] };
      }
      if (spec.info.termsOfService) {
        termsOfService = { text: [{ text: `\n${localize.termsOfService}: `, style: ['b', 'small'] }, { text: spec.info.termsOfService, style: ['small', 'blue'], link: spec.info.termsOfService }] };
      }
      contactDef = [
        { text: localize.contact, style: ['p', 'b', 'topMargin3'] },
        {
          text: [
            contactName,
            contactEmail,
            contactUrl,
            termsOfService,
          ],
        },
      ];
    }

    let specInfDescrMarkDef;
    if (spec.info.description) {
      specInfDescrMarkDef = {
        stack: markdownToPdfmake(spec.info.description),
        style: ['topMargin3'],
      };
    } else {
      specInfDescrMarkDef = '';
    }

    content = [
      { text: bookTitle || localize.apiReference, style: ['h2', 'primary', 'right', 'b', 'topMargin1'] },
      (spec.info.title ? { text: spec.info.title, style: ['title', 'right'] } : ''),
      (spec.info.version ? { text: `${localize.apiVersion}: ${spec.info.version}`, style: ['p', 'b', 'right', 'alternate'] } : ''),
      specInfDescrMarkDef,
      ...contactDef,
      { text: '', pageBreak: 'after' },
    ];
  } else {
    content = [
      { text: bookTitle || localize.apiReference, style: ['h1', 'bold', 'primary', 'right', 'topMargin1'] },
      { text: '', pageBreak: 'after' },
    ];
  }
  return content;
}

// Security Def
export function getSecurityDef(spec, localize) {
  const content = [];
  if (spec.securitySchemes) {
    content.push({ text: localize.securityAndAuthentication, style: ['h3', 'b', 'primary', 'right', 'topMargin3'] });
    content.push({ text: localize.securitySchemes, style: ['b', 'tableMargin'] });
    const tableContent = [
      [{ text: localize.key, style: ['small', 'b'] }, { text: localize.type, style: ['small', 'b'] }, { text: localize.description, style: ['small', 'b'] }],
    ];
    for (const key in spec.securitySchemes) {
      tableContent.push([
        key,
        spec.securitySchemes[key].type + (spec.securitySchemes[key].scheme ? (`, ${spec.securitySchemes[key].scheme}`) : '') + (spec.securitySchemes[key].bearerFormat ? (`, ${spec.securitySchemes[key].bearerFormat}`) : ''),
        spec.securitySchemes[key].description ? spec.securitySchemes[key].description : '',
      ]);
    }

    content.push({
      table: {
        headerRows: 1,
        body: tableContent,
      },
      layout: rowLinesTableLayout,
      style: 'tableMargin',
      pageBreak: 'after',
    });
  }
  return content;
}

// Parameter Table
function getParameterTableDef(parameters, paramType, localize, includeExample = false) {
  // let filteredParams= parameters ? parameters.filter(param => param.in === paramType):[];
  if (parameters === undefined || parameters.length === 0) {
    return;
  }
  const tableContent = [
    [
      { text: localize.name, style: ['sub', 'b', 'alternate'] },
      { text: localize.type, style: ['sub', 'b', 'alternate'] },
      { text: includeExample ? localize.example : '', style: ['sub', 'b', 'alternate'] },
      { text: localize.description, style: ['sub', 'b', 'alternate'] },
    ],
  ];
  if (paramType === 'FORM DATA') {
    for (const paramName in parameters) {
      const param = parameters[paramName];
      let { type } = param;
      const format = param.format === 'binary' ? '(binary)' : '';
      if (type === 'array') {
        type = `array of ${param.items.type}`;
      }
      tableContent.push([
        { text: paramName, style: ['small', 'mono'] },
        { text: type + format, style: ['small', 'mono'] },
        { text: includeExample ? (param.example ? param.example : (param.examples && param.examples[0] ? param.examples[0] : '')) : '', style: ['small'], margin: [0, 2, 0, 0] },
        { text: param.description, style: ['small'], margin: [0, 2, 0, 0] },
      ]);
    }
  } else {
    parameters.map((param) => {
      const paramSchema = getTypeInfo(param.schema);
      tableContent.push([
        {
          text: [
            { text: param.required ? '*' : '', style: ['small', 'b', 'red', 'mono'] },
            { text: param.name, style: ['small', 'mono'] },
            (paramSchema.deprecated ? { text: `\n${localize.deprecated}`, style: ['small', 'red', 'b'] } : ''),
          ],
        },
        {
          stack: [
            { text: `${paramSchema.type === 'array' ? paramSchema.arrayType : (paramSchema.format ? paramSchema.format : paramSchema.type)}`, style: ['small', 'mono'] },
            (paramSchema.constrain ? { text: paramSchema.constrain, style: ['small', 'gray'] } : ''),
            (paramSchema.allowedValues ? {
              text: [
                { text: `${localize.allowed}: `, style: ['b', 'sub'] },
                { text: paramSchema.allowedValues, style: ['small', 'lightGray'] },
              ],
            } : ''
            ),
            (paramSchema.pattern ? { text: `${localize.pattern}: ${paramSchema.pattern}`, style: ['small', 'gray'] } : ''),
          ],
        },
        { text: includeExample ? (param.example ? param.example : (param.examples && param.examples[0] ? param.examples[0] : '')) : '', style: ['small'], margin: [0, 2, 0, 0] },
        { text: param.description, style: ['small'], margin: [0, 2, 0, 0] },
      ]);
    });
  }

  return [
    { text: `${paramType} ${localize.parameters}`.toUpperCase(), style: ['small', 'b'], margin: [0, 10, 0, 0] },
    {
      table: {
        headerRows: 1,
        dontBreakRows: true,
        widths: ['auto', 'auto', includeExample ? 'auto' : 0, '*'],
        body: tableContent,
      },
      layout: rowLinesTableLayout,
      style: 'tableMargin',
    },
  ];
}

function getExamplesDef(contentTypeObj, localizedExampleLabel) {
  const exampleSectionDef = [];
  if (contentTypeObj.example) {
    exampleSectionDef.push([
      { text: `${localizedExampleLabel}:`, margin: [20, 10, 0, 0], style: ['small', 'b'] },
      { text: JSON.stringify(contentTypeObj.example, null, '\u200B \u200B'), margin: [40, 10, 0, 0], style: 'monoSub' },
    ]);
  }
  if (contentTypeObj.examples) {
    let iterCount = 0;
    for (const oneExample in contentTypeObj.examples) {
      exampleSectionDef.push([
        { text: `${localizedExampleLabel} ${++iterCount}:`, margin: [20, 10, 0, 0], style: ['small', 'b'] },
        { text: JSON.stringify(oneExample, null, 2), margin: [40, 10, 0, 0], style: 'monoSub' },
      ]);
    }
  }
  return exampleSectionDef;
}

// Request Body Def
function getRequestBodyDef(requestBody, schemaStyle, localize, includeExample = false) {
  if (!requestBody) {
    return;
  }
  const content = [];
  let formParamDef;
  for (const contentType in requestBody.content) {
    const contentTypeObj = requestBody.content[contentType];
    const requestBodyDef = [
      { text: `${localize.requestBody} - ${contentType}`, margin: [0, 10, 0, 0], style: ['small', 'b'] },
    ];

    if ((contentType.includes('form') || contentType.includes('multipart-form')) && contentTypeObj.schema) {
      formParamDef = getParameterTableDef(contentTypeObj.schema.properties, 'FORM DATA', localize);
      content.push(formParamDef);
    } else if (contentType.includes('json') || contentType.includes('xml')) {
      let origSchema = requestBody.content[contentType].schema;
      if (origSchema) {
        origSchema = JSON.parse(JSON.stringify(origSchema));
        const schemaInObjectNotaion = schemaInObjectNotation(origSchema);

        if (schemaStyle === 'object') {
          let treeDef;
          if (schemaInObjectNotaion['::type'] && schemaInObjectNotaion['::type'] === 'array') {
            treeDef = objectToTree(schemaInObjectNotaion['::props'], localize, 'array');
          } else {
            treeDef = objectToTree(schemaInObjectNotaion, localize);
          }
          requestBodyDef.push(treeDef);
        } else {
          // Schema style is "tree."
          let schemaTableTreeDef;
          if (schemaInObjectNotaion['::type'] && schemaInObjectNotaion['::type'] === 'array') {
            schemaTableTreeDef = objectToTableTree(schemaInObjectNotaion['::prop'], localize, 'array');
          } else {
            schemaTableTreeDef = objectToTableTree(schemaInObjectNotaion, localize);
          }
          if (schemaTableTreeDef && schemaTableTreeDef.length > 0 && Array.isArray(schemaTableTreeDef[0]) && schemaTableTreeDef[0].length > 0) {
            schemaTableTreeDef.unshift([
              { text: localize.name, style: ['sub', 'b', 'alternate'] },
              { text: localize.type, style: ['sub', 'b', 'alternate'] },
              { text: localize.description, style: ['sub', 'b', 'alternate'] },
            ]);

            requestBodyDef.push({
              table: {
                headerRows: 1,
                body: schemaTableTreeDef,
              },
              layout: rowLinesTableLayout,
              margin: [0, 3, 0, 0],
            });
          }
        }
      }
      content.push(requestBodyDef);
    }

    if (includeExample) {
      content.push(getExamplesDef(contentTypeObj, localize.example));
    }
  }
  return content;
}

// Response Def
function getResponseDef(responses, schemaStyle, localize, includeExample = false) {
  const respDef = [];
  for (const statusCode in responses) {
    const allResponseDefs = [];
    for (const contentType in responses[statusCode].content) {
      const responseDef = [
        { text: `${localize.responseModel} - ${contentType}`, margin: [10, 10, 0, 0], style: ['small', 'b'] },
      ];

      const contentTypeObj = responses[statusCode].content[contentType];
      let origSchema = contentTypeObj.schema;
      if (origSchema) {
        origSchema = JSON.parse(JSON.stringify(origSchema));
        const schemaInObjectNotaion = schemaInObjectNotation(origSchema);
        if (schemaStyle === 'object') {
          let schemaTreeDef;
          if (schemaInObjectNotaion['::type'] && schemaInObjectNotaion['::type'] === 'array') {
            schemaTreeDef = objectToTree(schemaInObjectNotaion['::props'], localize, 'array');
          } else {
            schemaTreeDef = objectToTree(schemaInObjectNotaion, localize);
          }
          if (Array.isArray(schemaTreeDef) && schemaTreeDef.length > 0) {
            schemaTreeDef[0].margin = [10, 5, 0, 0];
            responseDef.push(schemaTreeDef);
          }
        } else {
          // If Schema style is Table-Tree
          let schemaTableTreeDef;
          let rootObjectType;
          if (schemaInObjectNotaion['::type'] && schemaInObjectNotaion['::type'] === 'array') {
            schemaTableTreeDef = objectToTableTree(schemaInObjectNotaion['::props'], localize);
            rootObjectType = [{ text: 'ARRAY OF OBJECT WITH BELOW STRUCTURE', style: ['sub', 'b', 'alternate'], colSpan: 3 }];
          } else {
            schemaTableTreeDef = objectToTableTree(schemaInObjectNotaion, localize);
            rootObjectType = [{ text: 'OBJECT WITH BELOW STRUCTURE', style: ['sub', 'b', 'alternate'], colSpan: 3 }];
          }
          if (schemaTableTreeDef && schemaTableTreeDef.length > 0 && Array.isArray(schemaTableTreeDef[0]) && schemaTableTreeDef[0].length > 0) {
            schemaTableTreeDef.unshift(rootObjectType);
            schemaTableTreeDef.unshift([
              { text: localize.name, style: ['sub', 'b', 'alternate'] },
              { text: localize.type, style: ['sub', 'b', 'alternate'] },
              { text: localize.description, style: ['sub', 'b', 'alternate'] },
            ]);

            responseDef.push({
              table: {
                headerRows: 1,
                body: schemaTableTreeDef,
                dontBreakRows: true,
              },
              layout: rowLinesTableLayout,
              margin: [10, 3, 0, 0],
            });
          }
        }
      }
      if (includeExample) {
        responseDef.push(getExamplesDef(contentTypeObj, localize.example));
      }
      allResponseDefs.push(responseDef);
    }
    respDef.push({
      text: [
        { text: `${localize.statusCode} - ${statusCode}: `, style: ['small', 'b'] },
        { text: responses[statusCode].description, style: ['small'] },
      ],
      margin: [0, 10, 0, 0],
    });
    if (allResponseDefs.length > 0) {
      respDef.push(allResponseDefs);
    }
  }
  return respDef;
}

// API details def
export function getApiDef(spec, filterPath, schemaStyle, localize, includeExample, includeApiList) {
  const content = [{ text: localize.api, style: ['h2', 'b'] }];
  let tagSeq = 0;

  spec.tags.map((tag) => {
    const operationContent = [];
    let pathSeq = 0;

    for (let j = 0; j < tag.paths.length; j++) {
      const path = tag.paths[j];
      if (filterPath.trim() !== '') {
        if (path.path.includes(filterPath) === false) {
          continue;
        }
      }
      pathSeq += 1;
      operationContent.push({
        text: `${tagSeq + 1}.${pathSeq} ${path.method.toUpperCase()} ${path.path}`,
        style: ['topMargin3', 'mono', 'p', 'primary', 'b'],
        tocItem: true,
        tocStyle: ['small', 'blue', 'mono'],
        tocNumberStyle: ['small', 'blue', 'mono'],
      });
      operationContent.push({ text: '', style: ['topMarginRegular'] });

      let pathSummaryMarkDef; let pathDescrMarkDef;
      if (path.summary) {
        pathSummaryMarkDef = {
          stack: markdownToPdfmake(path.summary),
          style: ['primary', 'b'],
        };
        operationContent.push(pathSummaryMarkDef);
      }
      if (path.description && path.description.trim() !== path.summary.trim()) {
        pathDescrMarkDef = {
          stack: markdownToPdfmake(path.description),
        };
        operationContent.push(pathDescrMarkDef);
      }

      // Generate Request Defs
      const requestSetDef = [];
      const pathParams = path.parameters ? path.parameters.filter((param) => param.in === 'path') : null;
      const queryParams = path.parameters ? path.parameters.filter((param) => param.in === 'query') : null;
      const headerParams = path.parameters ? path.parameters.filter((param) => param.in === 'header') : null;
      const cookieParams = path.parameters ? path.parameters.filter((param) => param.in === 'cookie') : null;

      const pathParamTableDef = getParameterTableDef(pathParams, 'path', localize, includeExample);
      const queryParamTableDef = getParameterTableDef(queryParams, 'query', localize, includeExample);
      const requestBodyTableDefs = getRequestBodyDef(path.requestBody, schemaStyle, localize, includeExample);
      const headerParamTableDef = getParameterTableDef(headerParams, 'header', localize, includeExample);
      const cookieParamTableDef = getParameterTableDef(cookieParams, 'cookie', localize, includeExample);
      operationContent.push({ text: localize.request, style: ['p', 'b', 'alternate'], margin: [0, 10, 0, 0] });
      if (pathParamTableDef || queryParamTableDef || headerParamTableDef || cookieParamTableDef || requestBodyTableDefs) {
        if (pathParamTableDef) {
          requestSetDef.push(pathParamTableDef);
        }
        if (queryParamTableDef) {
          requestSetDef.push(queryParamTableDef);
        }
        if (requestBodyTableDefs) {
          requestBodyTableDefs.map((v) => {
            requestSetDef.push(v);
          });
        }
        if (headerParamTableDef) {
          requestSetDef.push(headerParamTableDef);
        }
        if (cookieParamTableDef) {
          requestSetDef.push(cookieParamTableDef);
        }
      } else {
        requestSetDef.push({ text: localize.noRequestParameters, style: ['small', 'gray'], margin: [0, 5, 0, 0] });
      }
      if (requestSetDef && requestSetDef.length > 0) {
        operationContent.push({
          stack: requestSetDef,
          margin: [10, 0, 0, 0],
        });
      }

      // Generate Response Defs
      operationContent.push({ text: localize.response, style: ['p', 'b', 'alternate'], margin: [0, 10, 0, 0] });
      const respDef = getResponseDef(path.responses, schemaStyle, localize, includeExample);
      if (respDef && respDef.length > 0) {
        operationContent.push({
          stack: respDef,
          margin: [10, 5, 0, 5],
        });
      }

      // End of Operation - Line (Except the last content)
      if (j === tag.paths.length - 1) {
        operationContent.push({
          canvas: [{
            type: 'line', x1: 0, y1: 5, x2: 595 - 2 * 35, y2: 5, lineWidth: 0.5, lineColor: '#cccccc',
          }],
        });
      }
    }

    if (pathSeq > 0) {
      tagSeq += 1;
      let tagDescrMarkDef;
      if (tag.description) {
        tagDescrMarkDef = {
          stack: markdownToPdfmake(tag.description),
          style: ['topMarginRegular'],
        };
      } else {
        tagDescrMarkDef = { text: '' };
      }

      content.push(
        {
          text: `${tagSeq}. ${tag.name.toUpperCase()}`,
          style: ['h2', 'b', 'primary', 'tableMargin'],
          tocItem: true,
          tocStyle: ['small', 'b'],
          tocMargin: [0, 10, 0, 0],
        },
        tagDescrMarkDef,
        operationContent,
        { text: '', pageBreak: 'after' },
      );
    }
  });

  // Remove last page break if api list not included
  if (!includeApiList) {
    content.pop();
  }

  return content;
}


// API List Def
export function getApiListDef(spec, sectionHeading, localize) {
  const content = [{ text: sectionHeading, style: ['h3', 'b'], pageBreak: 'none' }];
  spec.tags.map((tag, i) => {
    const tableContent = [
      [{ text: localize.method, style: ['small', 'b'] }, { text: localize.api, style: ['small', 'b'] }],
    ];

    tag.paths.map((path) => {
      tableContent.push([
        { text: path.method, style: ['small', 'mono', 'right'] },
        {
          margin: [0, 0, 0, 2],
          stack: [
            { text: path.path, style: ['small', 'mono'] },
            { text: path.summary, style: ['small', 'gray'] },
          ],

        },
      ]);
    });

    content.push(
      { text: tag.name, style: ['h6', 'b', 'primary', 'tableMargin'], pageBreak: i === 0 ? 'none' : 'after' },
      { text: tag.description, style: ['p'] },
      {
        table: {
          headerRows: 1,
          dontBreakRows: true,
          widths: ['auto', '*'],
          body: tableContent,
        },
        layout: rowLinesTableLayout,
        style: 'tableMargin',
      },
    );
  });

  return content;
}

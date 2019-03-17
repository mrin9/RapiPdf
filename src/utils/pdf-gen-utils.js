import { getTypeInfo, schemaToModel, schemaToPdf, removeCircularReferences} from '@/utils/common-utils';

//Info Def
export function getInfoDef(spec, bookTitle){
  let content;
  if (spec.info){
    let contactDef=[], contactName, contactEmail, contactUrl, termsOfService;

    if (spec.info.contact){
      if (spec.info.contact.name){
        contactName = {text:[{text:'Name: ', style:['b','small']}, {text:spec.info.contact.name, style:['small']}]}; 
      }
      if (spec.info.contact.email){
        contactEmail = {text:[{text:'Email: ', style:['b','small']}, {text:spec.info.contact.email, style:['small']}]};
      }
      if (spec.info.contact.url){
        contactUrl = {text:[{text:'URL: ', style:['b','small']}, {text:spec.info.contact.url, style:['small','blue'],link:spec.info.contact.url}]};
      }
      if (spec.info.termsOfService){
        termsOfService = {text:[{text:'\nTerms of service: ', style:['b','small']}, {text:spec.info.termsOfService, style:['small','blue'],link:spec.info.termsOfService}]};
      }
      contactDef= [
        {text:'CONTACT', style:['p', 'b', 'topMargin3']},
        {text:[ 
          contactName, 
          contactEmail,
          contactUrl,
          termsOfService
        ]}
      ]
    }
    content = [
      {text: bookTitle ? bookTitle:'API Reference', style:['h2', 'primary','right', 'b', 'topMargin1']},
      (spec.info.title ? {text:spec.info.title, style:['title', 'right']} : ''),
      (spec.info.version ? {text:`API Version: ${spec.info.version}`, style:['p','b', 'right', 'blue']} : ''),
      (spec.info.description ? {text:`${spec.info.description}`, style:['p', 'topMargin3']} : ''),
      ...contactDef,
      {text:'', pageBreak:'after'}
    ];

  }
  else{
    content = [
      {text:bookTitle?bookTitle:'API Reference', style:['h3', 'primary','right', 'topMargin1']}
    ];
  }
  return content;
};

//Security Def
export function getSecurityDef(spec, tableLayout){
  let content =[]
  if (spec.securitySchemes){
    content.push( {text:'Security and Authentication', style:['h3', 'b', 'primary','right', 'topMargin3'], pageBreak:'before'} );
    content.push({text:'SECURITY SCHEMES', style:['b','tableMargin']});
    let tableContent = [
      [ {text: 'TYPE', style: ['small','b']}, {text: 'DESCRIPTION', style: ['small','b']} ]
    ];
    for (const key in spec.securitySchemes) {
      tableContent.push([
        spec.securitySchemes[key].type,
        spec.securitySchemes[key].description?spec.securitySchemes[key].description:"",
      ]);
    }
  
    content.push({
      table: {
        headerRows: 1,
        body: tableContent,
      },
      layout: tableLayout,
      style: 'tableMargin'
    });
  }
  return content;
};

// API details def
export function getApiDef(spec, filterPath, sectionHeading, tableLayout){

  let content =[{text: sectionHeading, style:['h2','b'],pageBreak:'before'}];
  let tagSeq=0;

  // Sort by Tag name
  spec.tags.sort((a, b) =>  (a.name < b.name ? -1 : (a.name > b.name ? 1: 0)) );

  spec.tags.map(function(tag, i){
    let operationContent=[];
    let pathSeq = 0;

    for (let j = 0; j < tag.paths.length; j++) {
      let path = tag.paths[j];
      if (filterPath.trim()!=''){
        if (path.path.includes(filterPath) === false){
          continue;
        }
      }
      pathSeq = pathSeq + 1;
      operationContent.push({ 
        text:`${tagSeq+1}.${pathSeq} ${path.method.toUpperCase()} ${path.path}`,
        style:['topMargin3','mono','p', 'primary'],
        tocItem: true,
        tocStyle: ['small','blue','mono'],
        tocNumberStyle:['small','blue','mono'],
      });

      if (path.description || path.summary){
        operationContent.push(
          { text: path.description?path.description:path.summary? path.summary:'', style:['small'], margin:[0,5,0,5]}
        )
      }
      let requestSetDef = [];
      const pathParams   = path.parameters ? path.parameters.filter(param => param.in === 'path'):null;
      const queryParams  = path.parameters ? path.parameters.filter(param => param.in === 'query'):null;
      const headerParams = path.parameters ? path.parameters.filter(param => param.in === 'header'):null;
      const cookieParams = path.parameters ? path.parameters.filter(param => param.in === 'cookie'):null;

      const pathParamTableDef     = getParameterTableDef(pathParams, 'path',tableLayout);
      const queryParamTableDef    = getParameterTableDef(queryParams, 'query',tableLayout);
      const requestBodyTableDefs  = getRequestBodyDef(path.requestBody, tableLayout);
      const headerParamTableDef   = getParameterTableDef(headerParams, 'header',tableLayout);
      const cookieParamTableDef   = getParameterTableDef(cookieParams, 'cookie',tableLayout);

      operationContent.push({ text: 'REQUEST', style:['p', 'b', 'blue'], margin:[0, 10, 0, 0]});
      if (pathParamTableDef || queryParamTableDef || headerParamTableDef || cookieParamTableDef || requestBodyTableDefs){
        if (pathParamTableDef){
          requestSetDef.push(pathParamTableDef);
        }
        if (queryParamTableDef){
          requestSetDef.push(queryParamTableDef);
        }
        if (requestBodyTableDefs){
          requestBodyTableDefs.map(function(v){
            requestSetDef.push(v);
          });
        }
        if (headerParamTableDef){
          requestSetDef.push(headerParamTableDef);
        }
        if (cookieParamTableDef){
          requestSetDef.push(cookieParamTableDef);
        }

      }
      else{
        requestSetDef.push({ text: 'No request parameters', style:['small', 'gray'], margin:[0, 5, 0, 0]});
      }

      operationContent.push({
        stack:requestSetDef,
        margin:[10, 0, 0, 0]
      });


      let respDef = getResponseDef(path.responses, tableLayout)
      operationContent.push({ text: 'RESPONSE', style:['p', 'b', 'blue'], margin:[0, 10, 0, 0]});
      operationContent.push({
        stack:respDef,
        margin:[10, 5, 0, 5]
      });
    };

    
    if (pathSeq > 0){
      tagSeq = tagSeq + 1;
      content.push(
        { 
          text: `${tagSeq}. ${tag.name.toUpperCase()}`, 
          style:['h2', 'b', 'primary', 'tableMargin'], 
          pageBreak:tagSeq==1?'none':'before' ,
          tocItem: true,
          tocStyle: ['small', 'b'],
          tocMargin: [0, 10, 0, 0],
        },
        { text: tag.description, style:['p']},
        operationContent
      );
    }
    
  });

  return content;

}


//Request Body Def
function getRequestBodyDef(requestBody, tableLayout){
  if (!requestBody){
    return;
  }
  let content=[];
  let formParamTableDef;
  
  for(let contentType in requestBody.content ) {
    let contentTypeObj = requestBody.content[contentType];
    let requestBodyTableDef;
    if (contentType.includes('form') || contentType.includes('multipart-form')){
      formParamTableDef = getParameterTableDef(contentTypeObj.schema.properties, "FORM DATA", tableLayout);
      content.push(formParamTableDef);
    }
    else{
      let origSchema = requestBody.content[contentType].schema;
      if (origSchema){
        origSchema = JSON.parse(JSON.stringify(origSchema, removeCircularReferences()));
        requestBodyTableDef = schemaToPdf(origSchema);
        if (requestBodyTableDef && requestBodyTableDef[0] && requestBodyTableDef[0].stack){
          requestBodyTableDef[0].colSpan=undefined;
          requestBodyTableDef = {
            margin:[0,5,0,0],
            //layout:tableLayout,
            layout:'noBorders',
            table: {
              widths:['*'],
              body: [
                [{text:'REQUEST BODY '+  contentType, style:['small','b']}],
                requestBodyTableDef
              ]
            }
          };
        }
        else {
          requestBodyTableDef={text:''}
        }
      }
      content.push(requestBodyTableDef);
    }
  }
  return content;
}

//Parameter Table
function getParameterTableDef(parameters, paramType, tableLayout){
  //let filteredParams= parameters ? parameters.filter(param => param.in === paramType):[];
  if (parameters.length == 0 ){
    return;
  }
  let tableContent = [
    [ 
      {text: 'NAME', style: ['sub','b','blue']}, 
      {text: 'TYPE', style: ['sub','b','blue']},
      {text: 'DESCRIPTION', style: ['sub','b','blue']}
    ]
  ];
  
  if (paramType ===  "FORM DATA"){

    for (let paramName in parameters){
      const param = parameters[paramName];
      let type = param.type;
      let format=param.format==='binary' ?'(binary)':''
      if (type==='array'){
        type = "array of " + param.items.type;
      }
      tableContent.push([
        { text:paramName, style:['small','mono'] },
        { text:type + format, style:['small','mono'] },
        { text:param.description, style:['small'],margin:[0,2,0,0]},
      ]);  
    }

  }
  else{
    parameters.map(function(param){
      let paramSchema = getTypeInfo(param.schema);
      tableContent.push([
        { 
          text:[
            {text:paramSchema.required?'*':'', style:['small','b','red','mono'] },
            {text:param.name, style:['small','mono'] },
            (paramSchema.depricated ?{text:'\nDEPRICATED',style:['small','red','b'] }:undefined)
          ]
        },
        {
          stack:[
            { text: `${paramSchema.type==='array' ? paramSchema.arrayType:paramSchema.type}${paramSchema.format ? `(${paramSchema.format})`:'' }`, style:['small','mono']},
            ( paramSchema.constrain ? { text: paramSchema.constrain, style:['small', 'gray']}:''),
            ( paramSchema.allowedValues ? { text:[
                {text: 'allowed: ', style:['b','small']},
                {text: paramSchema.allowedValues, style:['small', 'gray']}
              ]} : ''
            ),
            ( paramSchema.pattern ? { text: `pattern: ${paramSchema.pattern}`, style:['small','gray']}:''),
          ]
        },
        { text:param.description, style:['small'],margin:[0,2,0,0]},
      ]);
    });
  }

  return [
    {text: `${paramType} Parameters`.toUpperCase(), style:['small', 'b'], margin:[0,10,0,0]},
    {
      table: {
        headerRows: 1,
        dontBreakRows: true,
        widths: ['auto', 'auto', '*'],
        body: tableContent
      },
      layout: tableLayout,
      style: 'tableMargin'
    }
  ];

}

//Response Def
function getResponseDef(responses, tableLayout){
  let respDef=[];
  let allResponseModelTabelDefs=[];
  for(let statusCode in responses) {
    for(let contentType in responses[statusCode].content ) {
      let reponseModelTableDef;
      let origSchema = responses[statusCode].content[contentType].schema;
      if (origSchema){
        origSchema = JSON.parse(JSON.stringify(origSchema, removeCircularReferences()));
        reponseModelTableDef = schemaToPdf(origSchema);
        if (reponseModelTableDef && reponseModelTableDef[0] && reponseModelTableDef[0].stack){
          reponseModelTableDef[0].colSpan=undefined;
          reponseModelTableDef = {
            margin:[0,5,0,0],
            //layout:tableLayout,
            layout:'noBorders',
            table: {
              widths:['*'],
              body: [
                [{text:`RESPONSE MODEL (${contentType})`,style:['small','b']}],
                reponseModelTableDef
              ]
            }
          };
          allResponseModelTabelDefs.push(reponseModelTableDef);
        }
      }
    }

    respDef.push({
      text:[
        {text: `STATUS CODE - ${statusCode}: `, style:['small', 'b']},
        {text: responses[statusCode].description, style:['small']}
      ],
      margin:[0,10,0,0]
    });

    allResponseModelTabelDefs.map(function(respModelTableDef){
      respDef.push(respModelTableDef);
    })
  }
  return respDef;
}

//API List Def
export function getApiListDef(spec, sectionHeading, tableLayout){
  let content =[{text: sectionHeading, style:['h3','b'],pageBreak:'before'}];
  spec.tags.map(function(tag, i){
    let tableContent = [
      [ {text: 'METHOD', style: ['small','b']}, {text: 'API', style: ['small','b']}]
    ];
    tag.paths.map(function(path){
      tableContent.push([
        { text:path.method, style:['small','mono','right'] },
        {
          margin:[0,0,0,2],
          stack:[
            { text:path.path, style:['small','mono']},
            { text:path.summary, style:['small','gray']},
          ]

        }
      ]);
    });

    content.push(
      {text: tag.name, style:['h6','b','primary','tableMargin'], pageBreak:i==0?'none':'before'},
      {text: tag.description, style:['p']},
      {
        table: {
          headerRows: 1,
          dontBreakRows: true,
          widths: ['auto', '*'],
          body: tableContent
        },
        layout: tableLayout,
        style: 'tableMargin'
      }
    );
  });

  return content;
}

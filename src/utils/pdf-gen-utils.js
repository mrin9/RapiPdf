import marked from 'marked';
import { getTypeInfo, schemaToModel, schemaToPdf, removeCircularReferences} from '@/utils/common-utils';

//Info Def
export function getInfoDef(spec, bookTitle, localize){
  let content;
  if (spec.info){
    let contactDef=[], contactName, contactEmail, contactUrl, termsOfService;
    if (spec.info.contact){
      if (spec.info.contact.name){
        contactName = {text:[{text:`\n${localize.name}: `, style:['b','small']}, {text:spec.info.contact.name, style:['small']}]}; 
      }
      if (spec.info.contact.email){
        contactEmail = {text:[{text:`\n${localize.email}: `, style:['b','small']}, {text:spec.info.contact.email, style:['small']}]};
      }
      if (spec.info.contact.url){
        contactUrl = {text:[{text:`\n${localize.url}: `, style:['b','small']}, {text:spec.info.contact.url, style:['small','blue'],link:spec.info.contact.url}]};
      }
      if (spec.info.termsOfService){
        termsOfService = {text:[{text:`\n${localize.termsOfService}: `, style:['b','small']}, {text:spec.info.termsOfService, style:['small','blue'],link:spec.info.termsOfService}]};
      }
      contactDef= [
        {text:localize.contact, style:['p', 'b', 'topMargin3']},
        {text:[ 
          contactName, 
          contactEmail,
          contactUrl,
          termsOfService
        ]},
      ]
    }

    let specInfDescrMarkDef;
    if (spec.info.description){
      let tokens = marked.lexer(spec.info.description);
      specInfDescrMarkDef = {
        stack: getMarkDownDef(tokens),
        style: ['topMargin3']
      }
    }
    else{
      specInfDescrMarkDef='';
    }

    content = [
      {text: bookTitle ? bookTitle:localize.apiReference, style:['h2', 'primary','right', 'b', 'topMargin1']},
      (spec.info.title ? {text:spec.info.title, style:['title', 'right']} : ''),
      (spec.info.version ? {text:`${localize.apiVersion}: ${spec.info.version}`, style:['p','b', 'right', 'alternate']} : ''),
      specInfDescrMarkDef,
      ...contactDef,
      {text:'', pageBreak:'after'},
    ];
  }
  else{
    content = [
      {text:bookTitle?bookTitle:apiVersion.apiReference, style:['h1', 'bold', 'primary','right', 'topMargin1']},
      {text:'', pageBreak:'after'},
    ];
  }
  return content;
}

//Security Def
export function getSecurityDef(spec, tableLayout, localize){
  let content =[];
  if (spec.securitySchemes){
    content.push( {text:localize.securityAndAuthentication, style:['h3', 'b', 'primary','right', 'topMargin3']} );
    content.push({text:localize.securitySchemes, style:['b','tableMargin']});
    let tableContent = [
      [ {text: localize.type, style: ['small','b']}, {text: localize.description, style: ['small','b']} ]
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
      style: 'tableMargin',
      pageBreak:'after'
    });
    
  }
  return content;
}

// API details def
export function getApiDef(spec, filterPath, sectionHeading, tableLayout, localize){
  let content =[{text: sectionHeading, style:['h2','b']}];
  let tagSeq=0;

  // Sort by Tag name (allready sorted)
  // spec.tags.sort((a, b) =>  (a.name < b.name ? -1 : (a.name > b.name ? 1: 0)) );

  spec.tags.map(function(tag, i){
    let operationContent=[];
    let pathSeq = 0;

    for (let j = 0; j < tag.paths.length; j++) {
      let path = tag.paths[j];
      if (filterPath.trim() !== ''){
        if (path.path.includes(filterPath) === false){
          continue;
        }
      }
      pathSeq = pathSeq + 1;
      operationContent.push({ 
        text:`${tagSeq+1}.${pathSeq} ${path.method.toUpperCase()} ${path.path}`,
        style:['topMargin3','mono','p', 'primary','b'],
        tocItem: true,
        tocStyle: ['small','blue','mono'],
        tocNumberStyle:['small','blue','mono'],
      });
      operationContent.push({text:'', style:['topMarginRegular']})

      let pathSummaryMarkDef, pathDescrMarkDef, tokens;
      if (path.summary){
        tokens = marked.lexer(path.summary);
        pathSummaryMarkDef = {
          stack: getMarkDownDef(tokens),
          style:['primary', 'b'],
        }
        operationContent.push(pathSummaryMarkDef);
      }
      if (path.description && path.description.trim() !== path.summary.trim()) {
        tokens = marked.lexer(path.description);
        pathDescrMarkDef = {
          stack: getMarkDownDef(tokens),
        }
        operationContent.push(pathDescrMarkDef);
      }
      
      let requestSetDef = [];
      const pathParams   = path.parameters ? path.parameters.filter(param => param.in === 'path'):null;
      const queryParams  = path.parameters ? path.parameters.filter(param => param.in === 'query'):null;
      const headerParams = path.parameters ? path.parameters.filter(param => param.in === 'header'):null;
      const cookieParams = path.parameters ? path.parameters.filter(param => param.in === 'cookie'):null;

      const pathParamTableDef     = getParameterTableDef(pathParams, 'path',tableLayout, localize);
      const queryParamTableDef    = getParameterTableDef(queryParams, 'query',tableLayout, localize);
      const requestBodyTableDefs  = getRequestBodyDef(path.requestBody, tableLayout, localize);
      const headerParamTableDef   = getParameterTableDef(headerParams, 'header',tableLayout, localize);
      const cookieParamTableDef   = getParameterTableDef(cookieParams, 'cookie',tableLayout, localize);
      operationContent.push({ text: localize.request, style:['p', 'b', 'alternate'], margin:[0, 10, 0, 0]});
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
        requestSetDef.push({ text: localize.noRequestParameters, style:['small', 'gray'], margin:[0, 5, 0, 0]});
      }

      operationContent.push({
        stack:requestSetDef,
        margin:[10, 0, 0, 0]
      });
      let respDef = getResponseDef(path.responses, tableLayout, localize);

      operationContent.push({ text: localize.response, style:['p', 'b', 'alternate'], margin:[0, 10, 0, 0]});
      operationContent.push({
        stack:respDef,
        margin:[10, 5, 0, 5]
      });
      operationContent.push({canvas: [{ type: 'line', x1: 0, y1: 5, x2: 595-2*35, y2: 5, lineWidth: 0.5, lineColor: '#cccccc' }]});
    }

    
    if (pathSeq > 0){
      tagSeq = tagSeq + 1;
      let tagDescrMarkDef, tokens;
      if (tag.description) {
        tokens = marked.lexer(tag.description);
        tagDescrMarkDef = {
          stack: getMarkDownDef(tokens),
          style:['topMarginRegular'],
        }
      }
      else{
        tagDescrMarkDef={text:''}
      }

      //tag.description = tag.description.replace(/ /g, '\u200B ');
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
        {text:'', pageBreak:'after'}
      );
    }
    
  });
  return content;
}


//Request Body Def
function getRequestBodyDef(requestBody, tableLayout, localize){
  if (!requestBody){
    return;
  }
  let content=[];
  let formParamTableDef;
  
  for(let contentType in requestBody.content ) {
    let contentTypeObj = requestBody.content[contentType];
    let requestBodyTableDef;
    if ( (contentType.includes('form') || contentType.includes('multipart-form')) && contentTypeObj.schema ){
      formParamTableDef = getParameterTableDef(contentTypeObj.schema.properties, "FORM DATA", tableLayout, localize);
      content.push(formParamTableDef);
    }
    else{
      let origSchema = requestBody.content[contentType].schema;
      if (origSchema){
        origSchema = JSON.parse(JSON.stringify(origSchema, removeCircularReferences()));
        requestBodyTableDef = schemaToPdf(origSchema, localize);
        if (requestBodyTableDef && requestBodyTableDef[0] && requestBodyTableDef[0].stack){
          requestBodyTableDef[0].colSpan=undefined;
          requestBodyTableDef = {
            margin:[0,5,0,0],
            //layout:tableLayout,
            layout:'noBorders',
            table: {
              widths:['*'],
              body: [
                [{text:`${localize.requestBody} (${contentType})`, style:['small','b']}],
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
function getParameterTableDef(parameters, paramType, tableLayout, localize){
  //let filteredParams= parameters ? parameters.filter(param => param.in === paramType):[];
  if (parameters.length === 0 ){
    return;
  }
  let tableContent = [
    [ 
      {text: localize.name, style: ['sub', 'b', 'alternate']}, 
      {text: localize.type, style: ['sub', 'b', 'alternate']},
      {text: localize.description, style: ['sub', 'b', 'alternate']}
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
        { text:paramName, style:['small', 'mono'] },
        { text:type + format, style:['small', 'mono' ] },
        { text:param.description, style:['small'], margin:[0,2,0,0]},
      ]);  
    }

  }
  else{
    parameters.map(function(param){
      let paramSchema = getTypeInfo(param.schema);
      tableContent.push([
        { 
          text:[
            {text:param.required?'*':'', style:['small','b','red','mono'] },
            {text:param.name, style:['small','mono'] },
            (paramSchema.depricated ?{text:'\n'+localize.deprecated, style:['small','red','b'] }:undefined)
          ]
        },
        {
          stack:[
            { text: `${paramSchema.type==='array' ? paramSchema.arrayType:paramSchema.type}${paramSchema.format ? `(${paramSchema.format})`:'' }`, style:['small','mono']},
            ( paramSchema.constrain ? { text: paramSchema.constrain, style:['small', 'gray']}:''),
            ( paramSchema.allowedValues ? { text:[
                {text: localize.allowed+': ', style:['b','sub']},
                {text: paramSchema.allowedValues, style:['small', 'lightGray']}
              ]} : ''
            ),
            ( paramSchema.pattern ? { text: `${localize.pattern}: ${paramSchema.pattern}`, style:['small','gray']}:''),
          ]
        },
        { text:param.description, style:['small'],margin:[0,2,0,0]},
      ]);
    });
  }

  return [
    {text: `${paramType} ${localize.parameters}`.toUpperCase(), style:['small', 'b'], margin:[0,10,0,0]},
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
function getResponseDef(responses, tableLayout, localize){
  let respDef=[];
  let allResponseModelTabelDefs=[];
  for(let statusCode in responses) {
    for(let contentType in responses[statusCode].content ) {
      let reponseModelTableDef;
      let origSchema = responses[statusCode].content[contentType].schema;
      if (origSchema){
        origSchema = JSON.parse(JSON.stringify(origSchema, removeCircularReferences()));
        reponseModelTableDef = schemaToPdf(origSchema, localize);
        if (reponseModelTableDef && reponseModelTableDef[0] && reponseModelTableDef[0].stack){
          reponseModelTableDef[0].colSpan = undefined;
          reponseModelTableDef = {
            margin:[0,5,0,0],
            //layout:tableLayout,
            layout:'noBorders',
            table: {
              widths:['*'],
              body: [
                [{text:`${localize.responseModel} (${contentType})`,style:['small','b']}],
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
        {text: `${localize.statusCode} - ${statusCode}: `, style:['small', 'b']},
        {text: responses[statusCode].description, style:['small']}
      ],
      margin:[0,10,0,0]
    });

    if (responses[statusCode].content){
      allResponseModelTabelDefs.map(function(respModelTableDef){
        respDef.push(respModelTableDef);
      })
    }
  }
  
  return respDef;
}

//API List Def
export function getApiListDef(spec, sectionHeading, tableLayout, localize) {
  let content =[{text: sectionHeading, style:['h3','b'],pageBreak:'none'}];
  spec.tags.map(function(tag, i){
    let tableContent = [
      [ {text: localize.method, style: ['small','b']}, {text: localize.api, style: ['small','b']}]
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
      {text: tag.name, style:['h6','b','primary','tableMargin'], pageBreak: i === 0 ? 'none' : 'after'},
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

export function getMarkDownDef(tokens){
  let content = [];
  let uList={ ul:[], style:['topMarginRegular'] };
  let oList={ ol:[], style:['topMarginRegular'] };
  let listInsert='';
  
  tokens.forEach(function(v){
    if (v.type==='paragraph'){
      let textArr = getInlineMarkDownDef(v.text);
      content.push({
        text:textArr,
        style:['topMarginRegular']
      });
    }
    else if (v.type==='heading'){
      let headingStyle = [];
      if (v.depth===6){
        headingStyle=['small','b','topMarginRegular'];
      }
      else if (v.depth===5){
        headingStyle=['p','b','topMarginRegular'];
      }
      else{
        headingStyle.push(`h${v.depth+2}`);
        headingStyle.push('topMarginRegular');
      }

      content.push({
        text:v.text,
        style:headingStyle
      });
    }
    else if (v.type==='space'){
      let headingStyle = [];
      headingStyle.push(`h${v.depth}`);
      content.push({
        text:'\u200B ',
        style:['small','topMarginRegular'],
      });
    }
    else if (v.type==='code'){
      let newText = v.text.replace(/ /g, '\u200B ');
      content.push({
        text:newText,
        style:['small', 'mono', 'gray','topMarginRegular'],
      });
    }
    else if (v.type==='list_start'){
      listInsert= v.ordered?'ol':'ul';
      if (v.ordered){
        listInsert='ol';
        oList.start =  v.start;
      }
      else{
        listInsert= 'ul';
      }
    }
    else if (v.type==='list_item_start' || v.type==='list_item_end'){
      
    }
    else if (v.type==='text'){
      let textArr = getInlineMarkDownDef(v.text);
      if (listInsert==='ul'){
        uList.ul.push({
          text:textArr
        });
      }
      else if (listInsert==='ol'){
        oList.ol.push({
          text:textArr
        });
      }
    }
    else if (v.type==='list_end'){
      // Clone the appropriate list and add it to the main content 
      if (listInsert==='ul'){
        content.push(
          Object.assign({}, uList)
        );
      }
      else if (listInsert==='ol'){
        content.push(
          Object.assign({}, oList)
        );
      }
      // reset temp list elements 
      uList={ ul:[], style:['topMarginRegular'] };
      oList={ ol:[], style:['topMarginRegular'] };
      listInsert='';
    }
  });
  return content;
}

export function getInlineMarkDownDef(txt){
  var final=[];
  if (!txt){
    return [];
  }
  let boldItalicDelimiter = new RegExp("\\*{3}|\\_{3}");
  let boldDelimiter = new RegExp("\\*{2}|\\_{2}");
  let codeDelimiter = new RegExp("`");
  if (!txt.split){
    console.log(txt);
  }
  let bi_parts = txt.split(boldItalicDelimiter);
  bi_parts.forEach(function(bi_val,i){
    if (i%2 === 0){
      if (bi_val){
        let b_parts = bi_val.split(boldDelimiter);
        b_parts.forEach(function(b_val,j){
          if (j%2 === 0){
            if (b_val){
              let c_parts = b_val.split(codeDelimiter);
              c_parts.forEach(function(c_val,k){
                if (k%2 === 0){
                  if (c_val){
                    final.push({ text:c_val,style:['small']});
                  }
                }
                else{
                  if (c_val.trim){
                    final.push({ text:c_val,style:['small','mono', 'gray']});
                  }
                }
              });

            }
          }
          else{
            if (b_val){
              final.push({text:b_val,style:['small','bold']});
            }
          }
        });
      }
    }
    else{
      if(bi_val){
        final.push({ text:bi_val, style:['small','bold', 'italics']});
      }
    }
  });
  return final;
}
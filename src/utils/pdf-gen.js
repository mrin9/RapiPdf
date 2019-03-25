import pdfMake from "pdfmake/build/pdfmake.min.js";
import pdfFonts from "@/utils/vfs_fonts";
//import pdfFonts from "pdfmake/build/vfs_fonts";

import ProcessSpec from '@/utils/parse-utils';
import { getInfoDef, getSecurityDef, getApiDef, getApiListDef, getMarkDownDef } from '@/utils/pdf-gen-utils';

export default async function createPdf(specUrl, options){

  let parsedSpec = await ProcessSpec(specUrl);

  let pdfStyles={
    title:{fontSize:32},
    h1:{ fontSize:22 },
    h2:{ fontSize:20 },
    h3:{ fontSize:18 },
    h4:{ fontSize:16 },
    h5:{ fontSize:14 },
    h6:{ fontSize:12, bold:true },
    p:{fontSize:12 },
    small:{fontSize:10},
    sub:{fontSize:8},
    right: {alignment: 'right'},
    left: {alignment: 'left'},
    topMargin1: { margin:[0, 180, 0, 10]},
    topMargin2: { margin:[0, 60, 0, 5]},
    topMargin3: { margin:[0, 20, 0, 3]},
    topMargin4: { margin:[0, 15, 0, 3]},
    topMarginRegular: { margin:[0, 3, 0, 0]},
    tableMargin:{ margin: [0, 5, 0, 15]},
    b:{bold: true},
    i:{italics: true},
    primary:{color: (options.pdfPrimaryColor ? options.pdfPrimaryColor:'#b44646')},
    alternate:{color: (options.pdfAlternateColor ? options.pdfAlternateColor:'#005b96')},
    gray:{color: 'gray'},
    red:{color:  'orangered'},
    blue:{color: '#005b96'},
    mono:{font:  'RobotoMono', fontSize:10},
  };

  let rowLinesTableLayout= {
    hLineWidth: function (i, node) {
      return (i === 1 || i === node.table.body.length) ? 1 : 0.5;
    },
    vLineWidth:function(i,node){
      return 0;
    },
    hLineColor: function (i, node) {
      return (i === 0 || i === 1 || i === node.table.body.length) ? 'black' : 'lightgray';
    },
  }

  let rowLinesOnlyTableLayout= {
    hLineWidth: function (i, node) {
      return (i === 0 || i === node.table.body.length) ? 1 : 0.5;
    },
    vLineWidth:function(i,node){
      return 0;
    },
    hLineColor: function (i, node) {
      return (i === 0 || i === node.table.body.length) ? 'black' : 'lightgray';
    },
  }
  let allContent=[], infoDef={}, tocDef={}, securityDef={}, apiListDef={}, apiDef={};

  if (options.includeInfo){
    infoDef = getInfoDef(parsedSpec, options.pdfTitle);
    allContent.push(infoDef);
  }
  if (options.includeToc){
    tocDef = {
      toc: {
        title: {text: 'INDEX', style:['b', 'h2']},
        numberStyle: {bold: true},
        style:['small'],
      },
      pageBreak:'after'
    }
    allContent.push(tocDef);
  }
  if (options.includeSecurity){
    securityDef = getSecurityDef(parsedSpec, rowLinesTableLayout);
    allContent.push(securityDef);
  }
  if (options.includeApiDetails){
    apiDef = getApiDef(parsedSpec, '', 'API', rowLinesTableLayout, rowLinesOnlyTableLayout);
    allContent.push(apiDef);
  }
  if (options.includeApiList){
    apiListDef =getApiListDef(parsedSpec, "API List", rowLinesTableLayout);
    allContent.push(apiListDef);
  }

  let finalDocDef = {
    footer: function(currentPage, pageCount) { 
      return { 
        margin:10,
        columns:[
          {text:options.pdfFooterText, style:["sub", "gray","left"]},
          {text:`${currentPage} of ${pageCount}`, style:["sub", "gray","right"]}
        ]
      };
    },
    content:allContent,
    styles:pdfStyles
  }


  pdfMake.fonts = {
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-Medium.ttf'
    },
    RobotoMono: {
      normal: 'RobotoMono-Regular.ttf',
      bold: 'RobotoMono-Regular.ttf',
      italics: 'RobotoMono-Regular.ttf',
      bolditalics: 'RobotoMono-Regular.ttf',
    },

  };
  //pdfMake.vfs = pdfFonts.pdfMake.vfs;
  pdfMake.vfs = pdfFonts;
  pdfMake.createPdf(finalDocDef).open();
}
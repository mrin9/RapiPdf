// Inline Markdown
export function getInlineMarkDownDef(txt) {
  const final = [];
  if (!txt) {
    return [];
  }
  const boldItalicDelimiter = new RegExp('\\*{3}|\\_{3}');
  const boldDelimiter = new RegExp('\\*{2}|\\_{2}');
  const codeDelimiter = new RegExp('`');
  const biParts = txt.split(boldItalicDelimiter);
  biParts.forEach((biVal, i) => {
    if (i % 2 === 0) {
      if (biVal) {
        const bParts = biVal.split(boldDelimiter);
        bParts.forEach((bVal, j) => {
          if (j % 2 === 0) {
            if (bVal) {
              const cParts = bVal.split(codeDelimiter);
              cParts.forEach((cVal, k) => {
                if (k % 2 === 0) {
                  if (cVal) {
                    final.push({ text: cVal, style: ['small'] });
                  }
                } else if (cVal.trim) {
                  final.push({ text: cVal, style: ['small', 'mono', 'gray'] });
                }
              });
            }
          } else if (bVal) {
            final.push({ text: bVal, style: ['small', 'bold'] });
          }
        });
      }
    } else if (biVal) {
      final.push({ text: biVal, style: ['small', 'bold', 'italics'] });
    }
  });
  return final;
}

// Markdown
export function getMarkDownDef(tokens) {
  const content = [];
  let uList = { ul: [], style: ['topMarginRegular'] };
  let oList = { ol: [], style: ['topMarginRegular'] };
  let listInsert = '';

  tokens.forEach((v) => {
    if (v.type === 'paragraph') {
      const textArr = getInlineMarkDownDef(v.text);
      content.push({
        text: textArr,
        style: ['topMarginRegular'],
      });
    } else if (v.type === 'heading') {
      let headingStyle = [];
      if (v.depth === 6) {
        headingStyle = ['small', 'b', 'topMarginRegular'];
      } else if (v.depth === 5) {
        headingStyle = ['p', 'b', 'topMarginRegular'];
      } else {
        headingStyle.push(`h${v.depth + 2}`);
        headingStyle.push('topMarginRegular');
      }

      content.push({
        text: v.text,
        style: headingStyle,
      });
    } else if (v.type === 'space') {
      const headingStyle = [];
      headingStyle.push(`h${v.depth}`);
      content.push({
        text: '\u200B ',
        style: ['small', 'topMarginRegular'],
      });
    } else if (v.type === 'code') {
      const newText = v.text.replace(/ /g, '\u200B ');
      content.push({
        text: newText,
        style: ['small', 'mono', 'gray', 'topMarginRegular'],
      });
    } else if (v.type === 'list_start') {
      listInsert = v.ordered ? 'ol' : 'ul';
      if (v.ordered) {
        listInsert = 'ol';
        oList.start = v.start;
      } else {
        listInsert = 'ul';
      }
    } else if (v.type === 'text') {
      const textArr = getInlineMarkDownDef(v.text);
      if (listInsert === 'ul') {
        uList.ul.push({
          text: textArr,
        });
      } else if (listInsert === 'ol') {
        oList.ol.push({
          text: textArr,
        });
      }
    } else if (v.type === 'list_end') {
      // Clone the appropriate list and add it to the main content
      if (listInsert === 'ul') {
        content.push(
          { ...uList },
        );
      } else if (listInsert === 'ol') {
        content.push(
          { ...oList },
        );
      }
      // reset temp list elements
      uList = { ul: [], style: ['topMarginRegular'] };
      oList = { ol: [], style: ['topMarginRegular'] };
      listInsert = '';
    }
  });
  return content;
}

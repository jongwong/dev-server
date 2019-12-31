export const moveComments = str => {
  str = str.replace(/(?:^|\n|\r)\s*\/\*[\s\S]*?\*\/\s*(?:\r|\n|$)/g, "");
  str = str.replace(/[/][/].*/g, "");
  return str;
};
export const getCurlyBracesContent = str => {
  return str.slice(str.indexOf("{"), str.lastIndexOf("}"));
};

export const toStandardJSONString = str => {
  return str.replace(/([\$\w]+)\s*:/g, function(_, $1) {
    return '"' + $1 + '":';
  });
};

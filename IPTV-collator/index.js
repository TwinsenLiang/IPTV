const fs = require('fs');
const path = require('path');

function iptvCollator(options) {
  const { input, output, isSort = false } = options;

  const iptvFile = fs.readFileSync(path.resolve(__dirname, input), 'utf8');
  const genreList = iptvFile.split(/(.*,#genre#)/);

  const collated = {};

  genreList.forEach((item, index) => {
    if (!item) {
      return true;
    }
    if (/(.*,#genre#)/.test(item)) {
      if (!collated[item]) {
        collated[item] = {};
      }
    } else {
      // 避免相同 genre 的被覆盖
      collated[genreList[index - 1]] = {
        ...collated[genreList[index - 1]],
        ...collateGenreList(item, isSort),
      };
    }
  });

  // 写入文件
  fs.writeFileSync(path.resolve(__dirname, output), jsonToText(collated), 'utf8');

  console.log(`\x1b[32m%s\x1b[0m`, `\n已成功整理文件到 ${path.resolve(__dirname, output)}`);
}

function collateGenreList(text, isSort = false) {
  const data = text.split('\n').filter((item) => item);
  const result = {};
  data.forEach((item, index) => {
    const matches = item.split(',');
    // 过滤掉重复的 url
    if (matches && matches.length >= 2 && Object.values(result).indexOf(matches[1]) === -1) {
      // 避免同一电视台的不同源被覆盖
      if (result[matches[0]]) {
        result[`${matches[0]}$$$${index}`] = matches[1];
      } else {
        result[matches[0]] = matches[1];
      }
    } else {
      console.log('发现重复::::', item);
    }
  });

  // 重新排序
  const sortedResult = Object.keys(result)
    .sort()
    .reduce(
      (acc, key) => ({
        ...acc,
        [key]: result[key],
      }),
      {},
    );

  return isSort ? sortedResult : result;
}

function jsonToText(json) {
  const result = [];
  Object.keys(json).forEach((key) => {
    result.push(`\n\n${key}\n`);
    for (const [subKey, value] of Object.entries(json[key])) {
      result.push(`${subKey.replace(/\$\$\$\d+$/, '')},${value}`);
    }
  });
  return result.join('\n').trim();
}

iptvCollator({
  input: './src/IPTV.txt',
  output: '../IPTV.txt',
  isSort: true, //重新排序
});

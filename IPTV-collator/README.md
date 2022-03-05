# 整理 IPTV.txt 文件

## 需求
- 文中分组以“#genre#”结尾，不可调整。
- 全文格式均为“名称，url”单行制
- 区别“url”相同的做去重删除。
- 名称相近，如“名称1”，“名称2”进行同类排序，过程中不影响分组。

## 实现
```js
iptvCollator({
  input: './src/IPTV.txt', // 要整理的 iptv 文件
  output: '../IPTV.txt', // 整理后输出文件的位置
  isSort: true, // 重新排序
});
```

在本目录执行

```
node index.js
```

## merge.js

用于合并两个 IPTV.txt 文件. 基于 URL 进行排重判断.

用法:

```shell
node merge.js ../IPTV.txt src/20220305.txt merged.txt
```

`../IPTV.txt` 和 `src/20220305.txt` 为合并用的文件路径, `merged.txt` 为合并结果的输出路径.

推荐工作流:

1. 把新的 IPTV.txt 源文件放置到 src 目录之中, 并且以时间戳进行重命名便于整理和归档
2. 合并输出到新文件: `node merge.js ../IPTV.txt src/20220305.txt merged.txt`
3. 确认新的文件可用后, 覆盖现有的 IPTV.txt 文件
4. commit 提交
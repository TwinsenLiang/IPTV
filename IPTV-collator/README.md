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

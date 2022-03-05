const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');

function parseLine(line) {
  const chunks = line.trim().split(',')
  if (chunks.length === 2) {
    return {
      isValid: true,
      name: chunks[0],
      url: chunks[1],
      isHeading: chunks[1] === '#genre#',
    }
  }
  return {
    isValid: false,
  }
}

function parse(rawText) {
  const result = rawText.split('\n').map(parseLine).filter(i => i.isValid).reduce(
    (sections, item) => {
      if (item.isHeading) {
        if (!sections.groups[item.name]) {
          sections.groups[item.name] = []
          sections.current = item.name;
        }
      } else {
        sections.groups[sections.current].push({
          name: item.name,
          url: item.url.trim(),
        })
      }
      return sections
    },
    {
      groups: {},
      current: 'ungrouped',
    }
  )
  return result.groups
}

/**
 * 合并策略:
 * - 如果 a 和 b 同时存在, 则 b 优先
 * - 如果 b 存在, 但 a 不存在, 则 b 优先
 * - 如果 a 存在, 但 b 不存在, 条目作废
 */
function merge(a, b) {
  const unionKeys = Object.keys(a).concat(Object.keys(b)).filter((v, i, s) => s.indexOf(v) === i)
  const result = {}
  for (const key of unionKeys) {
    result[key] = []
    let a_items = a[key] ? new Set(a[key].map(i => i.url)) : new Set()
    let b_items = b[key] ? new Set(b[key].map(i => i.url)) : new Set()
    let c_items = new Set()
    if (b_items.size === 0) {
      // deepcopy > soft-reference
      result[key] = [...a[key]]
      continue
    } else if (a_items.size === 0) {
      // deepcopy > soft-reference
      result[key] = [...b[key]]
      continue
    } else {
      for (const item of a_items) {
        if (b_items.has(item)) {
          c_items.add(item)
        }
      }
      for (const item of b_items) {
        if (!c_items.has(item)) {
          c_items.add(item)
        }
      }
      // finalize
      for (const item of a[key]) {
        if (c_items.has(item.url)) {
          result[key].push(item)
          c_items.delete(item.url)
        }
      }
      for (const item of b[key]) {
        if (c_items.has(item.url)) {
          result[key].push(item)
          c_items.delete(item.url)
        }
      }
    }
  }
  return result
}

function toString(groups) {
  const lines = []
  for (const key of Object.keys(groups)) {
    lines.push(`${key},#genre#`)
    groups[key].forEach(item => {
      lines.push(`${item.name},${item.url}`)
    })
  }
  return lines.join('\n')
}


function main(path_1, path_2, output_path) {
  let rawText_1 = null;
  let rawText_2 = null;
  try {
    rawText_1 = fs.readFileSync(path_1, 'utf8')
  } catch (e) {
    console.error(`File ${path_1} not exists.`)
    process.exit(1)
  }
  try {
    rawText_2 = fs.readFileSync(path_2, 'utf8')
  } catch (e) {
    console.error(`File ${path_2} not exists.`)
    process.exit(1)
  }
  const group1 = parse(rawText_1)
  const group2 = parse(rawText_2)
  const merged = merge(group1, group2)
  const text = toString(merged)
  try {
    fs.writeFileSync(output_path, text)
    console.log(`File ${output_path} saved.`)
  } catch (e) {
    console.error(`Save to ${output_path} failed: ${e}`)
    process.exit(1)
  }
}

if (process.argv.length !== 5) {
  console.log(`Usage: node ${process.argv[1]} path/to/IPTV_1.txt path/to/IPTV_2.txt output_file_path`)
  process.exit(1)
}
main(process.argv[2], process.argv[3], process.argv[4])
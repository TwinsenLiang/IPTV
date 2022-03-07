const fs = require('fs');
const path = require('path');
const leven = require('./levenshetein');

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

function sort(lst) {
  const copy = new Set([...lst])
  const result = []
  console.log('sort: ', lst.length, copy.size)
  for (const item of copy) {
    console.log('sort: ', item.name)
    if (item.name === '日本PPV-1') {
      console.log(item)
    }
    const arr1 = Array.from(copy).map(i => {
      const distanceScore = leven.distance(item.name, i.name)
      let prefixScore = 3
      if (item.name.trim() !== i.name.trim()) {
        let c = 0
        const [left, right] = item.name.length > i.name ? [item.name, i.name] : [i.name, item.name]
        for (let i = 0; i < left.length; i++) {
          if (left[i] === right[i]) {
            c++
            continue
          }
          break
        }
        prefixScore = c / left.length
      }
      return [distanceScore * prefixScore, i]
    }).filter(i => {
      return i[0] !== 0 && (i[0] < item.name.length && i[0] < i[1].name.length)
    })
    // const arr2 = arr1.map(i => [i[1].name, i[1]])
    arr1.sort((i, j) => {
      if (i[0] < j[0]) return -1
      if (i[0] > j[0]) return 1
      return 0
    })
    arr1.forEach(i => {
      copy.delete(i[1])
      result.push(i[1])
    })
  }
  return result
}

function sort2(lst) {
  const copy = [...lst]
  copy.sort((i, j) => i.name.localeCompare(j.name))
  return copy
}

function sort3(lst) {
  const shader = new WeakMap()
  const result = []
  for (let i = 0; i < lst.length; i++) {
    if (shader.has(lst[i])) {
      continue
    }
    const item = lst[i]
    let similar = lst.slice(i + 1).filter(o => !shader.has(o)).map(j => {
      const distanceScore = leven.distance(item.name, j.name)
      let prefixScore = 6
      if (item.name.trim() !== j.name.trim()) {
        let c = 0
        const [left, right] = item.name.length > j.name.length ? [item.name, j.name] : [j.name, item.name]
        for (let k = 0; k < left.length; k++) {
          if (left[k] === right[k]) {
            c++
            continue
          }
          break
        }
        prefixScore = c / left.length
      }
      return [distanceScore * prefixScore, j]
    }).filter(x => {
      return (x[0] < item.name.length && x[0] < x[1].name.length)
    })
    similar = similar.map(y => [y[1].name, y[1]])
    similar = similar.concat([[item.name, item]])
    similar.sort()
    similar.forEach(i => {
      result.push(i[1]);
      shader.set(i[1], 1)
    })
  }
  return result;
}

function toString(groups) {
  const lines = []
  for (const key of Object.keys(groups)) {
    lines.push(`${key},#genre#`)
    groups[key].forEach(item => {
      lines.push(`${item.name},${item.url}`)
    })
    lines.push("\n")
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
  const sorted = {}
  for (const key of Object.keys(merged)) {
  console.log('sorting for', key)
    sorted[key] = sort3(merged[key])
  }
  const text = toString(sorted)
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

function debug() {
  const text = `
  午夜剧场_9988,#genre#
年代新闻,P2p://ns2.hellotvvod.com:9906/a412a974b1c24427ba506b9fcd95d77b
东森新闻,P2p://ns2.hellotvvod.com:9906/d98879e5737d4c44b3dd85bc349775e0
中天新闻,P2p://ns2.hellotvvod.com:9906/f2b61bbfc05e47f8916dcd2513b3a0f5
民视新闻,P2p://ns2.hellotvvod.com:9906/f2f4daa81a39490396bc2eea99fd9fd9
三立新闻,P2p://ns2.hellotvvod.com:9906/3fc8adf766954da4bc9908ecb81184bc
非凡新闻,P2p://ns2.hellotvvod.com:9906/3801d29839174353a940a8c0cfae6e47
now新闻,P2p://ns2.hellotvvod.com:9906/f228f98bc84245ce9b4870364b82b6da
HKC新闻,P2p://ns2.hellotvvod.com:9906/a8429ecad2e446e18c362b031e3d32bf
壹电视新闻,P2p://ns2.hellotvvod.com:9906/c111818e11e8420aaad164543387473c
TVBS新闻,P2p://ns2.hellotvvod.com:9906/4c700aa999594ea5893d7eab1519f187
东森财经新闻,P2p://ns2.hellotvvod.com:9906/e992de48ddda440ebc55984766d0ab8f
无线财经·资讯,P2p://ns2.hellotvvod.com:9906/790b3d24875349d8b3118357cb9a5124
HKC直播新闻,P2p://ns2.hellotvvod.com:9906/eede001be16e4991843619bb8af3f840
ViuTV,P2p://ns2.hellotvvod.com:9906/d7506148214e4b3fae543068f1701ff7
TVBS,P2p://ns2.hellotvvod.com:9906/95ef54ef56944f0a947ea0e87f6f15bc
MTV,P2p://ns2.hellotvvod.com:9906/aad098bade95418a8046acceb0558aa3
Animax,P2p://ns2.hellotvvod.com:9906/10d8ae908a354513b09e38e7116b7b33
TVBS精采,P2p://ns2.hellotvvod.com:9906/12b97bd9bd274f78846703aceb5894d2
ETtoday综合,P2p://ns2.hellotvvod.com:9906/b9f9c80102d54af7b3bc3aedc124afa9
Astro AEC(备),P2p://ns2.hellotvvod.com:9906/ba54a1fee32c4b159e953cc9f2632857
Astro AOD HD 311,P2p://ns2.hellotvvod.com:9906/55fa6310d30d45029c38c2848ffbcb85
HKC 18,P2p://ns2.hellotvvod.com:9906/36976aef6f4f4ab2aad06b8ece5aac54
HKC 603,P2p://ns2.hellotvvod.com:9906/bc32fd90af7d4f4aaa3bd451d9199153
靖天资讯,P2p://ns2.hellotvvod.com:9906/62412f14fbef4a3f8c7e463cc8db65c8
CNN,P2p://ns2.hellotvvod.com:9906/608965b9eef84266946ad5598a892db9
中视经典,P2p://ns2.hellotvvod.com:9906/003d7fef9db3466e9b9e2f569474dd28
翡翠台(华丽台),P2p://ns2.hellotvvod.com:9906/b1b2d6da00de42efa4fe6051d35650d9
Astro全佳,P2p://ns2.hellotvvod.com:9906/bda13a24baf24436ae722275cbb85345
Z频道,P2p://ns2.hellotvvod.com:9906/653db001ea4a4599ad4be5a98f9adf8c
台视,P2p://ns2.hellotvvod.com:9906/0cde14d20638479189443549d1b1005f
中视,P2p://ns2.hellotvvod.com:9906/21fe3c316a13445a8a5b1f4afd39a5b1
华视,P2p://ns2.hellotvvod.com:9906/fd73b217be314cf198807cc5d1d911b6
公视,P2p://ns2.hellotvvod.com:9906/a1c2ecbcd3b64f3eb72ac9191b337cda
超视,P2p://ns2.hellotvvod.com:9906/941259e9297d4a229c678f08b19f60f1
公视3,P2p://ns2.hellotvvod.com:9906/6ba6fe3a051e4113b82eb6d32fbb7114
民视第一,P2p://ns2.hellotvvod.com:9906/998ca373e45e4f01b6755ddaec323cb7
民视台湾,P2p://ns2.hellotvvod.com:9906/42f0e30a314e405bbbc3c67bb7846c60
原住民电视,P2p://ns2.hellotvvod.com:9906/aa08defb0c824c2286623855624a0e07
中视菁采,P2p://ns2.hellotvvod.com:9906/c448d3d8a89f432d9d5ea92258dc3cef
壹电视综合,P2p://ns2.hellotvvod.com:9906/9296b1db1f674585a1ca7be4ff47c004
大爱2,P2p://ns2.hellotvvod.com:9906/4523b0956bb34141bfb61460ea9494ed
八大第一,P2p://ns2.hellotvvod.com:9906/7826fa652c474b55888ef85c30901584
八大综合,P2p://ns2.hellotvvod.com:9906/578cc70bac494161901e5c735312762c
八大娱乐,P2p://ns2.hellotvvod.com:9906/cdb80c12a4854752b4cfb570d448ac05
FOX,P2p://ns2.hellotvvod.com:9906/f769b6fdc80742349bd8214c8839d9d3
东森综合,P2p://ns2.hellotvvod.com:9906/8c962bcce29840f4a4f0109bfd7fe5c0
中天综合,P2p://ns2.hellotvvod.com:9906/a23f89fde21341f3b172046c02ad688c
纬来育乐,P2p://ns2.hellotvvod.com:9906/ed2847f9731a48e19afc2ba479a73939
纬来体育,P2p://ns2.hellotvvod.com:9906/cd64bcebb70d4b489bf734c5b3369002
纬来日本,P2p://ns2.hellotvvod.com:9906/f89c51e091594bb1bcce0ba7b3e17973
三立综合,P2p://ns2.hellotvvod.com:9906/39099a64df574197b97e74dcdabbb332
靖天综合,P2p://ns2.hellotvvod.com:9906/fe98dad44e224b70ae27c282fdd5682a
纬来精采,P2p://ns2.hellotvvod.com:9906/2c975cf5b04545ba8bf7b0320111883a
三立都会,P2p://ns2.hellotvvod.com:9906/24f879b52a0d45d886005e8acdd9a8ab
三立iNEWS,P2p://ns2.hellotvvod.com:9906/49035f1ad8b84fa7822c0ff660d89f09
靖天育乐,P2p://ns2.hellotvvod.com:9906/48cbe27fc4af4d988cab3cbf08c34d60
ELEVEN体育1,P2p://ns2.hellotvvod.com:9906/0c9c4a9fc07c41bb8537828dd9162e81
  `
  const obj = parse(text)
  obj['午夜剧场_9988'] = sort(obj['午夜剧场_9988'])
  console.log(
    toString(obj)
  )
}
// debug()
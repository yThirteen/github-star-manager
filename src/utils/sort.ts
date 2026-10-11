/**
 * 排序工具函数
 */

// 拼音首字母参考字符（每个拼音首字母的代表字符，使用该字母范围内最靠前的字符）
const pinyinRefs: Array<{ letter: string; char: string }> = [
  { letter: 'a', char: '啊' },
  { letter: 'b', char: '八' },
  { letter: 'c', char: '擦' },
  { letter: 'd', char: '大' },
  { letter: 'e', char: '额' },
  { letter: 'f', char: '发' },
  { letter: 'g', char: '嘎' },
  { letter: 'h', char: '哈' },
  { letter: 'j', char: '机' },
  { letter: 'k', char: '卡' },
  { letter: 'l', char: '拉' },
  { letter: 'm', char: '马' },
  { letter: 'n', char: '那' },
  { letter: 'o', char: '哦' },
  { letter: 'p', char: '趴' },
  { letter: 'q', char: '七' },
  { letter: 'r', char: '然' },
  { letter: 's', char: '撒' },
  { letter: 't', char: '他' },
  { letter: 'w', char: '挖' },
  { letter: 'x', char: '西' },
  { letter: 'y', char: '压' },
  { letter: 'z', char: '杂' },
]

const collator = new Intl.Collator('zh-CN', {
  numeric: true,
  sensitivity: 'base',
})

/**
 * 获取字符串的首字母排序键（中文按拼音首字母，英文按字母）
 */
function getFirstLetterKey(str: string): string {
  if (!str || str.length === 0) {
    return 'z'
  }
  
  const firstChar = str.charAt(0)
  
  // 英文字母或数字
  if (/[a-zA-Z0-9]/.test(firstChar)) {
    return firstChar.toLowerCase()
  }
  
  // 中文字符：通过比较找到对应的拼音首字母
  const code = firstChar.charCodeAt(0)
  if (code >= 0x4e00 && code <= 0x9fff) {
    // 找到字符对应的拼音首字母
    // 从后往前查找，找到第一个字符 >= 参考字符的位置
    for (let i = pinyinRefs.length - 1; i >= 0; i--) {
      const ref = pinyinRefs[i]
      const compareResult = collator.compare(firstChar, ref.char)
      
      // 如果字符 >= 当前参考字符，说明应该属于当前或更靠后的范围
      if (compareResult >= 0) {
        return ref.letter
      }
    }
    
    // 如果字符比所有参考字符都小，返回第一个字母（A）
    return pinyinRefs[0].letter
  }
  
  // 其他字符，返回原字符的小写
  return firstChar.toLowerCase()
}

/**
 * 混合排序：中文按拼音首字母，英文按字母，混合排序
 * 
 * 实现原理：
 * 1. 使用 Intl.Collator('zh-CN') 比较首字符，获取排序位置
 * 2. 通过比较首字符与参考字符，确定拼音首字母
 * 3. 先按首字母排序，再按完整字符串排序
 */
export function sortMixed(tags: string[]): string[] {
  const collator = new Intl.Collator('zh-CN', {
    numeric: true,
    sensitivity: 'base',
  })
  
  return [...tags].sort((a, b) => {
    // 获取首字母排序键
    const aKey = getFirstLetterKey(a)
    const bKey = getFirstLetterKey(b)
    
    // 先按首字母排序键排序
    const keyCompare = aKey.localeCompare(bKey, 'en', { sensitivity: 'base' })
    if (keyCompare !== 0) {
      return keyCompare
    }
    
    // 如果首字母相同，使用完整字符串排序（支持中文拼音）
    return collator.compare(a, b)
  })
}

/**
 * 将标签按首字母分组
 */
export function groupTagsByFirstLetter(tags: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {}
  
  tags.forEach(tag => {
    const letter = getFirstLetterKey(tag).toUpperCase()
    if (!groups[letter]) {
      groups[letter] = []
    }
    groups[letter].push(tag)
  })
  
  // 对每个分组内的标签进行排序
  Object.keys(groups).forEach(letter => {
    groups[letter] = sortMixed(groups[letter])
  })
  
  return groups
}


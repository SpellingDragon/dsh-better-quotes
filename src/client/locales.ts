/** Locale-owned copy for the multi-select message quote picker. */

/** Locale namespace registered by the browser plugin. */
export const NS = 'betterQuotes'

/** Simplified Chinese baseline dictionary. */
export const zh = {
  'header.label': '多选引用',
  'dialog.title': '多选消息引用',
  'dialog.description': '勾选任意用户或助手消息。引用会保留发送人、时间、消息 ID、附件和 Skill 信息，便于模型理解与回查。',
  'dialog.close': '关闭',
  'dialog.cancel': '取消',
  'dialog.insert': '插入引用（{count}）',
  'dialog.selectAll': '全选',
  'dialog.clear': '清空',
  'dialog.selected': '已选 {count} 条',
  'dialog.empty': '当前对话视图没有可引用的消息。',
  'dialog.noResults': '没有匹配的消息。',
  'dialog.search': '搜索消息、附件、Skill 或引用',
  'dialog.insertFailed': '引用插入失败，请确认输入框可编辑后重试。',
  'dialog.locateFailed': '原消息当前不可见，可能已被折叠或不在已加载范围内。',
  'row.select': '选择 {speaker} 在 {time} 的消息',
  'row.user': '用户',
  'row.steering': '用户（插话）',
  'row.assistant': '助手',
  'row.noText': '（无正文）',
  'row.attachments': '附件',
  'row.skills': 'Skill',
  'row.references': '引用',
  'row.locate': '定位原消息',
  'attachment.image': '图片',
  'attachment.file': '文件',
  'attachment.unnamed': '未命名附件',
} as const

/** English baseline dictionary; every key mirrors {@link zh}. */
export const en: Record<keyof typeof zh, string> = {
  'header.label': 'Quote messages',
  'dialog.title': 'Quote multiple messages',
  'dialog.description': 'Select any user or assistant message. Quotes keep the sender, time, message ID, attachments, and skill facts for model understanding and lookup.',
  'dialog.close': 'Close',
  'dialog.cancel': 'Cancel',
  'dialog.insert': 'Insert quotes ({count})',
  'dialog.selectAll': 'Select all',
  'dialog.clear': 'Clear',
  'dialog.selected': '{count} selected',
  'dialog.empty': 'No quotable messages are visible in the current chat view.',
  'dialog.noResults': 'No messages match this search.',
  'dialog.search': 'Search messages, attachments, skills, or references',
  'dialog.insertFailed': 'Could not insert the quotes. Check that the composer is editable and try again.',
  'dialog.locateFailed': 'The original message is not visible; it may be collapsed or outside the loaded range.',
  'row.select': 'Select the {speaker} message from {time}',
  'row.user': 'User',
  'row.steering': 'User (steering)',
  'row.assistant': 'Assistant',
  'row.noText': '(no text)',
  'row.attachments': 'Attachments',
  'row.skills': 'Skills',
  'row.references': 'References',
  'row.locate': 'Locate original message',
  'attachment.image': 'Image',
  'attachment.file': 'File',
  'attachment.unnamed': 'Unnamed attachment',
}

/** Typed key union for this namespace. */
export type BetterQuotesKey = keyof typeof zh

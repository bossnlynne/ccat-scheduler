// Google 行事曆事件的逐日標題，前後端共用，不含任何 Node/瀏覽器專屬 API。
// iCloud 事件不套用，一律使用原標題。

/**
 * 依該日在排程中的位置決定 Google 事件標題：
 * - 只有一天：`單日（原標題）`
 * - 多日的最後一天：`最後一天（原標題）`
 * - 其餘日子：原標題
 */
export function googleDayTitle(
  baseTitle: string,
  index: number,
  total: number
): string {
  if (total === 1) return `單日（${baseTitle}）`;
  if (index === total - 1) return `最後一天（${baseTitle}）`;
  return baseTitle;
}

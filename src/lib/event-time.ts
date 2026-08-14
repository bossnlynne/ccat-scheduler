// 兩個行事曆整合共用的時間計算，不含任何 Node/瀏覽器專屬 API。

export interface EventTimeWindow {
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endDate: string; // YYYY-MM-DD
  endTime: string; // HH:mm
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * 加一小時，跨午夜時日期一起進位。
 * 單純對小時 +1 會在 23:xx 產生 "24:00"，Google Calendar 與 iCalendar 都不接受。
 */
export function addOneHour(
  date: string,
  time: string
): { date: string; time: string } {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  // 只取回日期/時間欄位，不涉及絕對時刻，因此與伺服器時區無關
  const shifted = new Date(year, month - 1, day, hour + 1, minute);

  return {
    date: `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`,
    time: `${pad(shifted.getHours())}:${pad(shifted.getMinutes())}`,
  };
}

/** 以起始日期時間算出固定 1 小時的事件區間。 */
export function oneHourWindow(date: string, startTime: string): EventTimeWindow {
  const end = addOneHour(date, startTime);
  return {
    startDate: date,
    startTime,
    endDate: end.date,
    endTime: end.time,
  };
}

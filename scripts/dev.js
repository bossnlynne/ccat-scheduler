// Ensure node is on PATH for child processes (PostCSS/Tailwind)
const path = require("path");
process.env.PATH = path.dirname(process.execPath) + ":" + (process.env.PATH || "");
// 走預設的 Turbopack；先前指定 --webpack 會讓啟動慢到無法使用（9 分鐘仍未編譯完）
process.argv = [process.argv[0], "next", "dev"];
require("next/dist/bin/next");

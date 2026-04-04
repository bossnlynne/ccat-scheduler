// Ensure node is on PATH for child processes (PostCSS/Tailwind)
const path = require("path");
process.env.PATH = path.dirname(process.execPath) + ":" + (process.env.PATH || "");
process.argv = [process.argv[0], "next", "dev", "--webpack"];
require("next/dist/bin/next");

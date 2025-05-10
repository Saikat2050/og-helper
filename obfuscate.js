const fs = require("fs");
const path = require("path");
const JavaScriptObfuscator = require("javascript-obfuscator");

const distDir = path.join(__dirname, "dist");

function obfuscateFile(filePath) {
  const code = fs.readFileSync(filePath, "utf8");

  const obfuscatedCode = JavaScriptObfuscator.obfuscate(code, {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 1,
    numbersToExpressions: true,
    stringArray: true,
    stringArrayEncoding: ["base64"],
    stringArrayThreshold: 1,
    disableConsoleOutput: true
  }).getObfuscatedCode();

  fs.writeFileSync(filePath, obfuscatedCode);
  console.log(`Obfuscated: ${filePath}`);
}

function processDirectory(dir) {
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith(".js")) {
      obfuscateFile(fullPath);
    }
  });
}

processDirectory(distDir);
console.log("Obfuscation completed");

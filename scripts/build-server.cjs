const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = process.cwd();
const inputPath = path.join(root, "server.ts");
const outputDir = path.join(root, "dist");
const outputPath = path.join(outputDir, "server.cjs");

const source = fs.readFileSync(inputPath, "utf8");
const result = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    esModuleInterop: true,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    skipLibCheck: true
  },
  fileName: inputPath
});

if (result.diagnostics?.length) {
  const formatted = ts.formatDiagnosticsWithColorAndContext(result.diagnostics, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => root,
    getNewLine: () => "\n"
  });
  console.error(formatted);
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, result.outputText, "utf8");

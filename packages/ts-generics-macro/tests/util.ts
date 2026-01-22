import ts from "typescript";
import path from "node:path";
import os from "node:os";

import type { TransformerExtras } from "ts-patch";

export function loadConfig(projectRoot: string): ts.ParsedCommandLine {
  const configPath = path.join(projectRoot, "tsconfig.json");

  const configFileText = ts.sys.readFile(configPath);
  if (!configFileText) {
    throw new Error(`tsconfig.json not found at ${configPath}`);
  }
  const { config } = ts.parseConfigFileTextToJson(configPath, configFileText);

  const parsedConfig = ts.parseJsonConfigFileContent(
    config,
    ts.sys,
    projectRoot,
    undefined,
    configPath,
  );
  return parsedConfig;
}

export function createProgramForDirectory(
  projectRoot: string,
  targetDir: string,
): ts.Program {
  const parsedConfig = loadConfig(projectRoot);

  const targetPath = path.join(projectRoot, targetDir);
  const targetFileNames = ts.sys.readDirectory(
    targetPath,
    [".ts"],
    undefined,
    undefined,
    undefined,
  );

  const host = ts.createCompilerHost(parsedConfig.options);

  const program = ts.createProgram(
    targetFileNames, // instead of parsedConfig.fileNames
    parsedConfig.options,
    host,
  );
  return program;
}

export function getSortedSources(
  projectRoot: string,
  targetDir: string,
): readonly ts.SourceFile[] {
  const targetPath = path.join(projectRoot, targetDir);
  const program = createProgramForDirectory(projectRoot, targetDir);
  return program
    .getSourceFiles()
    .filter(
      (file) =>
        !file.isDeclarationFile &&
        path.resolve(file.fileName).includes(targetPath),
    )
    .toSorted((a: ts.SourceFile, b: ts.SourceFile): number => a.fileName === b.fileName ? 0 : a.fileName < b.fileName ? -1 : +1
  );
}

export function printDiagnostics (diagnostics: ts.Diagnostic[]) {
  const formatDiagnosticHost = {
    getCanonicalFileName: (fileName: string) => fileName,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: () => os.EOL,
  };
  if (0 < diagnostics.length) {
    console.error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, formatDiagnosticHost)
    );
  }
}

export function createMockExtra(): TransformerExtras {
  const diagnostics: ts.Diagnostic[] = [];
  return {
    ts,
    library: "",
    addDiagnostic: (diag: ts.Diagnostic) => diagnostics.push(diag),
    removeDiagnostic: (index: number) => diagnostics.splice(index, 1),
    diagnostics,
  };
}

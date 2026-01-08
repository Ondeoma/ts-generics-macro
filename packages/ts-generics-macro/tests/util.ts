import ts from "typescript";
import path from "path";


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
    .toSorted((a: ts.SourceFile, b: ts.SourceFile): number => {
      const aName = path.relative(targetPath, a.fileName);
      const bName = path.relative(targetPath, b.fileName);
      return aName === bName ? 0 : aName < bName ? -1 : +1;
    });
}

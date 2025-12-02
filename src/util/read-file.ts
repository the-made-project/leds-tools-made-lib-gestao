import * as fs from 'fs';

export const readFileContent = (folderName: string, filename: string): string => {
  const relativeResourcePath = `dist/${folderName}/${filename}`;
  const absoluteFilePath = require.resolve(`../${relativeResourcePath}`);

  return fs.readFileSync(absoluteFilePath, "utf-8");
}

import { writeFileSync, readFileSync, existsSync, unlinkSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);

import { TimeBox,IssuesDTO } from '../model/models';


export class TimeBoxRepository {
  private filePath: string;
  private timeBoxes: TimeBox[];

  constructor(directory: string) {
    const resolvedDir = resolve(directory);
    
    // Cria o diretório se não existir
    if (!existsSync(resolvedDir)) {
      mkdirSync(resolvedDir, { recursive: true });
    }

    this.filePath = join(resolvedDir, 'timebox.json');
    this.timeBoxes = this.load();
  }

  private load(): TimeBox[] {
    if (!existsSync(this.filePath)) {
      return [];
    }

    const fileContent = readFileSync(this.filePath, 'utf-8');
    try {
      const parsed: IssuesDTO = JSON.parse(fileContent);
      return parsed.data;
    } catch (error) {
      console.error('Erro ao ler o arquivo JSON:', error);
      return [];
    }
  }

  private save() {
    const content: IssuesDTO = { data: this.timeBoxes };
    writeFileSync(this.filePath, JSON.stringify(content, null, 2), 'utf-8');
  }

  public async add(timeBox: TimeBox | TimeBox[]) {
      const issues = Array.isArray(timeBox) ? timeBox : [timeBox];
      this.timeBoxes.push(...issues);
      this.save();
    }

  public getAll(): TimeBox[] {
    return this.timeBoxes;
  }

  public clear() {
    if (existsSync(this.filePath)) {
      unlinkSync(this.filePath);
      this.timeBoxes = [];
    }
  }
}



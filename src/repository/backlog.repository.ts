import { writeFileSync, readFileSync, existsSync, unlinkSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);

import { Backlog,IssuesDTO } from '../model/models';


export class BacklogRepository {
  private filePath: string;
  private backlogs: Backlog[];

  constructor(directory: string) {
    const resolvedDir = resolve(directory);
    
    // Cria o diretório se não existir
    if (!existsSync(resolvedDir)) {
      mkdirSync(resolvedDir, { recursive: true });
    }

    this.filePath = join(resolvedDir, 'backlog.json');
    this.backlogs = this.load();
  }

  private load(): Backlog[] {
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
    const content: IssuesDTO = { data: this.backlogs };
    writeFileSync(this.filePath, JSON.stringify(content, null, 2), 'utf-8');
  }

  public add(backlog: Backlog) {
    this.backlogs.push(backlog);
    this.save();
  }

  public getAll(): Backlog[] {
    return this.backlogs;
  }

  public clear() {
    if (existsSync(this.filePath)) {
      unlinkSync(this.filePath);
      this.backlogs = [];
    }
  }
}



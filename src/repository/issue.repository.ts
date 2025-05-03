import { writeFileSync, readFileSync, existsSync, unlinkSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);

import { Issue,IssuesDTO } from '../model/models';


export class IssueRepository {
  private filePath: string;
  private issues: Issue[];

  constructor(directory: string) {
    const resolvedDir = resolve(directory);
    
    // Cria o diretório se não existir
    if (!existsSync(resolvedDir)) {
      mkdirSync(resolvedDir, { recursive: true });
    }

    this.filePath = join(resolvedDir, 'issue.json');
    this.issues = this.load();
  }

  private load(): Issue[] {
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
    const content: IssuesDTO = { data: this.issues };
    writeFileSync(this.filePath, JSON.stringify(content, null, 2), 'utf-8');
  }

  public async add(issueOrIssues: Issue | Issue[]) {
    const issues = Array.isArray(issueOrIssues) ? issueOrIssues : [issueOrIssues];
    this.issues.push(...issues);
    this.save();
  }
  public getAll(): Issue[] {
    return this.issues;
  }

  public clear() {
    if (existsSync(this.filePath)) {
      unlinkSync(this.filePath);
      this.issues = [];
    }
  }
}



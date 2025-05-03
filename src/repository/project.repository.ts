import { writeFileSync, readFileSync, existsSync, unlinkSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);

import { Project,IssuesDTO } from '../model/models';


export class ProjectRepository {
  private filePath: string;
  private projects: Project[];

  constructor(directory: string) {
    const resolvedDir = resolve(directory);
    
    // Cria o diretório se não existir
    if (!existsSync(resolvedDir)) {
      mkdirSync(resolvedDir, { recursive: true });
    }

    this.filePath = join(resolvedDir, 'project.json');
    this.projects = this.loadProjects();
  }

  private loadProjects(): Project[] {
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

  private saveProjects() {
    const content: IssuesDTO = { data: this.projects };
    writeFileSync(this.filePath, JSON.stringify(content, null, 2), 'utf-8');
  }

  public add(project: Project) {
    this.projects.push(project);
    this.saveProjects();
  }

  public getAll(): Project[] {
    return this.projects;
  }

  public clear() {
    if (existsSync(this.filePath)) {
      unlinkSync(this.filePath);
      this.projects = [];
    }
  }
}



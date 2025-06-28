import {
    writeFileSync,
    readFileSync,
    existsSync,
    unlinkSync,
    mkdirSync
  } from 'fs';
  import { join, resolve } from 'path';
  
  export class GenericRepository<T> {
    private filePath: string;
    private data: T[];
  
  constructor(directory: string, fileName: string = 'data.json') {
    if (!directory || typeof directory !== 'string') {
      throw new Error('O parâmetro "directory" deve ser uma string válida.');
    }
    if (!fileName || typeof fileName !== 'string') {
      throw new Error('O parâmetro "fileName" deve ser uma string válida.');
    }
    const resolvedDir = resolve(directory);
  
      if (!existsSync(resolvedDir)) {
        mkdirSync(resolvedDir, { recursive: true });
      }
  
      this.filePath = join(resolvedDir, fileName);
      this.data = this.load();
    }
  
    private load(): T[] {
      if (!existsSync(this.filePath)) {
        return [];
      }
  
      const fileContent = readFileSync(this.filePath, 'utf-8');
      try {
        const parsed = JSON.parse(fileContent) as { data: T[] };
        return parsed.data || [];
      } catch (error) {
        console.error('Erro ao ler o arquivo JSON:', error);
        return [];
      }
    }
  
    private save() {
      const content = { data: this.data };
      writeFileSync(this.filePath, JSON.stringify(content, null, 2), 'utf-8');
    }
  
    public add(itemOrItems: T | T[]) {
      const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
      this.data.push(...items);
      this.save();
    }
  
    public getAll(): T[] {
      return this.data;
    }
  
    public clear() {
      if (existsSync(this.filePath)) {
        unlinkSync(this.filePath);
        this.data = [];
      }
    }

    /**
     * Verifica se existe algum item que satisfaça o predicate
     * @param predicate Função que retorna true se o item for considerado existente
     */
    public exists(predicate: (item: T) => boolean): boolean {
      return this.data.some(predicate);
    }
  }

import fs from 'fs';
import path from 'path';
import { Project, SprintItem, TimeBox } from '../../../../../model/models.js';
import { ProjectCFD } from './ProjectCFD.js';
import { ProjectThroughputGenerator } from './ProjectThroughputGenerator.js';
import { ProjectMonteCarlo } from './ProjectMonteCarlo.js';
import { parseDate } from '../../../../../util/date-util.js';

interface SprintStatus {
  completed: number;
  inProgress: number;
  pending: number;
}

export class ProjectMetricsGenerator {
  private sprints: TimeBox[];

  constructor(sprints: TimeBox[]) {
    this.sprints = sprints;
  }

  private determineTaskStatus(task: SprintItem): string {
    if (!task.startDate) {
      return "TODO";
    } else if (task.startDate && !task.dueDate) {
      return "DOING";
    } else if (task.startDate && task.dueDate) {
      return "DONE";
    }
    return "TODO"; // Default fallback
  }

  private formatDate(date: string): string {
    try {
      const parsedDate = parseDate(date);
      return parsedDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      });
    } catch (error) {
      console.error(`Erro ao formatar data: ${this.getErrorMessage(error)}`);
      return date;
    }
  }

  private calculateDuration(startDate: string, endDate: string): number {
    try {
      const start = parseDate(startDate);
      const end = parseDate(endDate);
      
      const startTime = start.getTime();
      const endTime = end.getTime();

      if (endTime < startTime) {
        throw new Error('Data de fim é anterior à data de início');
      }

      return Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24));
    } catch (error) {
      console.error(`Erro ao calcular duração entre ${startDate} e ${endDate}: ${this.getErrorMessage(error)}`);
      throw new Error(`Erro ao calcular duração: ${this.getErrorMessage(error)}`);
    }
  }
  
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'toString' in error) {
      return error.toString();
    }
    return 'Erro desconhecido';
  }

  private analyzeTaskStatus(tasks: SprintItem[]): SprintStatus {
    return {
      completed: tasks.filter(task => this.determineTaskStatus(task) === "DONE").length,
      inProgress: tasks.filter(task => this.determineTaskStatus(task) === "DOING").length,
      pending: tasks.filter(task => this.determineTaskStatus(task) === "TODO").length
    };
  }

  private calculateVelocity(tasks: SprintItem[], duration: number): number {
    const completedTasks = tasks.filter(task => this.determineTaskStatus(task) === "DONE").length;
    return Number((completedTasks / duration).toFixed(2));
  }

  public generateSprintSVG(sprints: TimeBox[]): string {
    const width = 800;
    const height = 400;
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const graphWidth = width - margin.left - margin.right;
    const graphHeight = height - margin.top - margin.bottom;

    const getCompletedTasks = (tasks: SprintItem[]) => 
        tasks.filter(t => this.determineTaskStatus(t) === "DONE").length;

    const maxTasks = Math.max(...sprints.map(s => s.sprintItems.length));
    const barWidth = graphWidth / (sprints.length * 2);

    let svg = `
        <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
            <style>
                .bar { fill: #4f46e5; opacity: 0.8; }
                .bar:hover { opacity: 1; }
                .label { font-size: 12px; font-family: Arial; }
            </style>
            <g transform="translate(${margin.left}, ${margin.top})">`;

    // Add axes
    svg += `
        <line x1="0" y1="0" x2="0" y2="${graphHeight}" stroke="black" stroke-width="2"/>
        <line x1="0" y1="${graphHeight}" x2="${graphWidth}" y2="${graphHeight}" stroke="black" stroke-width="2"/>`;

    // Add Y-axis labels
    for (let i = 0; i <= 4; i++) {
        const yValue = maxTasks * (4 - i) / 4;
        svg += `
            <text x="-10" y="${(graphHeight * i) / 4}" 
                  text-anchor="end" dominant-baseline="middle" 
                  class="label">${Math.round(yValue)}</text>`;
    }

    // Add bars and labels
    sprints.forEach((sprint, i) => {
        const completedTasks = getCompletedTasks(sprint.sprintItems);
        const barHeight = (completedTasks / maxTasks) * graphHeight;
        const x = (i * graphWidth) / sprints.length;

        svg += `
            <g>
                <rect x="${x + barWidth/2}" y="${graphHeight - barHeight}"
                      width="${barWidth}" height="${barHeight}" class="bar">
                    <title>${sprint.name}: ${completedTasks}/${sprint.sprintItems.length} tasks completed</title>
                </rect>
                <text x="${x + barWidth}" y="${graphHeight + 20}"
                      text-anchor="middle" class="label"
                      transform="rotate(45, ${x + barWidth}, ${graphHeight + 20})">${sprint.name}</text>
            </g>`;
    });

    svg += `
            </g>
        </svg>`;

    return svg;
  }
  
  private generateSummaryTable(): string {
    let markdown = '## Métricas Consolidadas\n\n';
    markdown += '| Sprint | Período | Duração | Total Tasks | Concluídas | Em Progresso | Pendentes | Velocidade | Eficiência |\n';
    markdown += '|--------|---------|----------|-------------|------------|--------------|-----------|------------|------------|\n';

    this.sprints.forEach(sprint => {
      const duration = this.calculateDuration(sprint.startDate, sprint.endDate);
      const status = this.analyzeTaskStatus(sprint.sprintItems);
      const velocity = this.calculateVelocity(sprint.sprintItems, duration);
      const efficiency = ((status.completed / sprint.sprintItems.length) * 100).toFixed(1);

      markdown += `| ${sprint.name} | ${this.formatDate(sprint.startDate)} - ${this.formatDate(sprint.endDate)} | ${duration} dias | ${sprint.sprintItems.length} | ${status.completed} (${efficiency}%) | ${status.inProgress} | ${status.pending} | ${velocity}/dia | ${efficiency}% |\n`;
    });

    return markdown;
  }

  private generateMarkdownReport(project: Project): string {
    let markdown = '# 📊 Visão Geral do Projeto \n\n' 
    markdown += `${project.description?? "-"}` + '\n';
    
    markdown += `* Data de Início: ${project.startDate?? "-" }` + '\n';
    markdown += `* Data de Planejado: ${project.dueDate ?? "-"}` + '\n';
    markdown += `* Data de Finalização: ${project.completedDate ?? "-"}` + '\n\n';

    markdown += `${project.description}` + '\n';
    // Adiciona a tabela de métricas
    markdown += this.generateSummaryTable() + '\n';
    
    // Análise geral
    const totalTasks = this.sprints.reduce((acc, sprint) => acc + sprint.sprintItems.length, 0);
    const totalStatus = this.analyzeTaskStatus(this.sprints.flatMap(s => s.sprintItems));
    const globalEfficiency = ((totalStatus.completed / totalTasks) * 100).toFixed(1);

    markdown += '## Análise Geral\n\n';
    markdown += `- **Total de Sprints:** ${this.sprints.length}\n`;
    markdown += `- **Total de Tasks:** ${totalTasks}\n`;
    markdown += `- **Taxa de Conclusão:** ${globalEfficiency}%\n\n`;
    
    // Notas
    markdown += '### Notas\n';
    markdown += `- Período Total: ${this.formatDate(this.sprints[0].startDate)} - ${this.formatDate(this.sprints[this.sprints.length-1].endDate)}\n`;
    markdown += `- Média de Duração das Sprints: ${Math.round(this.sprints.reduce((acc, sprint) => 
      acc + this.calculateDuration(sprint.startDate, sprint.endDate), 0) / this.sprints.length)} dias\n\n`;

    markdown += `*Última atualização: ${new Date().toLocaleDateString('pt-BR', { 
      month: 'long', 
      year: 'numeric' 
    })}*`;

    markdown += '\n\n## Cumulative Flow \n'
    markdown +='![ Cumulative Flow](./project-cfd.svg)\n\n'
 
    const projectAnalysis = new ProjectMonteCarlo(this.sprints);
    const report = projectAnalysis.generateMarkdownReport();
    markdown += report;
    
    return markdown;
  }

  public async generateFiles(outputDir: string, project: Project): Promise<void> {
    try {
      // Criar diretório se não existir
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Gerar e salvar SVG primeiro
      const svgPath = path.join(outputDir, 'project-cfd.svg');
      const projectCFD = new ProjectCFD(this.sprints, svgPath);
      projectCFD.generate();
      
      const svgPathTP = path.join(outputDir, 'project-throughput.svg');
      const throughput = new ProjectThroughputGenerator(this.sprints, svgPathTP);
      throughput.generate();

      // Gerar markdown com referência ao SVG
      const markdown = this.generateMarkdownReport(project);
      const markdownPath = path.join(outputDir, '01_overview.md');
      await fs.promises.writeFile(markdownPath, markdown, 'utf-8');
    } catch (error) {
      console.error('Erro ao gerar arquivos:', error);
      throw error;
    }
  }
}
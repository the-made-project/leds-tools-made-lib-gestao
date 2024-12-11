import { TimeBox, SprintItem, Person } from "../../../../model/models";

interface PersonTaskItem {
  id: string;
  title: string;
  status: string;
  startDate?: string;
  dueDate?: string;
  completedDate?: string;
}

interface PersonSummary {
  id: string;
  name: string;
  total: number;
  statusCount: Record<string, number>;
  statusPercentage: Record<string, string>;
  items: PersonTaskItem[];
}


interface SprintSummaryStats {
  total: number;
  statusCount: Record<string, number>;
  statusPercentage: Record<string, string>;
}

interface ThroughputData {
  date: string;
  count: number;
}

interface PersonSummary {
  id: string;
  name: string;
  total: number;
  statusCount: Record<string, number>;
  statusPercentage: Record<string, string>;
  items: Array<{
      id: string;
      title: string;
      status: string;
      startDate?: string;
      dueDate?: string;
      completedDate?: string;
  }>;
}

export interface SprintSummary {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  stats: SprintSummaryStats;
  peopleStats: PersonSummary[];
}

export class SprintSummaryGenerator {
  private sprints: TimeBox[];

  constructor(sprints: TimeBox[]) {
      this.sprints = sprints;
  }

  private getStatusEmoji(status: string): string {
      const statusEmojis: Record<string, string> = {
          'TODO': '🔵',
          'IN_PROGRESS': '🟡',
          'DONE': '🟢',
          'BLOCKED': '🔴',
          'CANCELLED': '⚫',
          'PLANNED': '⚪',
          'CLOSED': '🟣'
      };
      return statusEmojis[status] || '⚪';
  }

  private isOverdue(item: PersonSummary['items'][0]): boolean {
      if (!item.dueDate || item.status === 'DONE') return false;
      const today = new Date();
      const dueDate = new Date(item.dueDate);
      return dueDate < today;
  }

  private isToday(item: PersonSummary['items'][0]): boolean {
      if (!item.dueDate) return false;
      const today = new Date();
      const dueDate = new Date(item.dueDate);
      return (
          dueDate.getDate() === today.getDate() &&
          dueDate.getMonth() === today.getMonth() &&
          dueDate.getFullYear() === today.getFullYear()
      );
  }

  private calculateStats(items: SprintItem[]): SprintSummaryStats {
      const total = items.length;
      const statusCount = items.reduce((acc: Record<string, number>, item) => {
          const status = item.status || 'NO_STATUS';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
      }, {});

      const statusPercentage = Object.entries(statusCount).reduce((acc: Record<string, string>, [status, count]) => {
          acc[status] = `${((count / total) * 100).toFixed(1)}%`;
          return acc;
      }, {});

      return {
          total,
          statusCount,
          statusPercentage
      };
  }

  private getPersonSummary(personItems: SprintItem[]): PersonSummary {
      const { assignee } = personItems[0];
      const stats = this.calculateStats(personItems);

      return {
        id: assignee.id,
        name: assignee.name,
        total: stats.total,
        statusCount: stats.statusCount,
        statusPercentage: stats.statusPercentage,
        items: personItems.map(item => {
            // Determina o título com fallback para casos undefined
            const itemTitle = item.issue.title || item.issue.key || `Task ${item.id}`;
            
            return {
                id: item.id,
                title: itemTitle,
                status: item.status || 'NO_STATUS',
                startDate: item.startDate,
                dueDate: item.dueDate,
                completedDate: item.completedDate
            };
        })
    };
  }

  private calculateThroughputData(items: (SprintItem | PersonTaskItem)[]): ThroughputData[] {
    const tasksByDate = new Map<string, number>();
    
    items
        .filter(item => item.status === 'DONE' && item.completedDate)
        .forEach(item => {
            const date = item.completedDate!.split('T')[0];
            tasksByDate.set(date, (tasksByDate.get(date) || 0) + 1);
        });

    const sortedDates = Array.from(tasksByDate.keys()).sort();
    let cumulative = 0;
    return sortedDates.map(date => {
        cumulative += tasksByDate.get(date)!;
        return { date, count: cumulative };
    });
}

  private generateThroughputTable(data: ThroughputData[]): string {
      if (data.length === 0) return '';

      let table = `| Data | Tarefas Concluídas | Total Acumulado |\n`;
      table += `|:-----|:-----------------:|:---------------:|\n`;

      let previousCount = 0;
      data.forEach(({ date, count }) => {
          const dailyCount = count - previousCount;
          const formattedDate = new Date(date).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
          });
          table += `| ${formattedDate} | ${dailyCount} | ${count} |\n`;
          previousCount = count;
      });

      return table;
  }

  private createTasksTable(items: PersonTaskItem[], title: string): string {
    if (items.length === 0) return '';
    
    let table = `### ${title}\n\n`;
    table += `| Status | Título | Data Início | Vencimento | Conclusão |\n`;
    table += `|:------:|:-------|:------------|:-----------|:----------|\n`;
    
    items.forEach(task => {
        const statusEmoji = this.getStatusEmoji(task.status);
        const startDate = task.startDate || '-';
        const dueDate = task.dueDate || '-';
        const completedDate = task.completedDate || '-';
        
        table += `| ${statusEmoji} | ${task.title} | ${startDate} | ${dueDate} | ${completedDate} |\n`;
    });
    
    return table + '\n';
}

  public generateSprintsSummary(): SprintSummary[] {
      return this.sprints
          .filter(sprint => sprint.status === 'IN_PROGRESS')
          .map(sprint => {
              const stats = this.calculateStats(sprint.sprintItems);

              const itemsByPerson = sprint.sprintItems.reduce((acc: Record<string, SprintItem[]>, item) => {
                  const personId = item.assignee.id;
                  if (!acc[personId]) {
                      acc[personId] = [];
                  }
                  acc[personId].push(item);
                  return acc;
              }, {});

              const peopleStats = Object.values(itemsByPerson).map(personItems => 
                  this.getPersonSummary(personItems)
              );

              return {
                  id: sprint.id || '',
                  name: sprint.name,
                  description: sprint.description,
                  startDate: sprint.startDate,
                  endDate: sprint.endDate,
                  status: sprint.status || 'NO_STATUS',
                  stats,
                  peopleStats
              };
          });
  }

  public createSprintCompleteMarkdown(sprints: SprintSummary[]): string {
      let markdown = '';
      
      sprints.forEach((sprint, index) => {
          if (index > 0) {
              markdown += '---\n\n';
          }

          markdown += `# 🎯 Sprint: ${sprint.name}\n\n`;
          markdown += `> ${sprint.description}\n\n`;
          
          // Informações Gerais
          markdown += `## 📋 Informações Gerais\n\n`;
          markdown += `| Período | Status | Total de Tarefas |\n`;
          markdown += `|:--------|:-------|:----------------:|\n`;
          markdown += `| ${sprint.startDate} a ${sprint.endDate} | ${this.getStatusEmoji(sprint.status)} ${sprint.status} | ${sprint.stats.total} |\n\n`;

          // Throughput Geral
          markdown += `## 📈 Análise de Throughput\n\n`;
          const sprintThroughput = this.calculateThroughputData(
              sprint.peopleStats.flatMap(person => person.items)
          );
          
          if (sprintThroughput.length > 0) {
              markdown += `### Throughput Geral do Sprint\n\n`;
              markdown += this.generateThroughputTable(sprintThroughput) + '\n';

              const totalDays = sprintThroughput.length;
              const totalCompleted = sprintThroughput[sprintThroughput.length - 1].count;
              const avgDaily = (totalCompleted / totalDays).toFixed(1);
              
              markdown += `**Métricas de Velocidade:**\n`;
              markdown += `- Média diária de entregas: ${avgDaily} tarefas/dia\n`;
              markdown += `- Total de dias com entregas: ${totalDays}\n`;
              markdown += `- Total de tarefas entregues: ${totalCompleted}\n\n`;
          }

          // Estatísticas
          markdown += `## 📊 Estatísticas Gerais\n\n`;
          markdown += `| Status | Percentual | Quantidade |\n`;
          markdown += `|:-------|:-----------|:----------:|\n`;
          Object.entries(sprint.stats.statusPercentage).forEach(([status, percentage]) => {
              const emoji = this.getStatusEmoji(status);
              markdown += `| ${emoji} ${status} | \`${percentage}\` | ${sprint.stats.statusCount[status]} |\n`;
          });
          markdown += '\n';

          // Visão Geral das Tarefas
          markdown += `## 📋 Visão Geral das Tarefas\n\n`;
          markdown += `| Status | Responsável | Título | Data Início | Vencimento | Conclusão |\n`;
          markdown += `|:------:|:------------|:-------|:------------|:-----------|:----------|\n`;
          sprint.peopleStats.forEach(person => {
              person.items.forEach(task => {
                  const statusEmoji = this.getStatusEmoji(task.status);
                  const startDate = task.startDate || '-';
                  const dueDate = task.dueDate || '-';
                  const completedDate = task.completedDate || '-';
                  
                  markdown += `| ${statusEmoji} | ${person.name} | ${task.title} | ${startDate} | ${dueDate} | ${completedDate} |\n`;
              });
          });
          markdown += '\n';

          // Detalhamento por pessoa
          markdown += `## 👥 Detalhamento por Pessoa\n\n`;
          sprint.peopleStats.forEach(person => {
              markdown += `### 👤 ${person.name}\n\n`;

              // Throughput individual
              const personThroughput = this.calculateThroughputData(person.items);
              if (personThroughput.length > 0) {
                  markdown += `#### Throughput Individual\n\n`;
                  markdown += this.generateThroughputTable(personThroughput) + '\n';

                  const totalDays = personThroughput.length;
                  const totalCompleted = personThroughput[personThroughput.length - 1].count;
                  const avgDaily = (totalCompleted / totalDays).toFixed(1);
                  
                  markdown += `**Métricas Individuais:**\n`;
                  markdown += `- Média diária de entregas: ${avgDaily} tarefas/dia\n`;
                  markdown += `- Total de dias com entregas: ${totalDays}\n`;
                  markdown += `- Total de tarefas entregues: ${totalCompleted}\n\n`;
              }

              // Progresso em tabela
              markdown += `#### Progresso\n\n`;
              markdown += `| Status | Percentual |\n`;
              markdown += `|:-------|:----------:|\n`;
              Object.entries(person.statusPercentage).forEach(([status, percentage]) => {
                  const emoji = this.getStatusEmoji(status);
                  markdown += `| ${emoji} ${status} | \`${percentage}\` |\n`;
              });
              markdown += '\n';

              // Tabelas de tarefas específicas
              const overdueTasks = person.items.filter(task => this.isOverdue(task));
              if (overdueTasks.length > 0) {
                  markdown += this.createTasksTable(overdueTasks, '⚠️ Tarefas Atrasadas');
              }

              const todayTasks = person.items.filter(task => this.isToday(task));
              if (todayTasks.length > 0) {
                  markdown += this.createTasksTable(todayTasks, '📅 Tarefas do Dia');
              }

              markdown += this.createTasksTable(person.items, 'Todas as Tarefas');
          });
      });

      return markdown;
  }
}
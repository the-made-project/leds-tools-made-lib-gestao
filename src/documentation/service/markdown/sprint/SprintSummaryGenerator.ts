import { TimeBox, SprintItem } from "../../../../model/models";
export type SprintSummaryStats = {
    total: number;
    statusCount: Record<string, number>;
    statusPercentage: Record<string, string>;
  }
  
  export   type PersonSummary = {
    id: string;
    name: string;
    email: string;
    total: number;
    statusCount: Record<string, number>;
    statusPercentage: Record<string, string>;
    items: Array<{
      id: string;
      title: string;
      type: string;
      status: string;
      startDate?: string;
      dueDate?: string;
      completedDate?: string;
    }>;
  }
  
  export   type SprintSummary = {
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
        email: assignee.email,
        total: stats.total,
        statusCount: stats.statusCount,
        statusPercentage: stats.statusPercentage,
        items: personItems.map(item => ({
          id: item.id,
          title: item.issue.title || item.issue.key || 'Sem título',
          type: item.issue.type,
          status: item.status || 'NO_STATUS',
          startDate: item.startDate,
          dueDate: item.dueDate,
          completedDate: item.completedDate
        }))
      };
    }
  
    generateSprintsSummary(): SprintSummary[] {
      return this.sprints
        .filter(sprint => sprint.status === 'IN_PROGRESS')
        .map(sprint => {
          // Calcula estatísticas gerais da sprint
          const stats = this.calculateStats(sprint.sprintItems);
  
          // Agrupa itens por pessoa
          const itemsByPerson = sprint.sprintItems.reduce((acc: Record<string, SprintItem[]>, item) => {
            const personId = item.assignee.id;
            if (!acc[personId]) {
              acc[personId] = [];
            }
            acc[personId].push(item);
            return acc;
          }, {});
  
          // Calcula estatísticas por pessoa
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

    public createSprintDiscordMarkdown(sprints: SprintSummary[]): string {
      // Função auxiliar para formatar o status
      function getStatusEmoji(status: string): string {
          const statusEmojis: Record<string, string> = {
              'TODO': '🔵',
              'IN_PROGRESS': '🟡',
              'DONE': '🟢',
              'BLOCKED': '🔴',
              'CANCELLED': '⚫'
          };
          return statusEmojis[status] || '⚪';
      }
  
      let markdown = '';
      
      sprints.forEach((sprint, index) => {
          // Adiciona separador entre sprints (exceto para a primeira)
          if (index > 0) {
              markdown += '---\n\n';
          }
  
          // Começa a construir o markdown para cada sprint
          markdown += `# 🎯 Sprint: ${sprint.name}\n\n`;
          
          // Descrição
          markdown += `> ${sprint.description}\n\n`;
          
          // Informações Gerais
          markdown += `## 📋 Informações Gerais\n`;
          markdown += `• **Período:** ${sprint.startDate} a ${sprint.endDate}\n`;
          markdown += `• **Status:** ${getStatusEmoji(sprint.status)} ${sprint.status}\n`;
          markdown += `• **Total de Tarefas:** ${sprint.stats.total}\n\n`;
          
          // Estatísticas
          markdown += `## 📊 Estatísticas\n`;
          Object.entries(sprint.stats.statusPercentage).forEach(([status, percentage]) => {
              markdown += `${getStatusEmoji(status)} **${status}:** \`${percentage}\` (${sprint.stats.statusCount[status]} tarefas)\n`;
          });
          markdown += '\n';
          
          // Detalhes por pessoa
          sprint.peopleStats.forEach(person => {
              markdown += `## 👤 ${person.name}\n`;
              markdown += `**Email:** ${person.email}\n`;
              markdown += `**Total de Tarefas:** ${person.total}\n\n`;
              
              // Progresso da pessoa
              markdown += `### Progresso\n`;
              Object.entries(person.statusPercentage).forEach(([status, percentage]) => {
                  markdown += `${getStatusEmoji(status)} **${status}:** \`${percentage}\`\n`;
              });
              markdown += '\n';
              
              // Lista de tarefas
              markdown += `### Tarefas\n`;
              person.items.forEach(item => {
                  const dateInfo = [];
                  if (item.startDate) dateInfo.push(`📅 ${item.startDate}`);
                  if (item.dueDate) dateInfo.push(`⏰ ${item.dueDate}`);
                  if (item.completedDate) dateInfo.push(`✅ ${item.completedDate}`);
                  
                  markdown += `${getStatusEmoji(item.status)} **${item.title}**\n`;
                  if (dateInfo.length > 0) {
                      markdown += `> ${dateInfo.join(' | ')}\n`;
                  }
              });
              markdown += '\n';
          });
      });
  
      return markdown;
  }
  
  }

  
import { Roadmap, Release } from '../../../../model/models.js';

export class RoadmapReportGenerator {
  private roadmaps: Roadmap[];
  

  constructor(roadmaps: Roadmap[]) {
    this.roadmaps = roadmaps;
  }

  private formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    try {
        // Verifica se a data já está no formato brasileiro (dd/mm/yyyy)
        if (dateStr.includes('/')) {
            const [day, month, year] = dateStr.split('/');
            const date = new Date(`${year}-${month}-${day}`);
            if (isNaN(date.getTime())) return 'N/A';
            return dateStr;
        }

        // Se estiver no formato ISO (yyyy-mm-dd)
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'N/A';

        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        
        return `${year}-${month}-${day}`;
    } catch (error) {
        console.error('Erro ao formatar data:', error);
        return 'N/A';
    }
  }

  private getStatusEmoji(status: string): string {
    const statusEmojis: { [key: string]: string } = {
      PLANNED: '📋',
      IN_PROGRESS: '🏃',
      COMPLETED: '✅',
      DELAYED: '⚠️',
      IN_DEVELOPMENT: '🏗️',
      TESTING: '🧪',
      RELEASED: '✨'
    };
    return statusEmojis[status] || '❓';
  }

  private generateMilestonesSection(roadmap: Roadmap): string {
    if (!roadmap.milestones?.length) return '';
const milestonesContent = roadmap.milestones.map(milestone => `
### ${this.getStatusEmoji(milestone.status || 'PLANNED')} ${milestone.name} (${milestone.status})
- **Início**: ${this.formatDate(milestone.startDate)}
- **Conclusão${milestone.status !== 'COMPLETED' ? ' Prevista' : ''}**: ${this.formatDate(milestone.dueDate)}
- **Descrição**: ${milestone.description}
${milestone.releases?.length ? 
`- **Releases Associadas**: ${milestone.releases.map(r => r.version).join(', ')}` : 
'- **Releases**: Nenhuma'}
${milestone.dependencies?.length ? 
`- **Dependências**: ${milestone.dependencies.map(d => d.name).join(', ')}` : 
'- **Dependências**: Nenhuma'}
      
    ${this.generateReleasesTable(milestone.releases)}
      `).join('\n');

    return `
## 🎯 Milestones

${milestonesContent}
`;
  }

  private generateReleasesTable(releases?: Release[]): string {
    if (!releases?.length) return '';

    return `
#### Releases
| Versão | Nome | Status | Data Prevista | Data Release |
|--------|------|--------|---------------|--------------|
${releases.map(release => 
  `| ${release.version} | ${release.name} | ${this.getStatusEmoji(release.status || 'PLANNED')} ${release.status} | ${this.formatDate(release.dueDate)} | ${this.formatDate(release.releasedDate || '')} |`
).join('\n')}

${this.generateIssuesTable(releases)}
`;
  }

  private generateIssuesTable(releases?: Release[]): string {
    if (!releases?.length) return '';

    const allIssues = releases.flatMap(release => release.issues || []);
    if (!allIssues.length) return '';

    return `
#### Issues
| Key | Tipo | Título | Status | Labels |
|-----|------|--------|--------|--------|
${allIssues.map(issue => 
  `| ${issue.id || 'N/A'} | ${issue.type} | ${issue.title || 'N/A'} | ${issue.status || 'N/A'} | ${issue.labels?.join(', ') || 'N/A'} |`
).join('\n')}
`;
  }

  private generateProgressOverview(roadmap: Roadmap): string {
    const milestones = roadmap.milestones || [];

    const statusCount = {
      total: milestones.length,
      completed: milestones.filter(m => m.status === 'COMPLETED').length,
      inProgress: milestones.filter(m => m.status === 'IN_PROGRESS').length,
      planned: milestones.filter(m => m.status === 'PLANNED').length,
      delayed: milestones.filter(m => m.status === 'DELAYED').length
    };

    return `
## 📊 Visão Geral do Progresso

Status atual do roadmap:
- Total de Milestones: ${statusCount.total}
- Concluídos: ${statusCount.completed}
- Em Progresso: ${statusCount.inProgress}
- Planejados: ${statusCount.planned}
- Atrasados: ${statusCount.delayed}

Progresso: ${statusCount.total ? Math.round((statusCount.completed / statusCount.total) * 100) : 0}%
`;
  }

  private generateTimeline(roadmap: Roadmap): string {
    if (!roadmap.milestones?.length) return '';

    const timelineItems = roadmap.milestones
      .flatMap(milestone => [
        {
          date: milestone.startDate,
          type: 'Milestone Start',
          name: milestone.name,
          status: milestone.status
        },
        {
          date: milestone.dueDate,
          type: 'Milestone Due',
          name: milestone.name,
          status: milestone.status
        },
        ...(milestone.releases?.map(release => ({
          date: release.dueDate,
          type: 'Release',
          name: `${release.version} - ${release.name}`,
          status: release.status
        })) || [])
      ])
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return `
## 📅 Timeline

${timelineItems.map(item => 
  `- ${this.formatDate(item.date)} - ${this.getStatusEmoji(item.status || 'PLANNED')} **${item.type}**: ${item.name}`
).join('\n')}
`;
  }

  public generateReport(): string {
    let report = '# 🎯 Roadmaps\n\n';

    this.roadmaps.forEach(roadmap => {
      report += `# ${roadmap.name || 'Roadmap sem nome'}\n\n`;
      report += roadmap.description ? `${roadmap.description}\n\n` : '';
      report += this.generateProgressOverview(roadmap);
      report += this.generateMilestonesSection(roadmap);
      report += this.generateTimeline(roadmap);
    });

    return report;
  }

  public generateSingleRoadmapReport(roadmapId: string): string | null {
    const roadmap = this.roadmaps.find(r => r.id === roadmapId);
    if (!roadmap) return null;

    return `# ${roadmap.name || 'Relatório de Progresso do Roadmap'}

${roadmap.description || ''}

${this.generateProgressOverview(roadmap)}
${this.generateMilestonesSection(roadmap)}
${this.generateTimeline(roadmap)}
`;
  }
}

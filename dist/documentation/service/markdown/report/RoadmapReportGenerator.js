"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoadmapReportGenerator = void 0;
class RoadmapReportGenerator {
    constructor(roadmaps) {
        this.roadmaps = roadmaps;
    }
    formatDate(dateStr) {
        if (!dateStr)
            return 'N/A';
        try {
            // Verifica se a data já está no formato brasileiro (dd/mm/yyyy)
            if (dateStr.includes('/')) {
                const [day, month, year] = dateStr.split('/');
                const date = new Date(`${year}-${month}-${day}`);
                if (isNaN(date.getTime()))
                    return 'N/A';
                return dateStr;
            }
            // Se estiver no formato ISO (yyyy-mm-dd)
            const date = new Date(dateStr);
            if (isNaN(date.getTime()))
                return 'N/A';
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        }
        catch (error) {
            console.error('Erro ao formatar data:', error);
            return 'N/A';
        }
    }
    getStatusEmoji(status) {
        const statusEmojis = {
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
    generateMilestonesSection(roadmap) {
        var _a;
        if (!((_a = roadmap.milestones) === null || _a === void 0 ? void 0 : _a.length))
            return '';
        const milestonesContent = roadmap.milestones.map(milestone => {
            var _a, _b;
            return `
### ${this.getStatusEmoji(milestone.status || 'PLANNED')} ${milestone.name} (${milestone.status})
- **Início**: ${this.formatDate(milestone.startDate)}
- **Conclusão${milestone.status !== 'COMPLETED' ? ' Prevista' : ''}**: ${this.formatDate(milestone.dueDate)}
- **Descrição**: ${milestone.description}
${((_a = milestone.releases) === null || _a === void 0 ? void 0 : _a.length) ?
                `- **Releases Associadas**: ${milestone.releases.map(r => r.version).join(', ')}` :
                '- **Releases**: Nenhuma'}
${((_b = milestone.dependencies) === null || _b === void 0 ? void 0 : _b.length) ?
                `- **Dependências**: ${milestone.dependencies.map(d => d.name).join(', ')}` :
                '- **Dependências**: Nenhuma'}
      
    ${this.generateReleasesTable(milestone.releases)}
      `;
        }).join('\n');
        return `
## 🎯 Milestones

${milestonesContent}
`;
    }
    generateReleasesTable(releases) {
        if (!(releases === null || releases === void 0 ? void 0 : releases.length))
            return '';
        return `
#### Releases
| Versão | Nome | Status | Data Prevista | Data Release |
|--------|------|--------|---------------|--------------|
${releases.map(release => `| ${release.version} | ${release.name} | ${this.getStatusEmoji(release.status || 'PLANNED')} ${release.status} | ${this.formatDate(release.dueDate)} | ${this.formatDate(release.releasedDate || '')} |`).join('\n')}

${this.generateIssuesTable(releases)}
`;
    }
    generateIssuesTable(releases) {
        if (!(releases === null || releases === void 0 ? void 0 : releases.length))
            return '';
        const allIssues = releases.flatMap(release => release.issues || []);
        if (!allIssues.length)
            return '';
        return `
#### Issues
| Key | Tipo | Título | Status | Labels |
|-----|------|--------|--------|--------|
${allIssues.map(issue => { var _a; return `| ${issue.id || 'N/A'} | ${issue.type} | ${issue.title || 'N/A'} | ${issue.status || 'N/A'} | ${((_a = issue.labels) === null || _a === void 0 ? void 0 : _a.join(', ')) || 'N/A'} |`; }).join('\n')}
`;
    }
    generateProgressOverview(roadmap) {
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
    generateTimeline(roadmap) {
        var _a;
        if (!((_a = roadmap.milestones) === null || _a === void 0 ? void 0 : _a.length))
            return '';
        const timelineItems = roadmap.milestones
            .flatMap(milestone => {
            var _a;
            return [
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
                ...(((_a = milestone.releases) === null || _a === void 0 ? void 0 : _a.map(release => ({
                    date: release.dueDate,
                    type: 'Release',
                    name: `${release.version} - ${release.name}`,
                    status: release.status
                }))) || [])
            ];
        })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return `
## 📅 Timeline

${timelineItems.map(item => `- ${this.formatDate(item.date)} - ${this.getStatusEmoji(item.status || 'PLANNED')} **${item.type}**: ${item.name}`).join('\n')}
`;
    }
    generateReport() {
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
    generateSingleRoadmapReport(roadmapId) {
        const roadmap = this.roadmaps.find(r => r.id === roadmapId);
        if (!roadmap)
            return null;
        return `# ${roadmap.name || 'Relatório de Progresso do Roadmap'}

${roadmap.description || ''}

${this.generateProgressOverview(roadmap)}
${this.generateMilestonesSection(roadmap)}
${this.generateTimeline(roadmap)}
`;
    }
}
exports.RoadmapReportGenerator = RoadmapReportGenerator;

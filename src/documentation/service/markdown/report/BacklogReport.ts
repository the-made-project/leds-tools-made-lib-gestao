
import { Backlog, Issue } from '../../../../model/models.js';

export class BacklogMarkdownConverter {
    private getTypeEmoji(type: string): string {
        switch (type.toLowerCase()) {
            case 'epic':
                return '🌟';
            case 'atomicuserstory':
            case 'userstory':
                return '⭐';
            case 'taskbacklog':
            case 'task':
                return '✅';
            default:
                return '';
        }
    }

    private formatDisplayType(type: string): string {
        switch (type.toLowerCase()) {
            case 'epic':
                return 'Epic';
            case 'atomicuserstory':
                return 'Story';
            case 'taskbacklog':
                return 'Task';
            default:
                return type;
        }
    }

    private formatIssueForTable(issue: Issue, level: number = 0): string[] {
        const titlePrefix = '  '.repeat(level);
        const typeEmoji = this.getTypeEmoji(issue.type);
        const displayType = this.formatDisplayType(issue.type);
        const typeWithEmoji = typeEmoji ? `${typeEmoji} ${displayType}` : displayType;
        
        const row = [
            `${titlePrefix}${issue.id.toLocaleLowerCase()}`,            
            typeWithEmoji,
            issue.title || '-',
            issue.description || '-',
            issue.status || '-',
            issue.depends?.map(d => d.id).join(', ') || '-'
        ];

        let rows = [row.join(' | ')];

        if (issue.issues && issue.issues.length > 0) {
            issue.issues.forEach(subIssue => {
                rows = rows.concat(this.formatIssueForTable(subIssue, level + 1));
            });
        }

        return rows;
    }

    public convertBacklogsToMarkdown(backlogs: Backlog[]): string {
        let markdown = '# 📋 Backlogs\n\n';
        
        const headers = [
            'ID',            
            'Tipo',
            'Título',
            'Descrição',
            'Status',
            'Dependências'
        ];

        backlogs.forEach((backlog, index) => {
            markdown += `## ${backlog.name}\n\n`;
            
            if (backlog.description) {
                markdown += `${backlog.description}\n\n`;
            }
            
            if (backlog.issues && backlog.issues.length > 0) {
                markdown += '### Issues\n\n';
                
                markdown += `| ${headers.join(' | ')} |\n`;
                markdown += `| ${headers.map(() => '---').join(' | ')} |\n`;
                
                backlog.issues.forEach(issue => {
                    const rows = this.formatIssueForTable(issue);
                    rows.forEach(row => {
                        markdown += `| ${row} |\n`;
                    });
                });
                
                markdown += '\n';
            } else {
                markdown += 'Nenhuma issue encontrada neste backlog.\n\n';
            }
            
            if (index < backlogs.length - 1) {
                markdown += '---\n\n';
            }
        });
        
        return markdown;
    }
}
import { TimeBox, SprintItem } from '../../../../../model/models.js';
import { parseDate } from '../../../../../util/date-util.js';

export class TimeBoxGanttGenerator {
    private static readonly MERMAID_FORMAT = 'YYYY-MM-DD';

    private isValidDate(date: string | undefined): boolean {
        if (!date) return false;
        return parseDate(date) !== null;
    }

    private formatMermaidDate(date: string | undefined): string {
        if (!this.isValidDate(date)) return '';
        const parsedDate = parseDate(date!);
        const ano = parsedDate.getFullYear();
        const mes = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const dia = String(parsedDate.getDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
    }

    private getTaskStyle(sprintItem: SprintItem): string {
        if (this.isValidDate(sprintItem.startDate) && this.isValidDate(sprintItem.dueDate)) {
            return 'done';  // Concluída
        }
        if (this.isValidDate(sprintItem.startDate)) {
            return 'active';  // Em execução
        }
        return '';  // Planejada (estilo padrão)
    }

    private generateSprintSection(timeBox: TimeBox): string {
        let section = `\n    section Sprint - ${timeBox.name}\n`;
        
        // Adiciona todas as tarefas do Sprint
        timeBox.sprintItems?.forEach(item => {
            if (!item) return;
            
            const taskTitle = item.issue?.title || `Task ${item.issue?.key || item.id}`;
            const taskStyle = this.getTaskStyle(item);

            // Adiciona barra planejada apenas se ambas as datas forem válidas
            if (this.isValidDate(item.plannedStartDate) && this.isValidDate(item.plannedDueDate)) {
                section += `    ${taskTitle} (Planejado) :${taskTitle}_plan, ${this.formatMermaidDate(item.plannedStartDate)}, ${this.formatMermaidDate(item.plannedDueDate)}\n`;
            }

            // Adiciona barra real apenas se pelo menos a data inicial for válida
            if (this.isValidDate(item.startDate)) {
                const endDate = this.isValidDate(item.dueDate) ? item.dueDate : item.plannedDueDate;
                if (this.isValidDate(endDate)) {
                    section += `    ${taskTitle} (Real) :${taskStyle}, ${taskTitle}_actual, ${this.formatMermaidDate(item.startDate)}, ${this.formatMermaidDate(endDate)}\n`;
                }
            }
        });

        return section;
    }

    public generateMermaidGantt(timeBox: TimeBox): string {
        let ganttChart = '```mermaid\n';
        ganttChart += 'gantt\n';
        ganttChart += `    dateFormat ${TimeBoxGanttGenerator.MERMAID_FORMAT}\n`;
        ganttChart += '    axisFormat %d/%m\n\n';

        // Gerar seção para o Sprint
        ganttChart += this.generateSprintSection(timeBox);
        ganttChart += '```';

        return ganttChart;
    }
}
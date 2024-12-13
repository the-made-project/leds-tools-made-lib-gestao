import { format } from 'date-fns';

import { TimeBox, SprintItem } from '../../../../../model/models.js';

export class TimeBoxGanttGenerator {
    private static readonly DATE_FORMAT = 'yyyy-MM-dd';

    private formatDate(date: string | undefined): string {
        if (!date) return '';
        return format(new Date(date), TimeBoxGanttGenerator.DATE_FORMAT);
    }

    private getSprintStyle(status?: string): string {
        switch (status) {
            case 'PLANNED':
                return 'crit';
            case 'IN_PROGRESS':
                return 'active, crit';
            case 'CLOSED':
                return 'done, crit';
            default:
                return 'crit';
        }
    }

    private getTaskStyle(sprintItem: SprintItem, timeBoxStatus?: string): string {
        if (timeBoxStatus === 'CLOSED' || sprintItem.status?.toLowerCase() === 'completed') {
            return 'done';
        }
        if (this.isDelayed(sprintItem)) {
            return 'crit';
        }
        return 'active';
    }

    private isDelayed(item: SprintItem): boolean {
        if (!item.dueDate || !item.planneddueDate) return false;
        return new Date(item.dueDate) > new Date(item.planneddueDate);
    }

    private generateSprintSection(timeBox: TimeBox): string {
        const sprintStyle = this.getSprintStyle(timeBox.status);
        let section = `\n    section Sprint - ${timeBox.name}\n`;
        
        // Adiciona a barra do Sprint (TimeBox)
        section += `    ${timeBox.description} :${sprintStyle}, sprint_${timeBox.id}, ${this.formatDate(timeBox.startDate)}, ${this.formatDate(timeBox.endDate)}\n`;
        
        // Adiciona todas as tarefas do Sprint
        timeBox.sprintItems.forEach(item => {
            const taskId = item.issue.key || item.id;
            const taskTitle = item.issue.title || `Task ${taskId}`;
            const taskStyle = this.getTaskStyle(item, timeBox.status);

            // Adiciona barra planejada
            if (item.plannedStartDate && item.planneddueDate) {
                section += `    ${taskTitle} (Planejado) :${taskId}_plan, ${this.formatDate(item.plannedStartDate)}, ${this.formatDate(item.planneddueDate)}\n`;
            }

            // Adiciona barra real
            if (item.startDate && item.dueDate) {
                section += `    ${taskTitle} (Real) :${taskStyle}, ${taskId}_actual, ${this.formatDate(item.startDate)}, ${this.formatDate(item.dueDate)}\n`;
            }
        });

        return section;
    }

    private generateDependencies(timeBox: TimeBox): string {
        let dependencies = '';
        timeBox.sprintItems.forEach(item => {
            if (item.issue.depends?.length) {
                item.issue.depends.forEach(dep => {
                    dependencies += `    ${dep.key || dep.id}_actual --> ${item.issue.key || item.id}_actual\n`;
                });
            }
        });
        return dependencies;
    }

    public generateMermaidGantt(timeBoxes: TimeBox[]): string {
        let ganttChart = 'gantt\n';
        ganttChart += '    title Sprints e Tarefas - Gráfico Gantt\n';
        ganttChart += `    dateFormat ${TimeBoxGanttGenerator.DATE_FORMAT}\n`;
        ganttChart += '    axisFormat %d/%m\n\n';

        // Gerar seções para cada Sprint
        timeBoxes.forEach(timeBox => {
            ganttChart += this.generateSprintSection(timeBox);
        });

        // Seção de dependências
        let dependencies = '';
        timeBoxes.forEach(timeBox => {
            dependencies += this.generateDependencies(timeBox);
        });

        if (dependencies) {
            ganttChart += '\n    section Dependências\n';
            ganttChart += dependencies;
        }

        // Adicionar legenda
        ganttChart += '\n    section Legenda\n';
        ganttChart += '    Sprint - Planejado    :crit, sprint_planned_legend, 2024-01-01, 2024-01-02\n';
        ganttChart += '    Sprint - Em Andamento :active, crit, sprint_active_legend, 2024-01-01, 2024-01-02\n';
        ganttChart += '    Sprint - Fechado      :done, crit, sprint_done_legend, 2024-01-01, 2024-01-02\n';
        ganttChart += '    Tarefa - Planejada    :task_planned_legend, 2024-01-01, 2024-01-02\n';
        ganttChart += '    Tarefa - Em Andamento :active, task_active_legend, 2024-01-01, 2024-01-02\n';
        ganttChart += '    Tarefa - Atrasada     :crit, task_delayed_legend, 2024-01-01, 2024-01-02\n';
        ganttChart += '    Tarefa - Concluída    :done, task_done_legend, 2024-01-01, 2024-01-02\n';

        return ganttChart;
    }
}

/*
// Uso do sistema
const generator = new GanttChartGenerator();
const ganttChart = generator.generateMermaidGantt(exampleTimeBoxes);
console.log(ganttChart);*/
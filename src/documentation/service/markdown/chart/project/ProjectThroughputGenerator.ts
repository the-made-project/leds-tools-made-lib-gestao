import * as fs from 'fs';
import { TimeBox } from '../../../../../model/models.js';
import { parseDate } from '../../../../../util/date-util.js';

export class ProjectThroughputGenerator {
    private sprints: TimeBox[];
    private readonly outputPath: string;
  
    constructor(sprints: TimeBox[], outputPath: string = './project-throughput.svg') {
      this.sprints = this.sortSprints(sprints);
      this.outputPath = outputPath;
    }

    private determineTaskStatus(task: { startDate?: string; dueDate?: string }): string {
      if (!task.startDate) {
        return "TODO";
      } else if (task.startDate && !task.dueDate) {
        return "DOING";
      } else if (task.startDate && task.dueDate) {
        return "DONE";
      }
      return "TODO"; // Default fallback
    }

    private sortSprints(sprints: TimeBox[]): TimeBox[] {
      return sprints.sort((a, b) => 
        parseDate(a.startDate).getTime() - 
        parseDate(b.startDate).getTime()
      );
    }
  
    private processData() {
      const formatDate = (date: Date) => {
        const dia = date.getDate().toString().padStart(2, '0');
        const mes = (date.getMonth() + 1).toString().padStart(2, '0');
        return `${dia}/${mes}`;
      };
  
      const startDate = parseDate(this.sprints[0].startDate);
      const endDate = parseDate(this.sprints[this.sprints.length - 1].endDate);
      const days: { day: string; date: Date; done: number }[] = [];
      
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const weekDay = currentDate.toLocaleDateString('pt-BR', { weekday: 'short' });
        const formattedDate = formatDate(currentDate);
        
        const allTasksUntilDay = this.sprints.flatMap(sprint => {
          return sprint.sprintItems.filter(task => {
            const taskDueDate = task.dueDate ? parseDate(task.dueDate) : null;
            return taskDueDate ? taskDueDate.toDateString() === currentDate.toDateString() : false;
          });
        });
  
        days.push({
          day: `${weekDay} ${formattedDate}`,
          date: new Date(currentDate),
          done: allTasksUntilDay.filter(task => this.determineTaskStatus(task) === "DONE").length
        });
  
        currentDate.setDate(currentDate.getDate() + 1);
      }
  
      return days;
    }
  
    private generateSVG(): string {
      const width = 1200;
      const height = 600;
      const margin = { top: 50, right: 150, bottom: 100, left: 70 };
      const colors = {
        done: '#22c55e',
        grid: '#e5e7eb',
        text: '#000000',
        lightText: '#666666'
      };
  
      const dailyData = this.processData();
      const totalTasks = this.sprints.reduce((sum, sprint) => sum + sprint.sprintItems.length, 0);
      const maxDailyDone = Math.max(...dailyData.map(d => d.done));

      if (totalTasks === 0) {
        throw new Error('Não há tarefas para gerar o gráfico');
      }

      const chartWidth = width - margin.left - margin.right;
      const chartHeight = height - margin.top - margin.bottom;
      const barWidth = Math.min((chartWidth / dailyData.length) * 0.8, 50);
      const barSpacing = Math.max((chartWidth / dailyData.length) * 0.2, 10);
  
      let svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
          <defs>
            <style>
              text { font-family: Arial, sans-serif; }
              .title { font-size: 24px; font-weight: bold; }
              .label { font-size: 14px; }
              .value { font-size: 12px; fill: ${colors.lightText}; }
              .axis { font-size: 12px; }
              .legend { font-size: 14px; }
            </style>
          </defs>
          
          <rect width="${width}" height="${height}" fill="white"/>
          
          ${Array.from({ length: 11 }, (_, i) => {
            const y = margin.top + (i * (chartHeight / 10));
            const value = Math.round(maxDailyDone - (i * (maxDailyDone / 10)));
            return `
              <line 
                x1="${margin.left}" 
                y1="${y}" 
                x2="${width - margin.right}" 
                y2="${y}" 
                stroke="${colors.grid}" 
                stroke-dasharray="4"
              />
              <text 
                x="${margin.left - 10}" 
                y="${y}" 
                text-anchor="end" 
                class="axis" 
                dominant-baseline="middle"
              >${value}</text>
            `;
          }).join('')}
          
          <line 
            x1="${margin.left}" 
            y1="${margin.top}" 
            x2="${margin.left}" 
            y2="${height - margin.bottom}" 
            stroke="black" 
            stroke-width="2"
          />
          <line 
            x1="${margin.left}" 
            y1="${height - margin.bottom}" 
            x2="${width - margin.right}" 
            y2="${height - margin.bottom}" 
            stroke="black" 
            stroke-width="2"
          />
          
          ${dailyData.map((day, i) => {
            if (dailyData.length <= 14 || i % 2 === 0) {
              const x = margin.left + (i * (chartWidth / dailyData.length)) + barSpacing/2;
              const barHeight = (day.done / maxDailyDone) * chartHeight;
              
              return `
                <g>
                  ${day.done > 0 ? `
                    <rect 
                      x="${x}" 
                      y="${height - margin.bottom - barHeight}" 
                      width="${barWidth}" 
                      height="${barHeight}" 
                      fill="${colors.done}"
                      rx="4"
                    />
                    <text 
                      x="${x + barWidth/2}" 
                      y="${height - margin.bottom - barHeight/2}" 
                      text-anchor="middle" 
                      class="value"
                      fill="white"
                    >${day.done}</text>
                  ` : ''}
                  
                  <text 
                    transform="rotate(-45 ${x + barWidth/2} ${height - margin.bottom + 20})" 
                    x="${x + barWidth/2}" 
                    y="${height - margin.bottom + 20}" 
                    text-anchor="end" 
                    class="axis"
                  >${day.day}</text>
                </g>
              `;
            }
            return '';
          }).join('')}
          
          <text 
            transform="rotate(-90 ${margin.left - 40} ${height/2})" 
            x="${margin.left - 40}" 
            y="${height/2}" 
            text-anchor="middle" 
            class="label"
          >Tarefas Concluídas</text>
          
          <text 
            x="${width/2}" 
            y="${height - 20}" 
            text-anchor="middle" 
            class="label"
          >Período do Projeto</text>
          
          <text 
            x="${width/2}" 
            y="30" 
            text-anchor="middle" 
            class="title"
          >Throughput Diário (Tarefas Concluídas)</text>
          
          <g transform="translate(${width - margin.right + 20}, ${margin.top})">
            <rect width="15" height="15" fill="${colors.done}" rx="2"/>
            <text x="25" y="12" class="legend">Concluídas</text>
            
            <text x="0" y="90" class="value">
              Período: ${this.sprints[0].startDate} - 
              ${this.sprints[this.sprints.length - 1].endDate}
            </text>
            <text x="0" y="110" class="value">
              Total de Tasks: ${totalTasks}
            </text>
            <text x="0" y="130" class="value">
              Total de Sprints: ${this.sprints.length}
            </text>
          </g>
        </svg>
      `;
  
      return svg;
    }
  
    public generate(): void {
      try {
        const svg = this.generateSVG();
        fs.writeFileSync(this.outputPath, svg);
        console.log(`Throughput gerado com sucesso em: ${this.outputPath}`);
      } catch (error) {
        console.error('Erro ao gerar Throughput:', error);
        throw error;
      }
    }
}
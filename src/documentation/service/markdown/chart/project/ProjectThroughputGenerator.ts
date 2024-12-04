
import * as fs from 'fs';
import { TimeBox } from '../../../../../model/models.js';

export class ProjectThroughputGenerator {
    private sprints: TimeBox[];
    private readonly outputPath: string;
  
    constructor(sprints: TimeBox[], outputPath: string = './project-throughput.svg') {
      this.sprints = this.sortSprints(sprints);
      this.outputPath = outputPath;
    }

    private parseBrazilianDate(dateString: string): Date {
      const [day, month, year] = dateString.split('/').map(Number);
      return new Date(year, month - 1, day);
    }

    private sortSprints(sprints: TimeBox[]): TimeBox[] {
      return sprints.sort((a, b) => 
        this.parseBrazilianDate(a.startDate).getTime() - 
        this.parseBrazilianDate(b.startDate).getTime()
      );
    }
  
    private processData() {
      const formatDate = (date: Date) => {
        const dia = date.getDate().toString().padStart(2, '0');
        const mes = (date.getMonth() + 1).toString().padStart(2, '0');
        return `${dia}/${mes}`;
      };
  
      const startDate = this.parseBrazilianDate(this.sprints[0].startDate);
      const endDate = this.parseBrazilianDate(this.sprints[this.sprints.length - 1].endDate);
      const days = [];
      
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const weekDay = currentDate.toLocaleDateString('pt-BR', { weekday: 'short' });
        const formattedDate = formatDate(currentDate);
        
        const allTasksUntilDay = this.sprints.flatMap(sprint => {
          return sprint.sprintItems.filter(task => {
            const taskStartDate = task.startDate ? this.parseBrazilianDate(task.startDate) : null;
            return taskStartDate ? taskStartDate <= currentDate : true;
          });
        });
  
        days.push({
          day: `${weekDay} ${formattedDate}`,
          date: new Date(currentDate),
          todo: allTasksUntilDay.filter(task => task.status === "TODO").length,
          inProgress: allTasksUntilDay.filter(task => 
            task.status === "IN_PROGRESS" || task.status === "DOING"
          ).length,
          done: allTasksUntilDay.filter(task => task.status === "DONE").length
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
        todo: '#ef4444',
        inProgress: '#f59e0b',
        done: '#22c55e',
        grid: '#e5e7eb',
        text: '#000000',
        lightText: '#666666'
      };
  
      const dailyData = this.processData();
      const totalTasks = this.sprints.reduce((sum, sprint) => sum + sprint.sprintItems.length, 0);

      if (totalTasks === 0) {
        throw new Error('Não há tarefas para gerar o gráfico');
      }

      const chartWidth = width - margin.left - margin.right;
      const chartHeight = height - margin.top - margin.bottom;
      const barWidth = Math.min((chartWidth / dailyData.length) * 0.8, 50); // Limita a largura máxima da barra
      const barSpacing = Math.max((chartWidth / dailyData.length) * 0.2, 10); // Garante um espaçamento mínimo
  
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
              >${Math.round(totalTasks - (i * (totalTasks / 10)))}</text>
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
            // Para períodos curtos, mostramos mais labels
            if (dailyData.length <= 14 || i % 2 === 0) {
              const x = margin.left + (i * (chartWidth / dailyData.length)) + barSpacing/2;
              const barHeight = chartHeight / Math.max(1, totalTasks);
              
              const todoHeight = day.todo * barHeight;
              const inProgressHeight = day.inProgress * barHeight;
              const doneHeight = day.done * barHeight;
              
              return `
                <g>
                  <rect 
                    x="${x}" 
                    y="${height - margin.bottom - todoHeight}" 
                    width="${barWidth}" 
                    height="${todoHeight}" 
                    fill="${colors.todo}"
                    rx="4"
                  />
                  
                  <rect 
                    x="${x}" 
                    y="${height - margin.bottom - todoHeight - inProgressHeight}" 
                    width="${barWidth}" 
                    height="${inProgressHeight}" 
                    fill="${colors.inProgress}"
                    rx="4"
                  />
                  
                  <rect 
                    x="${x}" 
                    y="${height - margin.bottom - todoHeight - inProgressHeight - doneHeight}" 
                    width="${barWidth}" 
                    height="${doneHeight}" 
                    fill="${colors.done}"
                    rx="4"
                  />
                  
                  <text 
                    transform="rotate(-45 ${x + barWidth/2} ${height - margin.bottom + 20})" 
                    x="${x + barWidth/2}" 
                    y="${height - margin.bottom + 20}" 
                    text-anchor="end" 
                    class="axis"
                  >${day.day}</text>
                  
                  ${day.todo > 0 ? `
                    <text 
                      x="${x + barWidth/2}" 
                      y="${height - margin.bottom - todoHeight/2}" 
                      text-anchor="middle" 
                      class="value"
                      fill="white"
                    >${day.todo}</text>
                  ` : ''}
                  
                  ${day.inProgress > 0 ? `
                    <text 
                      x="${x + barWidth/2}" 
                      y="${height - margin.bottom - todoHeight - inProgressHeight/2}" 
                      text-anchor="middle" 
                      class="value"
                      fill="white"
                    >${day.inProgress}</text>
                  ` : ''}
                  
                  ${day.done > 0 ? `
                    <text 
                      x="${x + barWidth/2}" 
                      y="${height - margin.bottom - todoHeight - inProgressHeight - doneHeight/2}" 
                      text-anchor="middle" 
                      class="value"
                      fill="white"
                    >${day.done}</text>
                  ` : ''}
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
          >Número de Tarefas</text>
          
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
          >Throughput do Projeto</text>
          
          <g transform="translate(${width - margin.right + 20}, ${margin.top})">
            <rect width="15" height="15" fill="${colors.todo}" rx="2"/>
            <text x="25" y="12" class="legend">TODO</text>
            
            <rect y="25" width="15" height="15" fill="${colors.inProgress}" rx="2"/>
            <text x="25" y="37" class="legend">DOING</text>
            
            <rect y="50" width="15" height="15" fill="${colors.done}" rx="2"/>
            <text x="25" y="62" class="legend">DONE</text>
            
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
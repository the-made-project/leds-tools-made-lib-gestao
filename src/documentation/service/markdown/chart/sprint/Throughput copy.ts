import * as fs from 'fs';
import { TimeBox } from '../../../../../model/models.js';

export class ThroughputGenerator {
  private data: TimeBox;
  private readonly outputPath: string;

  constructor(sprintData: TimeBox, outputPath: string = './throughput.svg') {
    if (!sprintData) {
      throw new Error('Dados da sprint não fornecidos');
    }
    this.data = sprintData;
    this.outputPath = outputPath;
  }

  private parseBrazilianDate(dateString: string): Date {
    try {
      const [day, month, year] = dateString.split('/').map(Number);
      const date = new Date(year, month - 1, day);
      
      if (isNaN(date.getTime())) {
        throw new Error(`Data inválida: ${dateString}`);
      }
      
      return date;
    } catch (error) {
      throw new Error(`Erro ao processar data ${dateString}: ${error}`);
    }
  }

  private formatDate(date: Date) {
    const dia = date.getDate().toString().padStart(2, '0');
    const mes = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${dia}/${mes}`;
  }

  private processData() {
    try {
      const startDate = this.parseBrazilianDate(this.data.startDate);
      const endDate = this.parseBrazilianDate(this.data.endDate);
      const days = [];
      
      if (endDate < startDate) {
        throw new Error('Data de fim é anterior à data de início');
      }

      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const weekDay = currentDate.toLocaleDateString('pt-BR', { weekday: 'short' });
        const formattedDate = this.formatDate(currentDate);
        const issuesUntilDay = this.data.sprintItems.filter(issue => {
          if (!issue.startDate) return false;
          const issueStartDate = this.parseBrazilianDate(issue.startDate);
          return issueStartDate <= currentDate;
        });

        days.push({
          day: `${weekDay} ${formattedDate}`,
          date: new Date(currentDate),
          todo: issuesUntilDay.filter(issue => issue.status === "TODO").length,
          inProgress: issuesUntilDay.filter(issue => 
            issue.status === "IN_PROGRESS" || issue.status === "DOING"
          ).length,
          done: issuesUntilDay.filter(issue => issue.status === "DONE").length
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return days;
    } catch (error) {
      console.error('Erro ao processar dados:', error);
      throw error;
    }
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

    try {
      const dailyData = this.processData();
      const totalIssues = this.data.sprintItems.length;

      if (totalIssues === 0) {
        throw new Error('Não há issues para gerar o gráfico');
      }

      const chartWidth = width - margin.left - margin.right;
      const chartHeight = height - margin.top - margin.bottom;
      const barWidth = Math.min((chartWidth / dailyData.length) * 0.8, 50); // Limita largura máxima
      const barSpacing = Math.max((chartWidth / dailyData.length) * 0.2, 10); // Garante espaçamento mínimo

      let svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
          <defs>
            <style>
              text { font-family: Arial, sans-serif; }
              .title { font-size: 24px; font-weight: bold; }
              .label { font-size: 14px; }
              .value { font-size: 12px; fill: white; }
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
              >${Math.round(totalIssues - (i * (totalIssues / 10)))}</text>
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
            const x = margin.left + (i * (chartWidth / dailyData.length)) + barSpacing/2;
            const barHeight = chartHeight / Math.max(1, totalIssues);
            
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
                  >${day.todo}</text>
                ` : ''}
                
                ${day.inProgress > 0 ? `
                  <text 
                    x="${x + barWidth/2}" 
                    y="${height - margin.bottom - todoHeight - inProgressHeight/2}" 
                    text-anchor="middle" 
                    class="value"
                  >${day.inProgress}</text>
                ` : ''}
                
                ${day.done > 0 ? `
                  <text 
                    x="${x + barWidth/2}" 
                    y="${height - margin.bottom - todoHeight - inProgressHeight - doneHeight/2}" 
                    text-anchor="middle" 
                    class="value"
                  >${day.done}</text>
                ` : ''}
              </g>
            `;
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
          >Dias da Sprint</text>
          
          <text 
            x="${width/2}" 
            y="30" 
            text-anchor="middle" 
            class="title"
          >${this.data.name} - Throughput</text>
          
          <g transform="translate(${width - margin.right + 20}, ${margin.top})">
            <rect width="15" height="15" fill="${colors.todo}" rx="2"/>
            <text x="25" y="12" class="legend">TODO</text>
            
            <rect y="25" width="15" height="15" fill="${colors.inProgress}" rx="2"/>
            <text x="25" y="37" class="legend">DOING</text>
            
            <rect y="50" width="15" height="15" fill="${colors.done}" rx="2"/>
            <text x="25" y="62" class="legend">DONE</text>
            
            <text x="0" y="90" class="value" fill="${colors.lightText}">
              Período: ${this.data.startDate} - ${this.data.endDate}
            </text>
            <text x="0" y="110" class="value" fill="${colors.lightText}">
              Total de Issues: ${totalIssues}
            </text>
          </g>
        </svg>
      `;

      return svg;
    } catch (error) {
      console.error('Erro ao gerar SVG:', error);
      throw error;
    }
  }

  public generate(): void {
    try {
      const svg = this.generateSVG();
      fs.writeFileSync(this.outputPath, svg);
      console.log(`Throughput gerado com sucesso em: ${this.outputPath}`);
    } catch (error) {
      console.error('Erro ao gerar throughput:', error);
      throw error;
    }
  }
}
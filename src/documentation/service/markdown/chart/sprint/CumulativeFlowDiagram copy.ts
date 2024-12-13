import * as fs from 'fs';
import { TimeBox } from '../../../../../model/models.js';

export class CumulativeFlowDiagram {
  private data: TimeBox;
  private readonly outputPath: string;

  constructor(sprintData: TimeBox, outputPath: string = './cfd.svg') {
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
      
      if (endDate < startDate) {
        throw new Error('Data de fim é anterior à data de início');
      }

      const days = [];
      let currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const weekDay = currentDate.toLocaleDateString('pt-BR', { weekday: 'short' });
        const formattedDate = this.formatDate(currentDate);

        // Calcula as issues em cada estado para o dia atual
        const issueStates = this.data.sprintItems.map(issue => {
          // Se não tem data de início, está em TODO
          if (!issue.startDate) return 'todo';

          const startDate = this.parseBrazilianDate(issue.startDate);
          
          // Se a data de início é futura em relação à data atual, está em TODO
          if (startDate > currentDate) return 'todo';
          
          // Se tem data de conclusão e já foi concluída até a data atual, está DONE
          if (issue.completedDate) {
            const completedDate = this.parseBrazilianDate(issue.completedDate);
            if (completedDate <= currentDate) return 'done';
          }
          
          // Se já começou mas não foi concluída ou a conclusão é futura, está IN_PROGRESS
          if (startDate <= currentDate) return 'inProgress';
          
          // Caso padrão (não deveria ocorrer com a lógica acima)
          return 'todo';
        });

        // Conta o número de issues em cada estado
        const statusCounts = {
          todo: issueStates.filter(state => state === 'todo').length,
          inProgress: issueStates.filter(state => state === 'inProgress').length,
          done: issueStates.filter(state => state === 'done').length
        };

        days.push({
          day: `${weekDay} ${formattedDate}`,
          date: new Date(currentDate),
          ...statusCounts
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

      const xScale = (date: Date) => {
        const startDate = this.parseBrazilianDate(this.data.startDate);
        const totalDays = Math.max(1, dailyData.length - 1);
        const dayIndex = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        return margin.left + (dayIndex * (chartWidth / totalDays));
      };

      const yScale = (value: number) => {
        return height - margin.bottom - (value * (chartHeight / Math.max(1, totalIssues)));
      };

      const generateArea = (data: any[], getValue: (d: any) => number) => {
        if (data.length === 0) return '';

        const points = data.map(d => {
          const x = xScale(d.date);
          const y = yScale(getValue(d));
          return `${x},${y}`;
        });

        const bottomPoints = data.map(d => {
          const x = xScale(d.date);
          return `${x},${height - margin.bottom}`;
        }).reverse();

        return `M${points.join(' L')} L${bottomPoints.join(' L')} Z`;
      };

      const svg = `
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
              >${Math.round(totalIssues - (i * (totalIssues / 10)))}</text>
            `;
          }).join('')}

          <path 
            d="${generateArea(dailyData, d => d.todo + d.inProgress + d.done)}" 
            fill="${colors.todo}" 
            opacity="0.8"
          />
          <path 
            d="${generateArea(dailyData, d => d.inProgress + d.done)}" 
            fill="${colors.inProgress}" 
            opacity="0.8"
          />
          <path 
            d="${generateArea(dailyData, d => d.done)}" 
            fill="${colors.done}" 
            opacity="0.8"
          />

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

          ${dailyData.map((d, i) => {
            if (dailyData.length <= 14 || i % 2 === 0) {
              const x = xScale(d.date);
              return `
                <text 
                  transform="rotate(-45 ${x} ${height - margin.bottom + 20})"
                  x="${x}"
                  y="${height - margin.bottom + 20}"
                  text-anchor="end"
                  class="axis"
                >${d.day}</text>
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
          >Dias da Sprint</text>

          <text 
            x="${width/2}" 
            y="30" 
            text-anchor="middle" 
            class="title"
          >${this.data.name} - Cumulative Flow Diagram</text>

          <g transform="translate(${width - margin.right + 20}, ${margin.top})">
            <rect width="15" height="15" fill="${colors.todo}" rx="2"/>
            <text x="25" y="12" class="legend">A Fazer</text>
            
            <rect y="25" width="15" height="15" fill="${colors.inProgress}" rx="2"/>
            <text x="25" y="37" class="legend">Em Andamento</text>
            
            <rect y="50" width="15" height="15" fill="${colors.done}" rx="2"/>
            <text x="25" y="62" class="legend">Concluído</text>
            
            <text x="0" y="90" class="value">
              Período: ${this.data.startDate} - ${this.data.endDate}
            </text>
            <text x="0" y="110" class="value">
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
      console.log(`CFD gerado com sucesso em: ${this.outputPath}`);
    } catch (error) {
      console.error('Erro ao gerar CFD:', error);
      throw error;
    }
  }
}
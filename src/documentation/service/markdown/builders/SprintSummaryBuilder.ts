export class SprintSummaryBuilder {
    private markdown: string;

    constructor() {
        this.markdown = '';
    }

    public addHeader(
        title: string, 
        description: string
    ): void {
        this.markdown += `# 🎯 Sprint: ${title}\n\n`;
        this.markdown += `> ${description}\n\n`;
    }

    public addGeneralInfoSection(
        startDate: string, 
        endDate: string, 
        status: string, 
        emoji: string, 
        total: number
    ): void {
        this.markdown += `## 📋 Informações Gerais\n\n`;
        this.markdown += `| Período | Status | Total de Tarefas |\n`;
        this.markdown += `|:--------|:-------|:----------------:|\n`;
        this.markdown += `| ${startDate} a ${endDate} | ${emoji} ${status} | ${total} |\n\n`;
    }

    public addThroughputTableSection(
        throughputData: { date: string; count: number }[]
    ): void {
        this.markdown += `## 📈 Análise de Throughput\n\n`;
        this.markdown += `### Throughput Geral do Sprint\n\n`;
        this.markdown += this.generateThroughputTable(throughputData) + '\n';

        const totalDays = throughputData.length;
        const totalCompleted = throughputData[throughputData.length - 1].count;
        const avgDaily = (totalCompleted / totalDays).toFixed(1);
        
        this.markdown += `**Métricas de Velocidade:**\n`;
        this.markdown += `- Média diária de entregas: ${avgDaily} tarefas/dia\n`;
        this.markdown += `- Total de dias com entregas: ${totalDays}\n`;
        this.markdown += `- Total de tarefas entregues: ${totalCompleted}\n\n`;
    }

    private generateThroughputTable(
        throughputData: { date: string; count: number }[]
    ): string {
        if (throughputData.length === 0) return '';

        let table = `| Data | Tarefas Concluídas | Total Acumulado |\n`;
        table += `|:-----|:-----------------:|:---------------:|\n`;

        let previousCount = 0;
        throughputData.forEach(({ date, count }) => {
          const dailyCount = count - previousCount;
          const formattedDate = new Date(date).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
          });
          table += `| ${formattedDate} | ${dailyCount} | ${count} |\n`;
          previousCount = count;
      });

      return table;
    }
}
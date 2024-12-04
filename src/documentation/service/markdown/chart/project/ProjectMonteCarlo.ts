import { TimeBox } from '../../../../../model/models.js';

export class ProjectMonteCarlo {
  private sprints: TimeBox[];
  private readonly simulations: number;

  constructor(sprintsData: TimeBox[], simulations: number = 10000) {
    if (!sprintsData || sprintsData.length === 0) {
      throw new Error('Dados de sprints inválidos ou vazios');
    }
    this.sprints = this.sortSprints(sprintsData);
    this.simulations = simulations;
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

  private calculateDailyVelocity(): number[] {
    const velocities: number[] = [];
    const completedTasks = this.sprints.flatMap(sprint => 
      sprint.sprintItems.filter(task => task.status === "DONE")
    );
    
    if (completedTasks.length > 0) {
      const days = new Map<string, number>();
      
      completedTasks.forEach(task => {
        const date = task.dueDate?.split('T')[0] || task.startDate?.split('T')[0];
        if (date) {
          days.set(date, (days.get(date) || 0) + 1);
        }
      });

      days.forEach(tasksCompleted => {
        velocities.push(tasksCompleted);
      });
    }

    return velocities.length > 0 ? velocities : [1]; // Retorna [1] como velocidade padrão se não houver dados
  }

  private getProjectMetrics() {
    const totalTasks = this.sprints.reduce((sum, sprint) => sum + sprint.sprintItems.length, 0);
    const completedTasks = this.sprints.reduce((sum, sprint) => 
      sum + sprint.sprintItems.filter(t => t.status === "DONE").length, 0
    );
    const remainingTasks = totalTasks - completedTasks;
    
    const today = new Date();
    const endDate = this.parseBrazilianDate(this.sprints[this.sprints.length - 1].endDate);
    const diffTime = endDate.getTime() - today.getTime();
    const remainingDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const velocities = this.calculateDailyVelocity();
    const avgVelocity = velocities.reduce((a, b) => a + b, 0) / Math.max(velocities.length, 1);

    return {
      totalTasks,
      completedTasks,
      remainingTasks,
      remainingDays,
      avgVelocity,
      currentVelocity: velocities[velocities.length - 1] || avgVelocity
    };
  }

  private simulateCompletionDates() {
    const velocities = this.calculateDailyVelocity();
    const metrics = this.getProjectMetrics();
    const completionDates: Date[] = [];

    for (let i = 0; i < this.simulations; i++) {
      let simulatedCompleted = metrics.completedTasks;
      let currentDate = new Date();
      let daysAdded = 0;

      while (simulatedCompleted < metrics.totalTasks) {
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
          const dailyVelocity = velocities[Math.floor(Math.random() * velocities.length)];
          simulatedCompleted += dailyVelocity;
        }
        
        currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
        daysAdded++;

        if (daysAdded > 90) break; // Limite de 3 meses para simulação
      }

      if (simulatedCompleted >= metrics.totalTasks) {
        completionDates.push(currentDate);
      }
    }

    if (completionDates.length === 0) {
      completionDates.push(this.parseBrazilianDate(this.sprints[this.sprints.length - 1].endDate));
    }

    const dateFrequencyMap = new Map<string, number>();
    completionDates.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      dateFrequencyMap.set(dateStr, (dateFrequencyMap.get(dateStr) || 0) + 1);
    });

    return Array.from(dateFrequencyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateStr, frequency], _, arr) => {
        const cumulativeFrequency = arr
          .filter(([d]) => d <= dateStr)
          .reduce((sum, [, f]) => sum + f, 0);
        
        return {
          date: new Date(dateStr),
          tasksCompleted: metrics.totalTasks,
          probability: (frequency / this.simulations) * 100,
          cumulativeProbability: (cumulativeFrequency / this.simulations) * 100
        };
      });
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  private getDateStatus(predictedDate: Date, plannedDate: Date): string {
    const diffDays = Math.round((predictedDate.getTime() - plannedDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return '✅ Antes do Prazo';
    if (diffDays === 0) return '✅ No Prazo';
    if (diffDays <= 5) return '⚠️ Pequeno Atraso';
    if (diffDays <= 15) return '⚠️ Atraso Moderado';
    return '❌ Atraso Crítico';
  }

  private getCompletionStatus(probability: number): string {
    if (probability >= 85) return "✅ PROJETO PROVAVELMENTE SERÁ CONCLUÍDO NO PRAZO";
    if (probability >= 50) return "⚠️ RISCO MODERADO DE ATRASO NO PROJETO";
    return "❌ ALTO RISCO DE ATRASO NO PROJETO";
  }

  public generateMarkdownReport(): string {
    try {
      const metrics = this.getProjectMetrics();
      
      // Se não houver tarefas, retorna relatório simplificado
      if (metrics.totalTasks === 0) {
        return `\n\n ## Relatório de Previsão do Projeto - Método Monte Carlo\n\n` +
               `### ⚠️ DADOS INSUFICIENTES PARA ANÁLISE\n\n` +
               `Não há tarefas registradas no projeto para realizar a análise.\n\n`;
      }

      const completionDates = this.simulateCompletionDates();
      const projectEndDate = this.parseBrazilianDate(this.sprints[this.sprints.length - 1].endDate);
      const onTimeProb = completionDates.find(d => d.date > projectEndDate)?.cumulativeProbability || 100;
      
      let mostLikelyDate = completionDates[0];
      if (completionDates.length > 1) {
        mostLikelyDate = completionDates.reduce((prev, current) => 
          current.probability > prev.probability ? current : prev
        );
      }

      let markdown = `\n\n ## Previsão do Projeto \n\n`;
      
      markdown += `## 🎯 Conclusão Principal\n\n`;
      markdown += `### ${this.getCompletionStatus(onTimeProb)}\n\n`;

      markdown += `- **Probabilidade de conclusão no prazo**: ${onTimeProb.toFixed(1)}%\n`;
      markdown += `- **Data mais provável de conclusão**: ${this.formatDate(mostLikelyDate.date)}\n`;
      
      const diffDays = Math.round((mostLikelyDate.date.getTime() - projectEndDate.getTime()) / (1000 * 60 * 60 * 24));
      markdown += `- **Dias em relação ao planejado**: ${diffDays} dias\n`;
      markdown += `- **Status**: ${this.getDateStatus(mostLikelyDate.date, projectEndDate)}\n\n`;

      markdown += `### 📊 Métricas do Projeto\n\n`;
      markdown += `| Métrica | Valor | Status |\n`;
      markdown += `|---------|--------|--------|\n`;
      
      const velocidadeNecessaria = metrics.remainingTasks / metrics.remainingDays;
      const velocidadeStatus = metrics.avgVelocity >= velocidadeNecessaria ? "✅" : "❌";
      
      markdown += `| Velocidade Atual | ${metrics.avgVelocity.toFixed(1)} tarefas/dia | ${velocidadeStatus} |\n`;
      markdown += `| Velocidade Necessária | ${velocidadeNecessaria.toFixed(1)} tarefas/dia | - |\n`;
      markdown += `| Dias Restantes | ${metrics.remainingDays} dias | - |\n`;
      markdown += `| Tarefas Restantes | ${metrics.remainingTasks} tarefas | - |\n\n`;

      markdown += `### 📅 Previsões de Data de Conclusão\n\n`;
      markdown += `| Data | Probabilidade | Status | Observação |\n`;
      markdown += `|------|---------------|---------|------------|\n`;
      
      completionDates.forEach(result => {
        const diffDays = Math.round((result.date.getTime() - projectEndDate.getTime()) / (1000 * 60 * 60 * 24));
        let observation = "";
        if (result.probability === Math.max(...completionDates.map(d => d.probability))) {
          observation = "📍 Data mais provável";
        } else if (diffDays <= 0) {
          observation = "🎯 Dentro do prazo";
        }
        
        markdown += `| ${this.formatDate(result.date)} | ${result.probability.toFixed(1)}% | ${this.getDateStatus(result.date, projectEndDate)} | ${observation} |\n`;
      });

      markdown += `\n## 💡 Recomendações\n\n`;
      if (onTimeProb >= 85) {
        markdown += `1. ✅ Manter o ritmo atual de ${metrics.avgVelocity.toFixed(1)} tarefas/dia\n`;
        markdown += `2. ✅ Continuar monitorando impedimentos\n`;
        markdown += `3. ✅ Planejar próximas sprints com antecedência\n`;
      } else if (onTimeProb >= 50) {
        markdown += `1. ⚠️ Aumentar velocidade para ${velocidadeNecessaria.toFixed(1)} tarefas/dia\n`;
        markdown += `2. ⚠️ Priorizar tarefas críticas\n`;
        markdown += `3. ⚠️ Remover impedimentos imediatamente\n`;
      } else {
        markdown += `1. ❌ Realizar reunião de emergência\n`;
        markdown += `2. ❌ Reavaliar escopo do projeto\n`;
        markdown += `3. ❌ Considerar adição de recursos ou redução de escopo\n`;
      }

      markdown += `\n## ℹ️ Informações do Projeto\n\n`;
      markdown += `- **Total de Sprints**: ${this.sprints.length}\n`;
      markdown += `- **Início**: ${this.formatDate(this.parseBrazilianDate(this.sprints[0].startDate))}\n`;
      markdown += `- **Término Planejado**: ${this.formatDate(projectEndDate)}\n`;
      markdown += `- **Total de Tarefas**: ${metrics.totalTasks}\n`;
      markdown += `- **Simulações Realizadas**: ${this.simulations.toLocaleString()}\n\n`;

      markdown += `---\n*Relatório gerado em ${new Date().toLocaleString('pt-BR')}*`;

      return markdown;
    } catch (error) {
      console.error('Erro ao gerar relatório Monte Carlo:', error);
      return `\n\n ## Relatório de Previsão do Projeto - Método Monte Carlo\n\n` +
             `### ❌ ERRO AO GERAR RELATÓRIO\n\n` +
             `Ocorreu um erro ao processar os dados do projeto. Por favor, verifique os dados e tente novamente.\n\n`;
    }
  }
}
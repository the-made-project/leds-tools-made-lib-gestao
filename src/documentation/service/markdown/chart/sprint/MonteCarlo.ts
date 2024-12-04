import { TimeBox } from "../../../../../model/models.js";


export interface SprintTaskMC {
  issue: string;
  completedDate?: string;
  startDate: string;
  status: string;
}

export interface SprintDataMC {
  startDate: string;
  endDate: string;
  name: string;
  tasks: SprintTaskMC[];
}

interface SprintMetrics {
  totalTasks: number;
  completedTasks: number;
  remainingTasks: number;
  remainingDays: number;
  avgVelocity: number;
  currentVelocity: number;
}

interface CompletionDate {
  date: Date;
  tasksCompleted: number;
  probability: number;
  cumulativeProbability: number;
}

export class SprintMonteCarlo {
  private data: TimeBox;
  private readonly simulations: number;

  constructor(
    sprintData: TimeBox,
    simulations: number = 10000,
  ) {
    if (!sprintData) {
      throw new Error('Dados da sprint não fornecidos');
    }
    this.data = sprintData;
    this.simulations = simulations;
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

  private calculateDailyVelocity(): number[] {
    const completedTasks = this.data.sprintItems?.filter(task => 
      task.status === "DONE" || task.status === "Concluído"
    );
    const velocities: number[] = [];
    
    if (completedTasks && completedTasks.length > 0) {
      const days = new Map<string, number>();
      
      completedTasks.forEach(task => {
        const date = task.startDate?.split('T')[0] || task.startDate;
        if (date) {
          days.set(date, (days.get(date) || 0) + 1);
        }
      });

      days.forEach(tasksCompleted => {
        velocities.push(tasksCompleted);
      });
    }

    return velocities.length > 0 ? velocities : [1]; // Velocidade padrão de 1 se não houver dados
  }

  private calculateRemainingWorkdays(): number {
    try {
      const today = new Date();
      const endDate = this.parseBrazilianDate(this.data.endDate);
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(1, diffDays); // Garante pelo menos 1 dia restante
    } catch (error) {
      console.error('Erro ao calcular dias restantes:', error);
      return 1;
    }
  }

  private getSprintMetrics(): SprintMetrics {
    const totalTasks = this.data.sprintItems.length;
    const completedTasks = this.data.sprintItems.filter(t => 
      t.status === "DONE" || t.status === "Concluído"
    ).length;
    const remainingTasks = totalTasks - completedTasks;
    const remainingDays = this.calculateRemainingWorkdays();
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

  private simulateCompletionDates(): CompletionDate[] {
    const velocities = this.calculateDailyVelocity();
    const metrics = this.getSprintMetrics();
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

        if (daysAdded > 30) break;
      }

      if (simulatedCompleted >= metrics.totalTasks) {
        completionDates.push(currentDate);
      }
    }

    // Se não houver datas simuladas, usa a data planejada
    if (completionDates.length === 0) {
      completionDates.push(this.parseBrazilianDate(this.data.endDate));
    }

    const dateFrequencyMap = new Map<string, number>();
    completionDates.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      dateFrequencyMap.set(dateStr, (dateFrequencyMap.get(dateStr) || 0) + 1);
    });

    const results: CompletionDate[] = [];
    let cumulativeFrequency = 0;

    Array.from(dateFrequencyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([dateStr, frequency]) => {
        cumulativeFrequency += frequency;
        results.push({
          date: new Date(dateStr),
          tasksCompleted: metrics.totalTasks,
          probability: (frequency / this.simulations) * 100,
          cumulativeProbability: (cumulativeFrequency / this.simulations) * 100
        });
      });

    return results;
  }

  private formatDate(date: Date): string {
    try {
      return date.toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return date.toISOString().split('T')[0];
    }
  }

  private getDateStatus(predictedDate: Date, plannedDate: Date): string {
    const diffDays = Math.round((predictedDate.getTime() - plannedDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return '✅ Antes do Prazo';
    if (diffDays === 0) return '✅ No Prazo';
    if (diffDays <= 2) return '⚠️ Pequeno Atraso';
    if (diffDays <= 5) return '⚠️ Atraso Moderado';
    return '❌ Atraso Crítico';
  }

  private getCompletionStatus(probability: number): string {
    if (probability >= 85) return "✅ SPRINT PROVAVELMENTE SERÁ CONCLUÍDA NO PRAZO";
    if (probability >= 50) return "⚠️ RISCO MODERADO DE ATRASO NA SPRINT";
    return "❌ ALTO RISCO DE ATRASO NA SPRINT";
  }

  public generateMarkdownReport(): string {
    try {
      const completionDates = this.simulateCompletionDates();
      const metrics = this.getSprintMetrics();
      const sprintEndDate = this.parseBrazilianDate(this.data.endDate);

      // Se não houver tarefas, retorna relatório simplificado
      if (metrics.totalTasks === 0) {
        return "# Relatório de Previsão da Sprint\n\n⚠️ Não há tarefas registradas para análise.";
      }

      const onTimeProb = completionDates.find(d => d.date > sprintEndDate)?.cumulativeProbability || 100;
      
      let mostLikelyDate = completionDates[0];
      if (completionDates.length > 1) {
        mostLikelyDate = completionDates.reduce((prev, current) => 
          current.probability > prev.probability ? current : prev
        );
      }

      let markdown = `# Previsão da Sprint\n\n`;      
      markdown += `## ${this.getCompletionStatus(onTimeProb)}\n\n`;

      markdown += `- **Probabilidade de conclusão no prazo**: ${onTimeProb.toFixed(1)}%\n`;
      markdown += `- **Data mais provável de conclusão**: ${this.formatDate(mostLikelyDate.date)}\n`;
      
      const diffDays = Math.round((mostLikelyDate.date.getTime() - sprintEndDate.getTime()) / (1000 * 60 * 60 * 24));
      markdown += `- **Dias em relação ao planejado**: ${diffDays} dias\n`;
      markdown += `- **Status**: ${this.getDateStatus(mostLikelyDate.date, sprintEndDate)}\n\n`;

      markdown += `### 📊 Métricas Críticas\n\n`;
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
        const diffDays = Math.round((result.date.getTime() - sprintEndDate.getTime()) / (1000 * 60 * 60 * 24));
        let observation = "";
        if (result.probability === Math.max(...completionDates.map(d => d.probability))) {
          observation = "📍 Data mais provável";
        } else if (diffDays <= 0) {
          observation = "🎯 Dentro da sprint";
        }
        
        markdown += `| ${this.formatDate(result.date)} | ${result.probability.toFixed(1)}% | ${this.getDateStatus(result.date, sprintEndDate)} | ${observation} |\n`;
      });
      markdown += `\n`;

      markdown += `### 📋 Status das Tarefas\n\n`;
      const tasksByStatus = {
        "Concluído": this.data.sprintItems?.filter(t => 
          t.status === "DONE" || t.status === "Concluído"
        ).length,
        "Em Andamento": this.data.sprintItems?.filter(t => 
          t.status === "DOING" || 
          t.status === "IN_PROGRESS" || 
          t.status === "Em Andamento"
        ).length,
        "A Fazer": this.data.sprintItems?.filter(t => 
          t.status === "TODO" || 
          t.status === "A Fazer"
        ).length
      };

      markdown += `| Status | Quantidade | Porcentagem |\n`;
      markdown += `|--------|------------|-------------|\n`;
      Object.entries(tasksByStatus).forEach(([status, count]) => {
        const percentage = ((count || 0) / metrics.totalTasks * 100).toFixed(1);
        markdown += `| ${status} | ${count || 0} | ${percentage}% |\n`;
      });
      markdown += `\n`;

      markdown += `## 💡 Recomendações\n\n`;
      if (onTimeProb >= 85) {
        markdown += `1. ✅ Mantenha o ritmo atual de ${metrics.avgVelocity.toFixed(1)} tarefas/dia\n`;
        markdown += `2. ✅ Continue monitorando impedimentos\n`;
        markdown += `3. ✅ Prepare-se para a próxima sprint\n`;
      } else if (onTimeProb >= 50) {
        markdown += `1. ⚠️ Aumente a velocidade para ${velocidadeNecessaria.toFixed(1)} tarefas/dia\n`;
        markdown += `2. ⚠️ Priorize as tarefas críticas\n`;
        markdown += `3. ⚠️ Remova impedimentos imediatamente\n`;
      } else {
        markdown += `1. ❌ Realize reunião emergencial\n`;
        markdown += `2. ❌ Reavalie o escopo da sprint\n`;
        markdown += `3. ❌ Considere remover tarefas\n`;
      }
      markdown += `\n`;

      markdown += `## ℹ️ Informações da Sprint\n\n`;
      markdown += `- **Sprint**: ${this.data.name}\n`;
      markdown += `- **Início**: ${this.formatDate(this.parseBrazilianDate(this.data.startDate))}\n`;
      markdown += `- **Término Planejado**: ${this.formatDate(sprintEndDate)}\n`;
      markdown += `- **Total de Tarefas**: ${metrics.totalTasks}\n`;
      markdown += `- **Simulações Realizadas**: ${this.simulations.toLocaleString()}\n\n`;

      markdown += `---\n*Relatório gerado em ${new Date().toLocaleString('pt-BR')}*`;

      return markdown;
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      return `# ❌ Erro ao Gerar Relatório\n\n` +
             `Ocorreu um erro ao gerar o relatório: ${error instanceof Error ? error.message : 'Erro desconhecido'}\n\n` +
             `Por favor, verifique os dados da sprint e tente novamente.`;
    }
  }
}
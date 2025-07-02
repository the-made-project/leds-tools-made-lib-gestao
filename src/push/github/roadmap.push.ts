import { GitHubTokenManager } from '../../service/GitHubTokenManager';
import { Roadmap, Milestone } from '../../model/models';
import { GitHubMilestonePushService } from './milestone.push';

export class GitHubRoadmapPushService {
  private token: string;
  private milestonePushService: GitHubMilestonePushService;

  constructor(token: string) {
    this.token = token;
    if (!this.token) {
      throw new Error('❌ GITHUB_TOKEN não está definido. Configure-o como uma variável de ambiente.');
    }
    this.milestonePushService = new GitHubMilestonePushService(token);
  }

  /**
   * Processa um roadmap criando todos os seus milestones
   */
  async createRoadmap(
    org: string,
    repo: string,
    roadmap: Roadmap
  ): Promise<{ roadmapId: string; milestoneResults: any[] }> {
    try {
      console.log(`🗺️ Processando roadmap: ${roadmap.name || 'Unnamed Roadmap'}`);

      if (!roadmap.milestones?.length) {
        console.log(`ℹ️ Roadmap "${roadmap.name}" não possui milestones`);
        return { roadmapId: roadmap.id, milestoneResults: [] };
      }

      const milestoneResults: Array<{
        milestoneId: string;
        gitHubMilestoneNumber: number;
        gitHubMilestoneId: number;
        name: string;
        htmlUrl: string;
      }> = [];

      // Cria todos os milestones do roadmap
      for (const milestone of roadmap.milestones) {
        try {
          console.log(`📋 Processando milestone: ${milestone.name}`);

          // Cria ou atualiza o milestone
          const milestoneResult = await this.milestonePushService.createOrUpdateMilestone(
            org,
            repo,
            milestone
          );

          // Cria labels para as releases do milestone, se houver
          if (milestone.releases?.length) {
            await this.milestonePushService.createReleaseLabels(
              org,
              repo,
              milestone.releases
            );

            // Atribui o milestone às issues das releases
            console.log(`🔗 Atribuindo milestone "${milestone.name}" às issues das releases`);
            await this.milestonePushService.assignIssuesToMilestone(
              org,
              repo,
              milestoneResult.number,
              milestone.releases
            );
          }

          milestoneResults.push({
            milestoneId: milestone.id,
            gitHubMilestoneNumber: milestoneResult.number,
            gitHubMilestoneId: milestoneResult.id,
            name: milestoneResult.title,
            htmlUrl: milestoneResult.html_url
          });

          console.log(`✅ Milestone "${milestone.name}" processado com sucesso`);
        } catch (error: any) {
          console.error(`❌ Erro ao processar milestone "${milestone.name}":`, error.message);
          // Não interrompe o processo para outros milestones
          continue;
        }
      }

      console.log(`✅ Roadmap "${roadmap.name}" processado com sucesso. ${milestoneResults.length} milestones criados.`);
      
      return {
        roadmapId: roadmap.id,
        milestoneResults
      };
    } catch (error: any) {
      console.error(`❌ Erro ao processar roadmap "${roadmap.name}":`, error.message);
      throw error;
    }
  }

  /**
   * Cria labels específicas para roadmap
   */
  async createRoadmapLabels(
    org: string,
    repo: string,
    roadmap: Roadmap
  ): Promise<void> {
    try {
      const { ensureLabelExists } = await import('./githubApi');

      // Label para o roadmap
      if (roadmap.name) {
        await ensureLabelExists(org, repo, {
          name: `roadmap: ${roadmap.name}`,
          color: '8B5CF6',
          description: `Roadmap: ${roadmap.description || roadmap.name}`
        });
      }

      // Labels para status de milestones
      const milestoneStatuses = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED'];
      const statusColors: { [key: string]: string } = {
        'PLANNED': 'FEF2C0',
        'IN_PROGRESS': '0E8A16',
        'COMPLETED': '28a745',
        'DELAYED': 'dc3545'
      };

      for (const status of milestoneStatuses) {
        await ensureLabelExists(org, repo, {
          name: `milestone: ${status.toLowerCase()}`,
          color: statusColors[status] || 'CCCCCC',
          description: `Milestone status: ${status}`
        });
      }

      // Labels para status de releases
      const releaseStatuses = ['PLANNED', 'IN_DEVELOPMENT', 'TESTING', 'RELEASED'];
      const releaseStatusColors: { [key: string]: string } = {
        'PLANNED': 'FEF2C0',
        'IN_DEVELOPMENT': '0052CC',
        'TESTING': 'FFA500',
        'RELEASED': '28a745'
      };

      for (const status of releaseStatuses) {
        await ensureLabelExists(org, repo, {
          name: `release: ${status.toLowerCase()}`,
          color: releaseStatusColors[status] || 'CCCCCC',
          description: `Release status: ${status}`
        });
      }

      console.log(`✅ Labels do roadmap "${roadmap.name}" criadas com sucesso`);
    } catch (error: any) {
      console.error(`❌ Erro ao criar labels do roadmap "${roadmap.name}":`, error.message);
      // Não interrompe o processo principal
    }
  }
}

import { AxiosInstance } from 'axios';

import { JiraTokenManager } from '../../service/JiraTokenManager';
import { axiosJiraInstance } from '../../util/axiosInstance';
import { Milestone, Roadmap } from '../../model/models';
import { JiraIssuePushService } from './issue.push';

export interface JiraRoadmapWard {
  id: string;
  key: string;
  self: string;
}

export interface JiraRoadmap {
}

export interface JiraRoadmapCreated {
  roadmapId: string;
  milestones: JiraRoadmapProjectVersionCreated[]
}

export interface JiraRoadmapProjectVersionCreated {
  id: string;
  name: string;
  description: string;
  archived: boolean;
  project: string;
  projectId: string;
  releaseDate: string;
  released: boolean
  self: string;
  userReleaseDate: string;
}

export interface JiraRoadmapProjectVersion extends JiraRoadmapProjectVersionCreated {
  overdue: true;
  releaseDateSet: true;
  startDateSet: false;
}

export class JiraRoadmapPushService {
  private axiosProjectVersionInstance: AxiosInstance;
  private axiosVersionInstance: AxiosInstance;
  private issuePushService: JiraIssuePushService = new JiraIssuePushService();

  constructor() {
    const jiraTokenManager = JiraTokenManager.getInstance();
    this.axiosProjectVersionInstance = axiosJiraInstance(jiraTokenManager.getDomain(), jiraTokenManager.getUserName(), jiraTokenManager.getApiToken(), 'project');
    this.axiosVersionInstance = axiosJiraInstance(jiraTokenManager.getDomain(), jiraTokenManager.getUserName(), jiraTokenManager.getApiToken(), 'version');
  }

  /**
   * @description Process a Jira Roadmap creating your all versions(milestones)
   * @author Douglas Lima
   * @date 29/11/2025
   * @param {string} projectId
   * @param {Roadmap} roadmap
   * @param {Map<string, string>} issueIdToJiraIssueKey
   * @return {*}  {Promise<JiraRoadmapCreated>}
   * @memberof JiraRoadmapPushService
   */
  async createRoadmap(
    projectId: string,
    roadmap: Roadmap,
    issueIdToJiraIssueKey: Map<string, string>
  ): Promise<JiraRoadmapCreated> {
    try {
      console.log(`🗺️ Processando roadmap: ${roadmap.name || 'Unnamed Roadmap'}`);

      if (!roadmap.milestones?.length) {
        console.log(`ℹ️ Roadmap "${roadmap.name}" não possui milestones`);
        return { roadmapId: roadmap.id, milestones: [] };
      }

      const versionResults: JiraRoadmapProjectVersionCreated[] = [];

      // Cria todos os milestones do roadmap
      for (const milestone of roadmap.milestones) {
        try {
          console.log(`📋 Processando milestone: ${milestone.name}`);

          // Cria ou atualiza o milestone
          const versionResult = await this.createOrUpdateVersion(projectId, milestone);

          if (milestone.releases?.length) {
            // Atribui o milestone às issues das releases
            console.log(`🔗 Atribuindo milestone "${milestone.name}" às issues das releases`);
            await this.issuePushService.assignIssuesToVersion(projectId, versionResult.id, milestone.releases, issueIdToJiraIssueKey);
            console.log(`✅ Processamento de atribuição de issues concluído para milestone "${milestone.name}:`);
          }

          versionResults.push(versionResult);
          console.log(`✅ Milestone "${milestone.name}" processada com sucesso`);
        } catch (error: any) {
          console.error(`❌ Erro ao processar milestone "${milestone.name}":`, error.message);
          // Não interrompe o processo para outros milestones
          continue;
        }
      }

      console.log(`✅ Roadmap "${roadmap.name}" processado com sucesso. ${versionResults.length} milestones criados.`);

      return {
        roadmapId: roadmap.id,
        milestones: versionResults
      };
    } catch (error: any) {
      console.error(`❌ Erro ao processar roadmap "${roadmap.name}":`, error.message);
      throw error;
    }
  }

  /**
   * Cria ou atualiza um milestone
   */
  private async createOrUpdateVersion(projectId: string, version: Milestone): Promise<JiraRoadmapProjectVersionCreated> {
    try {
      const response = await this.axiosProjectVersionInstance.get(`/${projectId}/versions`);
      const versions = response.data as JiraRoadmapProjectVersion[];

      // Buscando a milestone se existir
      const versionData = versions.find(v => v.name === version.name);

      return versionData
        ? this.updateVersion(projectId, version)
        : this.createVersion(projectId, version);
    } catch (error: any) {
      console.error(`❌ Erro ao processar milestone "${version.name}":`, error.message);
      throw error;
    }
  }

  private async createVersion(projectId: string, version: Milestone): Promise<JiraRoadmapProjectVersionCreated> {
    try {
      // Check for input errors
      if (!projectId) {
        throw new Error(`❌ Jira API errors: Version Project Id not defined`);
      }
      if (!version) {
        throw new Error(`❌ Jira API errors: Version data not defined`);
      }

      const payload = {
        name: version.name,
        description: version.description,
        projectId: projectId,
        releaseDate: version.dueDate,
        released: false,
        startDate: version.startDate
      };
      const response = await this.axiosVersionInstance.post('', payload);
      const versionData = response.data as JiraRoadmapProjectVersionCreated;

      if (!versionData) {
        throw new Error('❌ A resposta da API não contém os dados esperados.');
      }

      console.log(`✅ Milestone criado: ${versionData.name} (${versionData.description})`);

      return versionData
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        throw new Error(`❌ Validation error (422): ${JSON.stringify(errorData)}. Check issue title, body length, or repository permissions.`);
      }

      console.error(`❌ Erro ao processar milestone "${version.name}":`, error.message);
      throw error;
    }
  }

  private async updateVersion(projectId: string, version: Milestone): Promise<JiraRoadmapProjectVersionCreated> {
    try {
      // Check for input errors
      if (!projectId) {
        throw new Error(`❌ Jira API errors: Version Project Id not defined`);
      }
      if (!version) {
        throw new Error(`❌ Jira API errors: Version data not defined`);
      }

      const payload = {
        name: version.name,
        description: version.description,
        projectId: projectId,
        releaseDate: version.dueDate,
        released: false,
        startDate: version.startDate
      };
      const response = await this.axiosVersionInstance.put(`/${version.id}`, payload);
      const versionData = response.data as JiraRoadmapProjectVersionCreated;

      if (!versionData) {
        throw new Error('❌ A resposta da API não contém os dados esperados.');
      }

      console.log(`✅ Milestone atualizado: ${versionData.name} (${versionData.description})`);

      return versionData
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        throw new Error(`❌ Validation error (422): ${JSON.stringify(errorData)}. Check issue title, body length, or repository permissions.`);
      }

      console.error(`❌ Erro ao processar milestone "${version.name}":`, error.message);
      throw error;
    }
  }
}

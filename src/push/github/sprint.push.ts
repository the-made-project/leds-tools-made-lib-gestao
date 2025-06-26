import { axiosInstance } from '../../util/axiosInstance';
import { GitHubTokenManager } from '../../service/GitHubTokenManager';
import { getRepositoryId } from './githubApi';
import type { TimeBox, Issue } from '../../model/models';

/**
 * Cria uma issue para cada sprint (TimeBox) no repositório do GitHub.
 */
export async function pushSprintsToGitHub(
  org: string,
  repo: string,
  sprints: TimeBox[]
): Promise<{ id: string; number: number }[]> {
  const repositoryId = await getRepositoryId(org, repo);
  const axios_instance = axiosInstance(GitHubTokenManager.getInstance().getToken());
  const results: { id: string; number: number }[] = [];

  for (const sprint of sprints) {
    const title = `[SPRINT] ${sprint.name}`;
    const body = buildSprintBody(sprint);
    const labels = sprint.status ? [sprint.status] : [];

    const query = `
      mutation($repositoryId: ID!, $title: String!, $body: String!) {
        createIssue(input: {repositoryId: $repositoryId, title: $title, body: $body}) {
          issue {
            id
            number
          }
        }
      }
    `;
    const variables = { repositoryId, title, body };
    const response = await axios_instance.post('', { query, variables });
    const issueData = response.data?.data?.createIssue?.issue;
    if (!issueData) {
      console.error('❌ Erro ao criar issue do sprint:', {
        sprint: sprint.name,
        response: response.data
      });
      continue;
    }

    // Adicione as labels depois, se necessário:
    if (labels.length > 0) {
      const url = `https://api.github.com/repos/${org}/${repo}/issues/${issueData.number}/labels`;
      await axios_instance.post(url, { labels });
    }

    results.push({ id: issueData.id, number: issueData.number });
  }
  return results;
}

/**
 * Gera o corpo da issue para um sprint (TimeBox)
 */
function buildSprintBody(
  sprint: TimeBox,
  sprintItemResults: { issueId: string; issueNumber: number }[] = [],
  sprintItems: Issue[] = []
): string {
  // Mapeia id da issue para número
  const idToNumber = new Map<string, number>();
  sprintItems.forEach((item, idx) => {
    if (item.id && sprintItemResults[idx]) {
      idToNumber.set(item.id, sprintItemResults[idx].issueNumber);
    }
  });

  // Garante unicidade das issues
  const uniqueIssues = Array.from(
    new Map(sprintItems.map(item => [item.id, item])).values()
  );

  const checklist = uniqueIssues.length > 0
    ? uniqueIssues.map(item => {
        const num = idToNumber.get(item.id);
        return num ? `- [ ] #${num} ${item.title || ''}` : `- [ ] ${item.title || '-'}`;
      }).join('\n')
    : '- [ ] (Nenhuma issue associada ao sprint)';

  return `# Sprint: ${sprint.name}

**Descrição:**  
${sprint.description || '-'}

**Data de Início:** ${sprint.startDate}
**Data de Fim:** ${sprint.endDate}
**Status:** ${sprint.status || '-'}

## Itens do Sprint
${checklist}
`;
}

import { axiosInstance } from '../../util/axiosInstance';

// Obtém o ID da organização
export async function getOrganizationId(organizationName: string): Promise<string> {
  const query = `
        query($organizationName: String!) {
            organization(login: $organizationName) {
                id
            }
        }
    `;

    // Define as variáveis para a query GraphQL
    const variables = {
        organizationName,
    };

    try {
        // Envia a query para obter o ID da organização
        const response = await axiosInstance.post('', { query, variables });
        const organizationId = response.data.data.organization.id;
        console.log(`✅ ID da organização obtido: ${organizationId}`);
        return organizationId;
    } catch (error: any) {
        console.error('❌ Erro ao obter o ID da organização:', error.response?.data || error.message);
        throw error;
    }
}

// Obtém o ID do repositório
export async function getRepositoryId(organizationName: string, repositoryName: string): Promise<string> {
  const query = `
        query($organization: String!, $repositoryName: String!) {
            organization(login: $organization) {
                repository(name: $repositoryName) {
                    id
                }
            }
        }
    `;

    // Define as variáveis para a query GraphQL
    const variables = {
        organization: organizationName,
        repositoryName,
    };

    try {
        // Envia a query para obter o ID do repositório
        const response = await axiosInstance.post('', { query, variables });
        const repository = response.data?.data?.organization?.repository;

        if (!repository || !repository.id) {
          throw new Error("❌ Repositório não encontrado ou resposta malformada.");
        }

        const repositoryId = repository.id;
        console.log(`✅ ID do repositório obtido: ${repositoryId}`);
        return repositoryId;
    } catch (error: any) {
        console.error('❌ Erro ao obter o ID do repositório:', error.response?.data || error.message);
        throw error;
    }
}

// Busca os IDs das labels
export async function getLabelIds(organizationName: string, repositoryName: string, labels: string[]): Promise<string[]> {
    const query = `
      query($repositoryName: String!, $organization: String!) {
        repository(name: $repositoryName, owner: $organization) {
          labels(first: 100) {
            nodes { id name }
          }
        }
      }
    `;
    const variables = { repositoryName, organization: organizationName };
    const response = await axiosInstance.post('', { query, variables });
    const allLabels = response.data.data.repository.labels.nodes;
    return labels.map(label => {
      const foundLabel = allLabels.find((l: any) => l.name === label);
      if (!foundLabel) throw new Error(`Label "${label}" não encontrado no repositório.`);
      return foundLabel.id;
    });
}

// Adiciona labels a um item (issue, PR, etc)
export async function addLabelsToLabelable(labelableId: string, labelIds: string[]): Promise<void> {

    const query = `
      mutation($labelableId: ID!, $labelIds: [ID!]!) {
        addLabelsToLabelable(input: {labelableId: $labelableId, labelIds: $labelIds}) {
          labelable { __typename }
        }
      }
    `;
    // Corrigido: usar labelableId, não issueId
    const variables = { labelableId, labelIds };
    await axiosInstance.post('', { query, variables });
}

// Adiciona assignees a uma issue
export async function addAssigneesToIssue(organizationName: string, repositoryName: string, issueNumber: number, assignees: string[]): Promise<void> {
  const url = `https://api.github.com/repos/${organizationName}/${repositoryName}/issues/${issueNumber}/assignees`;
    const data = { assignees };
    await axiosInstance.post(url, data, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });
}

// Executa uma query/mutação GraphQL genérica
export async function githubGraphQL<T>(query: string, variables: any): Promise<T> {
  const response = await axiosInstance.post('', { query, variables });
  if (response.data.errors) throw new Error(JSON.stringify(response.data.errors));
  return response.data.data;
}
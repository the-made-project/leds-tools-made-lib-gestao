import { axiosInstance } from '../../util/axiosInstance';
import { GitHubTokenManager } from '../../service/GitHubTokenManager';

// Garante que a label exista no repositório, criando se necessário
export async function ensureLabelExists(
  organizationName: string,
  repositoryName: string,
  label: { name: string; color?: string; description?: string }
): Promise<void> {
  // Busca as labels existentes
  const query = `
    query($repositoryName: String!, $organization: String!) {
      repository(name: $repositoryName, owner: $organization) {
        labels(first: 100) {
          nodes { name }
        }
      }
    }
  `;
  const variables = { repositoryName, organization: organizationName };
  const axios_instance = axiosInstance(GitHubTokenManager.getInstance().getToken());
  const response = await axios_instance.post('', { query, variables });
  const allLabels = response.data.data.repository.labels.nodes;
  const exists = allLabels.some((l: any) => l.name === label.name);

  if (!exists) {
    // Cria a label via REST API
    const url = `https://api.github.com/repos/${organizationName}/${repositoryName}/labels`;
    await axios_instance.post(
      url,
      {
        name: label.name,
        color: label.color || 'ededed', // cor padrão se não informado
        description: label.description || ''
      },
      {
        headers: {
          Accept: 'application/vnd.github+json'
        }
      }
    );
    console.log(`✅ Label "${label.name}" criada no repositório.`);
  } else {
    console.log(`ℹ️ Label "${label.name}" já existe no repositório.`);
  }
}

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
        const axios_instance = axiosInstance(GitHubTokenManager.getInstance().getToken());
        const response = await axios_instance.post('', { query, variables });
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
        const axios_instance = axiosInstance(GitHubTokenManager.getInstance().getToken());
        const response = await axios_instance.post('', { query, variables });
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
            nodes { 
            id 
            name 
            }
          }
        }
      }
    `;
    const variables = { repositoryName, organization: organizationName };
    const axios_instance = axiosInstance(GitHubTokenManager.getInstance().getToken());
    const response = await axios_instance.post('', { query, variables });
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
    const axios_instance = axiosInstance(GitHubTokenManager.getInstance().getToken());
    await axios_instance.post('', { query, variables });
}

// Adiciona assignees a uma issue
export async function addAssigneesToIssue(
  organizationName: string,
  repositoryName: string,
  issueNumber: number,
  assignees: string[]
): Promise<void> {
  const url = `https://api.github.com/repos/${organizationName}/${repositoryName}/issues/${issueNumber}/assignees`;
  const data = { assignees };
  const axios_instance = axiosInstance(GitHubTokenManager.getInstance().getToken());
  await axios_instance.post(url, data);
}

// Executa uma query/mutação GraphQL genérica
export async function githubGraphQL<T>(query: string, variables: any): Promise<T> {
  const axios_instance = axiosInstance(GitHubTokenManager.getInstance().getToken());
  const response = await axios_instance.post('', { query, variables });
  if (response.data.errors) throw new Error(JSON.stringify(response.data.errors));
  return response.data.data;
}

// Busca o ID do campo "Type" no projeto
export async function getProjectFieldIdByName(projectId: string, fieldName: string): Promise<string | null> {
  const query = `
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          fields(first: 20) {
            nodes {
              ... on ProjectV2FieldCommon {
                id
                name
              }
            }
          }
        }
      }
    }
  `;
  const variables = { projectId };
  const axios_instance = axiosInstance(GitHubTokenManager.getInstance().getToken());
  const response = await axios_instance.post('', { query, variables });
  const fields = response.data.data.node.fields.nodes;
  const field = fields.find((f: any) => f.name === fieldName);
  return field ? field.id : null;
}

// Atualiza o valor de um campo customizado em um item do projeto
export async function setProjectItemField(
  projectId: string,
  itemId: string,
  fieldId: string,
  value: string
): Promise<void> {
  const mutation = `
    mutation($input: UpdateProjectV2ItemFieldValueInput!) {
      updateProjectV2ItemFieldValue(input: $input) {
        projectV2Item {
          id
        }
      }
    }
  `;
  const variables = {
    input: {
      projectId,
      itemId,
      fieldId,
      value: { text: value }
    }
  };
  const axios_instance = axiosInstance(GitHubTokenManager.getInstance().getToken());
  await axios_instance.post('', { query: mutation, variables });
}

// Certifica-se de que o campo "Backlog" existe no projeto, criando-o se necessário
export async function ensureProjectBacklogField(projectId: string, options: string[]): Promise<void> {
  // Busca campos existentes
  const query = `
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          fields(first: 50) {
            nodes {
              ... on ProjectV2FieldCommon {
                id
                name
              }
            }
          }
        }
      }
    }
  `;
  const variables = { projectId };
  const axios_instance = axiosInstance(GitHubTokenManager.getInstance().getToken());
  const response = await axios_instance.post('', { query, variables });
  const fields = response.data.data.node.fields.nodes;
  const backlogField = fields.find((f: any) => f.name === "Backlog");

  if (!backlogField) {
    // Cria o campo "Backlog" como Single Select
    const mutation = `
      mutation($input: AddProjectV2FieldInput!) {
        addProjectV2Field(input: $input) {
          projectV2Field {
            ... on ProjectV2SingleSelectField {
              id
              name
              options {
                id
                name
              }
            }
          }
        }
      }
    `;
    const variables = {
      input: {
        projectId,
        name: "Backlog",
        dataType: "SINGLE_SELECT",
        options: options.map(name => ({ name }))
      }
    };
    await axios_instance.post('', { query: mutation, variables });
    console.log('✅ Campo "Backlog" criado no projeto.');
  } else {
    console.log('ℹ️ Campo "Backlog" já existe no projeto.');
  }
}

// Cria ou garante um time na organização
export async function ensureTeamExists(
  org: string,
  teamName: string,
  description?: string
): Promise<void> {
  const url = `https://api.github.com/orgs/${org}/teams/${teamName.toLowerCase().replace(/ /g, '-')}`;
  const axios_instance = axiosInstance(GitHubTokenManager.getInstance().getToken());

  try {
    // Tenta buscar o time
    await axios_instance.get(url);
    // Se não lançar erro, o time já existe
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      // Cria o time se não existir
      await axios_instance.post(
        `https://api.github.com/orgs/${org}/teams`,
        {
          name: teamName,
          description: description || '',
        }
      );
    } else {
      throw error;
    }
  }
}

// Adiciona um membro ao time
export async function addMemberToTeam(
  org: string,
  teamName: string,
  username: string
): Promise<void> {
  const url = `https://api.github.com/orgs/${org}/teams/${teamName.toLowerCase().replace(/ /g, '-')}/memberships/${username}`;
  const axios_instance = axiosInstance(GitHubTokenManager.getInstance().getToken());
  await axios_instance.put(url, { role: "member" });
}

// Cria relação de sub-issue (parent-child) entre duas issues
export async function addLinkedIssue(
  parentId: string,
  childId: string
): Promise<void> {
  const query = `
    mutation($input: AddLinkedIssueInput!) {
      addLinkedIssue(input: $input) {
        clientMutationId
      }
    }
  `;
  const variables = {
    input: {
      issueId: parentId,
      linkedIssueId: childId,
      relationshipType: "child"
    }
  };
  const axios_instance = axiosInstance(GitHubTokenManager.getInstance().getToken());
  await axios_instance.post('', { query, variables });
}
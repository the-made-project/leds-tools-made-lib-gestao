import { axiosInstance } from '../../util/axiosInstance';
import { GitHubTokenManager } from '../../service/GitHubTokenManager';
import { Logger } from '../../util/logger';
import { GitHubLabel, GitHubAPIResponse } from '../../model/models';
import axios from 'axios';

// Garante que a label exista no repositório, criando se necessário
export async function ensureLabelExists(
  organizationName: string,
  repositoryName: string,
  label: Omit<GitHubLabel, 'id'>
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
  
  let labelExists = false;
  
  try {
    const response = await axios_instance.post('', { query, variables });
    
    // Add null checks for API response
    if (!response.data?.data?.repository?.labels?.nodes) {
      throw new Error(`❌ Failed to fetch labels for repository ${organizationName}/${repositoryName}. Repository may not exist or insufficient permissions.`);
    }
    
    const allLabels: GitHubLabel[] = response.data.data.repository.labels.nodes;
    labelExists = allLabels.some((l) => l.name === label.name);
    
    if (labelExists) {
      Logger.info(`ℹ️ Label "${label.name}" já existe (verificado via GraphQL)`);
      return;
    }
  } catch (graphqlError: any) {
    Logger.warn(`⚠️ Erro ao verificar labels via GraphQL, tentando criar diretamente: ${graphqlError.message}`);
    // Continue to creation attempt - might be a GraphQL permission issue
  }

  // Try to create the label (either because it doesn't exist or GraphQL check failed)
  const token = GitHubTokenManager.getInstance().getToken();
  const restAxios = axios.create({
    baseURL: 'https://api.github.com',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json'
    },
  });

  try {
    await restAxios.post(
      `/repos/${organizationName}/${repositoryName}/labels`,
      {
        name: label.name,
        color: label.color || 'ededed',
        description: label.description || ''
      }
    );
    Logger.success(`✅ Label "${label.name}" criada com sucesso`);
  } catch (error: any) {
    if (error.response?.status === 422) {
      Logger.info(`ℹ️ Label "${label.name}" já existe no repositório (confirmado via REST API)`);
      // Label already exists, this is fine - don't throw error
    } else {
      Logger.error(`❌ Erro ao criar label "${label.name}":`, error.response?.data || error.message);
      throw error;
    }
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
        return organizationId;
    } catch (error: any) {
        Logger.error('❌ Erro ao obter o ID da organização:', error.response?.data || error.message);
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
        Logger.success(`✅ ID do repositório obtido: ${repositoryId}`);
        return repositoryId;
    } catch (error: any) {
        Logger.error('❌ Erro ao obter o ID do repositório:', error.response?.data || error.message);
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
    
    // Add null checks for API response
    if (!response.data?.data?.repository?.labels?.nodes) {
      throw new Error(`❌ Failed to fetch labels for repository ${organizationName}/${repositoryName}. Repository may not exist or insufficient permissions.`);
    }
    
    const allLabels: GitHubLabel[] = response.data.data.repository.labels.nodes;
    return labels.map(label => {
      const foundLabel = allLabels.find((l) => l.name === label);
      if (!foundLabel) throw new Error(`❌ Label "${label}" não encontrado no repositório ${organizationName}/${repositoryName}.`);
      return foundLabel.id;
    });
}

// Adiciona labels a um item (issue, PR, etc)
export async function addLabelsToLabelable(labelableId: string, labelIds: string[]): Promise<void> {
    // Skip if no labels to add
    if (!labelIds || labelIds.length === 0) {
      Logger.info('ℹ️ No labels to add, skipping addLabelsToLabelable');
      return;
    }

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
    
    try {
      await axios_instance.post('', { query, variables });
    } catch (error: any) {
      Logger.error(`❌ Error adding labels to labelable ${labelableId}:`, error.response?.data || error.message);
      throw error;
    }
}

// Adiciona assignees a uma issue
export async function addAssigneesToIssue(
  organizationName: string,
  repositoryName: string,
  issueNumber: number,
  assignees: string[]
): Promise<void> {
  const token = GitHubTokenManager.getInstance().getToken();
  const restAxios = axios.create({
    baseURL: 'https://api.github.com',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  await restAxios.post(
    `/repos/${organizationName}/${repositoryName}/issues/${issueNumber}/assignees`,
    { assignees }
  );
}

// Executa uma query/mutação GraphQL genérica
export async function githubGraphQL<T>(query: string, variables: Record<string, any>): Promise<T> {
  const axios_instance = axiosInstance(GitHubTokenManager.getInstance().getToken());
  const response = await axios_instance.post('', { query, variables });
  
  const apiResponse: GitHubAPIResponse<T> = response.data;
  if (apiResponse.errors && apiResponse.errors.length > 0) {
    throw new Error(`GraphQL errors: ${apiResponse.errors.map(e => e.message).join(', ')}`);
  }
  
  if (!apiResponse.data) {
    throw new Error('No data returned from GraphQL query');
  }
  
  return apiResponse.data;
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
    Logger.success('✅ Campo "Backlog" criado no projeto.');
  } else {
    Logger.info('ℹ️ Campo "Backlog" já existe no projeto.');
  }
}

// Cria ou garante um time na organização
export async function ensureTeamExists(
  org: string,
  teamName: string,
  description?: string
): Promise<void> {
  const slug = teamName.toLowerCase().replace(/ /g, '-');
  const token = GitHubTokenManager.getInstance().getToken();
  const restAxios = axios.create({
    baseURL: 'https://api.github.com',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  try {
    // Tenta buscar o time
    await restAxios.get(`/orgs/${org}/teams/${encodeURIComponent(slug)}`);
    // Se não lançar erro, o time já existe
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      // Cria o time se não existir
      await restAxios.post(
        `/orgs/${org}/teams`,
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
  const slug = teamName.toLowerCase().replace(/ /g, '-');
  const token = GitHubTokenManager.getInstance().getToken();
  const restAxios = axios.create({
    baseURL: 'https://api.github.com',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  await restAxios.put(
    `/orgs/${org}/teams/${encodeURIComponent(slug)}/memberships/${encodeURIComponent(username)}`,
    { role: "member" }
  );
}
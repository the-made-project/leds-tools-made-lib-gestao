import { axiosInstance } from '../../util/axiosInstance';
import { GitHubTokenManager } from '../../service/GitHubTokenManager';
import { Logger } from '../../util/logger';

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

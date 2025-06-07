import { GitHubTokenManager } from '../../service/GitHubTokenManager.js';
import { axiosInstance } from '../../util/axiosInstance.js';
import { getOrganizationId, getRepositoryId } from './githubApi';

// Função para criar um projeto na organização
export async function createProject(organization: string, projectTitle: string): Promise<string> {
    const query = `
        mutation($organizationId: ID!, $title: String!) {
            createProjectV2(input: {ownerId: $organizationId, title: $title}) {
                projectV2 {
                    id
                }
            }
        }
    `;

    try {
        // Obtém o ID da organização
        const organizationId = await getOrganizationId(organization);
        console.log('ID da organização:', organizationId);

        // Define as variáveis para a mutação GraphQL
        const variables = {
            organizationId,
            title: projectTitle,
        };

        console.log('Enviando mutação para criar projeto...');

        // Envia a mutação para criar o projeto
        const axios_instance = axiosInstance(GitHubTokenManager.getInstance().getToken());
        const response = await axios_instance.post('', { query, variables });
        console.log('Resposta da API:', JSON.stringify(response.data, null, 2));

        // Obtém o ID do projeto criado
        const projectId = response.data.data.createProjectV2.projectV2.id;
        console.log(`✅ Projeto criado com ID: ${projectId}`);
        return projectId;

    } catch (error: any) {
        console.error('❌ Erro ao criar projeto:', error.response?.data || error.message);
        throw error;
    }
}

// Função para adicionar uma issue ao projeto
export async function addIssueToProject(
    projectId: string,
    issueId: string // Agora espera o ID da issue
): Promise<string> {
    const query = `
        mutation($projectId: ID!, $contentId: ID!) {
            addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
                item {
                    id
                }
            }
        }
    `;

    const variables = {
        projectId,
        contentId: issueId, // Passa o ID da issue
    };

    try {
        console.log('Adicionando issue ao projeto...');
        console.log('Project ID:', projectId);
        console.log('Content ID (Issue ID):', issueId);

        const axios_instance = axiosInstance(GitHubTokenManager.getInstance().getToken());
        const response = await axios_instance.post('', { query, variables });
        console.log('Resposta da API:', JSON.stringify(response.data, null, 2));

        const itemId = response.data.data.addProjectV2ItemById.item.id;
        console.log(`✅ Issue adicionada ao projeto: ${itemId}`);

        return itemId;

    } catch (error: any) {
        console.error('❌ Erro ao adicionar issue ao projeto:', error.response?.data || error.message);
        throw error;
    }
}

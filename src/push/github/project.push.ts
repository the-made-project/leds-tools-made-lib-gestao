import { GitHubTokenManager } from '../../service/GitHubTokenManager.js';
import { axiosInstance } from '../../util/axiosInstance.js';
import { getOrganizationId } from './githubApi';

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
    issueId: string
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
    const variables = { projectId, contentId: issueId };
    const axios_instance = axiosInstance(GitHubTokenManager.getInstance().getToken());

    let retries = 3;
    while (retries > 0) {
        try {
            const response = await axios_instance.post('', { query, variables });
            const item = response.data.data.addProjectV2ItemById?.item;
            if (!item) {
                const errorMsg = response.data.errors?.[0]?.message || 'Unknown error';
                if (errorMsg.includes('temporary conflict') && retries > 1) {
                    await new Promise(res => setTimeout(res, 1500));
                    retries--;
                    continue;
                }
                throw new Error(errorMsg);
            }
            return item.id;
        } catch (error: any) {
            if (retries > 1 && error.message?.includes('temporary conflict')) {
                await new Promise(res => setTimeout(res, 1500));
                retries--;
                continue;
            }
            throw error;
        }
    }
    throw new Error('Failed to add issue to project after retries.');
}

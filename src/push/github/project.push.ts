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
        const organizationId = await getOrganizationId(organization);

        const variables = {
            organizationId,
            title: projectTitle,
        };

        const axios_instance = axiosInstance(GitHubTokenManager.getInstance().getToken());
        const response = await axios_instance.post('', { query, variables });

        const projectId = response.data.data.createProjectV2.projectV2.id;
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

    let retries = 7; // Aumentar número de tentativas
    let baseDelay = 2000; // Delay inicial maior
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            if (attempt > 1) {
                const delay = baseDelay * Math.pow(2, attempt - 2);
                await new Promise(res => setTimeout(res, delay));
            }

            const response = await axios_instance.post('', { query, variables });
            
            if (response.data.errors) {
                const errors = response.data.errors;
                const errorMsg = errors[0]?.message || 'Unknown GraphQL error';
                
                if (isTemporaryGitHubError(errorMsg)) {
                    if (attempt === retries) {
                        throw new Error(`Falha após ${retries} tentativas: ${errorMsg}`);
                    }
                    continue;
                }
                
                // Se não é temporário, falhar imediatamente
                console.error('❌ Erro permanente ao adicionar issue ao projeto:', {
                    error: errors,
                    variables
                });
                throw new Error(errorMsg);
            }

            // Sucesso - extrair item
            const item = response.data.data?.addProjectV2ItemById?.item;
            if (!item) {
                throw new Error('Resposta inválida: item não encontrado');
            }

            console.log(`✅ Issue adicionada ao projeto com sucesso (ID: ${item.id})`);
            return item.id;

        } catch (error: any) {
            const errorMessage = error?.response?.data?.errors?.[0]?.message || error.message;
            
            // Se é um erro temporário, tentar novamente
            if (isTemporaryGitHubError(errorMessage)) {
                console.log(`⚠️ Erro temporário (tentativa ${attempt}/${retries}): ${errorMessage}`);
                if (attempt === retries) {
                    console.error('❌ Falha após todas as tentativas:', {
                        error: errorMessage,
                        variables,
                        attempts: retries
                    });
                    throw new Error(`Falha após ${retries} tentativas: ${errorMessage}`);
                }
                continue;
            }
            
            // Erro não temporário - falhar imediatamente
            console.error('❌ Erro permanente ao adicionar issue ao projeto:', {
                error: errorMessage,
                variables,
                attempt
            });
            throw error;
        }
    }
    
    throw new Error(`Falha após ${retries} tentativas para adicionar issue ao projeto`);
}

/**
 * Verifica se o erro é temporário e deve ser tentado novamente
 */
function isTemporaryGitHubError(errorMessage: string): boolean {
    if (!errorMessage) return false;
    
    const temporaryErrors = [
        'Something went wrong while executing your query',
        'temporary conflict',
        'rate limit',
        'timeout',
        'temporarily unavailable',
        'internal server error',
        'service unavailable'
    ];
    
    return temporaryErrors.some(pattern => 
        errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
}

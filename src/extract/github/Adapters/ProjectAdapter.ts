import { Project } from "../../../model/models";
import { GitHubProject } from "../project.extract";

interface ProjectAdapter {
    toInternalFormat(gitHubProject: GitHubProject): Project;
}

export class DefaultProjectAdapter implements ProjectAdapter {
    toInternalFormat(gitHubProject: GitHubProject): Project {
        // Criamos uma data de vencimento estimada (3 meses após a criação)
        const createdDate = new Date(gitHubProject.createdAt);
        const estimatedDueDate = new Date(createdDate);
        estimatedDueDate.setMonth(createdDate.getMonth() + 3);
        
        // Se o projeto estiver fechado, usamos a data de atualização como data de conclusão
        const completedDate = gitHubProject.closed ? gitHubProject.updatedAt : undefined;
        
        return {
        id: gitHubProject.id,
        name: gitHubProject.title,
        description: gitHubProject.shortDescription || undefined,
        startDate: gitHubProject.createdAt,
        dueDate: estimatedDueDate.toISOString().split('T')[0], // Formato YYYY-MM-DD
        completedDate: completedDate
        };
    }
}
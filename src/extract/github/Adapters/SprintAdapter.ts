import { TimeBox } from "../../../model/models";
import { GitHubSprint } from "../sprints.extract";

interface SprintAdapter {
    toInternalFormat(gitHubSprint: GitHubSprint): TimeBox; 
}

export class DefaultSprintAdapter implements SprintAdapter {
    toInternalFormat(gitHubSprint: GitHubSprint) {
        // Determina o status baseado nas datas
        const currentDate = new Date();
        const startDate = new Date(gitHubSprint.startDate);
        const endDate = new Date(gitHubSprint.endDate);
        
        let status: 'PLANNED' | 'IN_PROGRESS' | 'CLOSED' = 'PLANNED';
        if (currentDate > endDate) {
        status = 'CLOSED';
        } else if (currentDate >= startDate && currentDate <= endDate) {
        status = 'IN_PROGRESS';
        }
        
        return {
        id: gitHubSprint.id,
        description: gitHubSprint.title,
        startDate: gitHubSprint.startDate,
        endDate: gitHubSprint.endDate,
        name: gitHubSprint.title,
        status: status,
        completeDate: status === 'CLOSED' ? gitHubSprint.endDate : undefined,
        sprintItems: [] // Array vazio, já que não estamos mapeando os itens
        };
    }
}
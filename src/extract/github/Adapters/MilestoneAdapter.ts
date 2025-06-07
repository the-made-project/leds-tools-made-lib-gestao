import { Milestone } from "../../../model/models";
import { GitHubMilestone } from "../milestone.extract";

interface MilestoneAdapter {
    toInternalFormat(gitHubMilestone: GitHubMilestone): Milestone;
}

export class DefaultMilestoneAdapter implements MilestoneAdapter {
    toInternalFormat(gitHubMilestone: GitHubMilestone): Milestone {
        // Determina o status com base no estado e datas
        let status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' = 'PLANNED';
        
        if (gitHubMilestone.state === 'closed') {
        status = 'COMPLETED';
        } else if (gitHubMilestone.state === 'open') {
        const now = new Date();
        const dueDate = gitHubMilestone.due_on ? new Date(gitHubMilestone.due_on) : null;
        
        if (dueDate && dueDate < now) {
            status = 'DELAYED';
        } else {
            status = 'IN_PROGRESS';
        }
        }
        
        return {
        id: gitHubMilestone.id.toString(),
        name: gitHubMilestone.title,
        description: gitHubMilestone.description || '',
        startDate: gitHubMilestone.created_at,
        dueDate: gitHubMilestone.due_on || gitHubMilestone.updated_at,
        status
        };
    }
}
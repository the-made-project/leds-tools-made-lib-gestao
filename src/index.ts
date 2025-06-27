import { MarkdownService } from "./documentation/service/markdown/MarkdownService";
export * from './model/models';
// import { GitHubService } from "./service/GitHubService";
import { GitHubPushService } from "./service/GitHubPushService";
import { GitHubTokenManager } from "./service/GitHubTokenManager";
import type { Project, Issue, Backlog, Team, TimeBox } from './model/models';

export class ReportManager {

    // public async githubETL(token: string, org: string, project: string) {
    //     if (!token) throw new Error('GITHUB_TOKEN not set');
    //     GitHubTokenManager.initialize(token);
        
    //     const githubService = new GitHubService();
    //     await githubService.ETLProject(org, project);
    //     await githubService.ETLIssue(org, project);
    //     await githubService.ETLBacklog(org, project);
    //     await githubService.ETLTimeBox(org, project);
    // }

    public async githubPush(
        token: string,
        org: string,
        repo: string,
        project: Project,
        epics: Issue[],
        stories: Issue[],
        tasks: Issue[],
        backlogs?: Backlog[],
        teams?: Team[],
        timeboxes?: TimeBox[]
    ) {
        GitHubTokenManager.initialize(token);
        const pushService = new GitHubPushService();
        try {
            await pushService.fullPush(org, repo, project, epics, stories, tasks, backlogs, teams, timeboxes);
        } catch (error) {
            console.error("Erro durante o push para o GitHub:", error);
            throw error;
        }
    }

    public createReport(dbPath: string) {
        const markdownService = new MarkdownService(dbPath);
        markdownService.createManagementDocumentation();
    }
}

import { MarkdownService } from "./documentation/service/markdown/MarkdownService";
export * from './model/models';
import { GitHubPushService } from "./service/GitHubPushService";
import { GitHubTokenManager } from "./service/GitHubTokenManager";
import type { Project, Issue, Backlog } from './model/models';

export class ReportManager {
    public async githubPush(
        token: string,
        org: string,
        repo: string,
        project: Project,
        epics: Issue[],
        stories: Issue[],
        tasks: Issue[],
        backlogs?: Backlog[]
    ) {
        GitHubTokenManager.initialize(token);
        const pushService = new GitHubPushService();
        await pushService.fullPush(org, repo, project, epics, stories, tasks, backlogs);
    }

    public createReport(dbPath: string) {
        const markdownService = new MarkdownService(dbPath);
        markdownService.createManagementDocumentation();
    }
}

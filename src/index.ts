import { MarkdownService } from "./documentation/service/markdown/MarkdownService";
export * from './model/models';
import { GitHubService } from "./service/GitHubService";
import { GitHubPushService } from "./service/GitHubPushService";
import { GitHubTokenManager } from "./service/GitHubTokenManager";
import { time } from "console";

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
        project: import('./model/models').Project,
        issues: import('./model/models').Issue[],
        timebox: import('./model/models').TimeBox
    ) {
        GitHubTokenManager.initialize(token);
        const pushService = new GitHubPushService();
        await pushService.pushProjectWithIssues(org, repo, project, issues, timebox);
    }

    public createReport(dbPath: string) {
        const markdownService = new MarkdownService(dbPath);
        markdownService.createManagementDocumentation();
    }
    /*public createSprintSummary(dbPath: string){
        const markdownService = new MarkdownService(dbPath);
        return markdownService.createSprintSummary()
    }
    public createSprintSummaryReport(dbPath: string){
        const markdownService = new MarkdownService(dbPath);
        return markdownService.createSprintSumaryReport()
    }*/

   
}

import { MarkdownService } from "./documentation/service/markdown/MarkdownService";
export * from './model/models';
// import { GitHubService } from "./service/GitHubService";
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

    /**
     * Cria uma Feature (story) e suas Tasks no GitHub, seguindo o template correto.
     */
    public async githubPush(
        token: string,
        org: string,
        repo: string,
        project: import('./model/models').Project,
        story: import('./model/models').Issue[], // Feature
        tasks: import('./model/models').Issue[], // Tasks relacionadas à story
    ) {
        GitHubTokenManager.initialize(token);
        const pushService = new GitHubPushService();

        // Cria a Feature (story)
        const storyResults = await pushService.pushProjectWithIssues(org, repo, project, story);

        // Cria as Tasks relacionadas à Feature e relaciona
        if (tasks && tasks.length > 0) {
          const taskResults = await pushService.pushProjectWithIssues(org, repo, project, tasks);
          // Relaciona cada task à primeira story criada
          if (storyResults.length > 0) {
            for (const taskResult of taskResults) {
              await pushService.linkIssues(
                org,
                repo,
                storyResults[0].issueNumber, // agora garantido
                taskResult.issueNumber,
                'is blocked by'
              );
            }
          }
        }
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

import { MarkdownService } from "./documentation/service/markdown/MarkdownService";
export * from './model/models';
import { GitHubService } from "./service/GitHubService";

export class ReportManager {

    public async githubETL(token:string,org: string, project: string){
        const githubService = new GitHubService(token);
        await githubService.ETLProject(org, project);
        await githubService.ETLIssue(org, project);
        await githubService.ETLBacklog(org, project);
        await githubService.ETLTimeBox(org, project);

    }
    public createReport(dbPath: string){
        const markdownService = new MarkdownService(dbPath);
        markdownService.createManagementDocumenation()
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
  
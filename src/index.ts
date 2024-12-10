import { MarkdownService } from "./documentation/service/markdown/MarkdownService";

export * from './model/models';

export class ReportManager {

    public createReport(dbPath: string){
        const markdownService = new MarkdownService(dbPath);
        markdownService.createManagementDocumenation()
    }
    public createSprintSummary(dbPath: string){
        const markdownService = new MarkdownService(dbPath);
        return markdownService.createSprintSummary()
    }
    public createSprintSummaryReport(dbPath: string){
        const markdownService = new MarkdownService(dbPath);
        return markdownService.createSprintSumaryReport()
    }
}
  
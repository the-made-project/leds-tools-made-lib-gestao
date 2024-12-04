import { MarkdownService } from "./documentation/service/markdown/MarkdownService";

export class ReportManager {

    public createReport(){
        const markdownService = new MarkdownService("./example");
        markdownService.createManagementDocumenation()
    }
}
  
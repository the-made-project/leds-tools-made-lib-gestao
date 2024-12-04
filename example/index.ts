import { MarkdownService } from "../src/documentation/service/markdown/MarkdownService";

async function main() {
    const projectPath = './project';
    const markdownService = new MarkdownService(projectPath);
    
    // Generate all documentation
    markdownService.createManagementDocumenation();
    
    // You can also access individual services if needed
    markdownService.markdownBacklogService.create();
    markdownService.markdownTimeBoxService.create();
    markdownService.markdownRoadmapService.create();
}

main().catch(console.error);
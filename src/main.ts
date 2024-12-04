import { MarkdownService } from "./documentation/service/markdown/MarkdownService";

async function main() {
    const markdownService = new MarkdownService("./");
    markdownService.createManagementDocumenation()
}

main().catch(console.error);
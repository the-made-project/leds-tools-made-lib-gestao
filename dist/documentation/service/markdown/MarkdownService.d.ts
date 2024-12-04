import { MarkdownBacklogService } from "./MarkdownBacklogService.js";
import { MarkdownTimeBoxService } from "./MarkdownTimeBoxService.js";
import { MardownRoadmapService } from "./MarkdownRoadmapService.js";
export declare class MarkdownService {
    target_folder: string;
    DB_PATH: string;
    markdownBacklogService: MarkdownBacklogService;
    markdownTimeBoxService: MarkdownTimeBoxService;
    markdownRoadmapService: MardownRoadmapService;
    constructor(target_folder: string);
    createManagementDocumenation(): void;
}

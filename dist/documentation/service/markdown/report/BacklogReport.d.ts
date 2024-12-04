import { Backlog } from '../../../../model/models.js';
export declare class BacklogMarkdownConverter {
    private getTypeEmoji;
    private formatDisplayType;
    private formatIssueForTable;
    convertBacklogsToMarkdown(backlogs: Backlog[]): string;
}

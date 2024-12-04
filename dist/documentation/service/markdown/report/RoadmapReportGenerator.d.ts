import { Roadmap } from '../../../../model/models.js';
export declare class RoadmapReportGenerator {
    private roadmaps;
    constructor(roadmaps: Roadmap[]);
    private formatDate;
    private getStatusEmoji;
    private generateMilestonesSection;
    private generateReleasesTable;
    private generateIssuesTable;
    private generateProgressOverview;
    private generateTimeline;
    generateReport(): string;
    generateSingleRoadmapReport(roadmapId: string): string | null;
}

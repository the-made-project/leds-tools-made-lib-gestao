import { Project, TimeBox } from '../../../../../model/models.js';
export declare class ProjectMetricsGenerator {
    private sprints;
    constructor(sprints: TimeBox[]);
    private parseBrazilianDate;
    private formatDate;
    private calculateDuration;
    private getErrorMessage;
    private analyzeTaskStatus;
    private calculateVelocity;
    generateSprintSVG(sprints: TimeBox[]): string;
    private generateSummaryTable;
    private generateMarkdownReport;
    generateFiles(outputDir: string, project: Project): Promise<void>;
}

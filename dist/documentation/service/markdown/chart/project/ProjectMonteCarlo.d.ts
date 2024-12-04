import { TimeBox } from '../../../../../model/models.js';
export declare class ProjectMonteCarlo {
    private sprints;
    private readonly simulations;
    constructor(sprintsData: TimeBox[], simulations?: number);
    private parseBrazilianDate;
    private sortSprints;
    private calculateDailyVelocity;
    private getProjectMetrics;
    private simulateCompletionDates;
    private formatDate;
    private getDateStatus;
    private getCompletionStatus;
    generateMarkdownReport(): string;
}

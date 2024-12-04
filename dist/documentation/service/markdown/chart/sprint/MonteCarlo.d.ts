import { TimeBox } from "../../../../../model/models.js";
export interface SprintTaskMC {
    issue: string;
    completedDate?: string;
    startDate: string;
    status: string;
}
export interface SprintDataMC {
    startDate: string;
    endDate: string;
    name: string;
    tasks: SprintTaskMC[];
}
export declare class SprintMonteCarlo {
    private data;
    private readonly simulations;
    constructor(sprintData: TimeBox, simulations?: number);
    private parseBrazilianDate;
    private calculateDailyVelocity;
    private calculateRemainingWorkdays;
    private getSprintMetrics;
    private simulateCompletionDates;
    private formatDate;
    private getDateStatus;
    private getCompletionStatus;
    generateMarkdownReport(): string;
}

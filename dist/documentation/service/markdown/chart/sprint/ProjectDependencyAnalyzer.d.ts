import { TimeBox } from '../../../../../model/models.js';
export declare class ProjectDependencyAnalyzer {
    private allIssues;
    private sprintItems;
    private graph;
    private reversedGraph;
    private issueStatus;
    constructor(sprint: TimeBox);
    private validateInputs;
    private initializeFromSprint;
    private findCycles;
    private generateMermaidDiagram;
    private getTopologicalSort;
    generateAnalysis(): string;
}

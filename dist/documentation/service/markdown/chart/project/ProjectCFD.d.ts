import { TimeBox } from '../../../../../model/models.js';
export declare class ProjectCFD {
    private sprints;
    private readonly outputPath;
    constructor(sprints: TimeBox[], outputPath?: string);
    private parseBrazilianDate;
    private sortSprints;
    private processData;
    private generateSVG;
    generate(): void;
}

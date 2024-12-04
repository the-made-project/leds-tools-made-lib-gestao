import { TimeBox } from '../../../../../model/models.js';
export declare class ThroughputGenerator {
    private data;
    private readonly outputPath;
    constructor(sprintData: TimeBox, outputPath?: string);
    private parseBrazilianDate;
    private formatDate;
    private processData;
    private generateSVG;
    generate(): void;
}

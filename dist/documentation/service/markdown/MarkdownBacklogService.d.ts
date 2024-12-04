import { TimeBox } from '../../../model/models.js';
export declare class MarkdownBacklogService {
    target_folder: string;
    jsonTimeBox: string;
    jsonFileBacklog: string;
    DB_PATH: string;
    sprintData: TimeBox[];
    constructor(target_folder: string, db_path: string);
    create(): Promise<void>;
    protected retrive(database: string): Promise<any[]>;
}

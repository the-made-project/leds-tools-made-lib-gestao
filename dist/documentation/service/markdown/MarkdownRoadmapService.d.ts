export declare class MardownRoadmapService {
    target_folder: string;
    jsonFile: string;
    DB_PATH: string;
    constructor(target_folder: string, db_path: string);
    create(): Promise<void>;
    protected retrive(database: string): Promise<any[]>;
}

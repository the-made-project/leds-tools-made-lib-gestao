export declare class MarkdownTimeBoxService {
    target_folder: string;
    TIMEBOX_PATH: string;
    TIMEBOX_CHARTS_PATH: string;
    jsonFile: string;
    DB_PATH: string;
    constructor(target_folder: string, db_path: string);
    private createCategory;
    private createCategoryIndex;
    create(): Promise<void>;
    private fileContainsName;
    private createTimeBoxExport;
    protected retrive(database: string): Promise<any[]>;
}

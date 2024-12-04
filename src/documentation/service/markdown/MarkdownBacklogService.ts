
import * as path from 'path';
import * as fs from 'fs';
import { LowSync } from 'lowdb';
import { JSONFileSync  } from 'lowdb/node';

import {IssuesDTO,TimeBox} from '../../../model/models.js'
import { ProjectMetricsGenerator } from "./chart/project/ProjectMetricsGenerator.js";
import { BacklogMarkdownConverter } from "./report/BacklogReport.js";


export class MarkdownBacklogService {

    
    target_folder:string  
    jsonTimeBox: string
    jsonFileBacklog:string
    DB_PATH: string
    sprintData: TimeBox[] 
    
    constructor ( target_folder:string, db_path:string){
       
        this.target_folder = target_folder       
        this.jsonTimeBox = "timebox.json"
        this.jsonFileBacklog = "backlog.json"
        this.DB_PATH = db_path
        this.sprintData = []
    }


    public async create(){

        const backlogs = await this.retrive(this.jsonFileBacklog);        
        
        const converter = new BacklogMarkdownConverter();
        const markdown = converter.convertBacklogsToMarkdown(backlogs);
        const outputDirBacklolg = path.join(this.target_folder, '02_backlogs.md');

        fs.writeFileSync(outputDirBacklolg, markdown, 'utf8');

        this.sprintData = await this.retrive(this.jsonTimeBox); 
        const project = await this.retrive ("project.json");
        const project_x = project[0]
        const generator = new ProjectMetricsGenerator(this.sprintData);        
  
        try {
            await generator.generateFiles(this.target_folder, project_x);
           
        } catch (error) {
            console.error('Erro ao gerar relatórios:', error);
        }
    }

   

    protected async retrive(database: string){
    
        const ISSUEPATH = path.join(this.DB_PATH, database);
        
        const adapter = new JSONFileSync<IssuesDTO>(ISSUEPATH);
        const defaultData: IssuesDTO = { data: [] };

        const db = new LowSync<IssuesDTO>(adapter, defaultData);
        await db.read();
        
        return db.data.data.sort((a, b) => {
            return Number(a.id) - Number(b.id);
        }); 
        
    }   
   

}
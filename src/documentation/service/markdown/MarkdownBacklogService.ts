import * as path from 'path';
import * as fs from 'fs';
import { LowSync } from 'lowdb';
import { JSONFileSync  } from 'lowdb/node';

import { AbstractMarkdown } from './AbstractMarkdown.js';
import { BacklogMarkdownConverter } from './report/BacklogReport.js';
import { ProjectMetricsGenerator } from './chart/project/ProjectMetricsGenerator.js';

import type { IssuesDTO, TimeBox } from '../../../model/models.js';


export class MarkdownBacklogService extends AbstractMarkdown {

    jsonTimeBox: string
    jsonFileBacklog:string
    sprintData: TimeBox[] 

    constructor (target_folder: string, db_path: string) {
        super(target_folder, db_path)
        this.jsonTimeBox = "timebox.json"
        this.jsonFileBacklog = "backlog.json"
        this.sprintData = []
    }


    public async create(){

        const backlogs = await this.retrieve(this.jsonFileBacklog);        
        
        const converter = new BacklogMarkdownConverter();
        const markdown = converter.convertBacklogsToMarkdown(backlogs);
        const outputDirBacklog = path.join(this.target_folder, '02_backlogs.md');

        fs.writeFileSync(outputDirBacklog, markdown, 'utf8');

        this.sprintData = await this.retrieve(this.jsonTimeBox); 
        const project = await this.retrieve("project.json");
        const project_x = project[0]
        const generator = new ProjectMetricsGenerator(this.sprintData);        
  
        try {
            await generator.generateFiles(this.target_folder, project_x);
           
        } catch (error) {
            console.error('Erro ao gerar relatórios:', error);
        }
    }

}

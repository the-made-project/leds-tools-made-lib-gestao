import * as path from 'path';
import * as fs from 'fs';
import { LowSync } from 'lowdb';
import { JSONFileSync  } from 'lowdb/node';

import { AbstractMarkdown } from './AbstractMarkdown'
import { RoadmapReportGenerator } from "./report/RoadmapReportGenerator.js";

import type { IssuesDTO, Roadmap } from '../../../model/models.js'


export class MarkdownRoadmapService extends AbstractMarkdown {
    
    constructor (target_folder:string, db_path:string) {
        super(target_folder, db_path)
        this.jsonFile = "roadmap.json"
    }

    public async create() {

        let roadmap: Roadmap[] = (await this.retrieve(this.jsonFile)) as Roadmap[];
 
        const generator = new RoadmapReportGenerator(roadmap);
       
        fs.writeFileSync(path.join(this.target_folder, `/03_roadmap.md`),  generator.generateReport())
                        
    }

}
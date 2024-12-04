import {IssuesDTO, Roadmap} from '../../../model/models.js'
import * as path from 'path';
import * as fs from 'fs';
import { LowSync } from 'lowdb';
import { JSONFileSync  } from 'lowdb/node';
import { RoadmapReportGenerator } from "./report/RoadmapReportGenerator.js";


export class MardownRoadmapService {

    target_folder:string  
    jsonFile: string
    DB_PATH: string
    
    constructor ( target_folder:string, db_path:string){
        this.target_folder = target_folder
        //this.MANAGEMENT_PATH = createPath(this.target_folder,'management')        
        this.jsonFile = "roadmap.json"
        this.DB_PATH = db_path
    }

    public async create(){

        let roadmap: Roadmap[] = (await this.retrive(this.jsonFile)) as Roadmap[];
 
        const generator = new RoadmapReportGenerator(roadmap);
       
        fs.writeFileSync(path.join(this.target_folder, `/03_roadmap.md`),  generator.generateReport())
                        
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

import * as fs from 'fs';
import { createPath} from '../../../util/generator-utils.js'
import { MarkdownBacklogService } from "./MarkdownBacklogService.js";
import { MarkdownTimeBoxService } from "./MarkdownTimeBoxService.js";
import { MardownRoadmapService } from "./MarkdownRoadmapService.js";


export class MarkdownService {

    target_folder:string
    DB_PATH: string
    
    markdownBacklogService: MarkdownBacklogService
    markdownTimeBoxService: MarkdownTimeBoxService
    markdownRoadmapService: MardownRoadmapService

    constructor ( target_folder:string){
       
        this.target_folder = target_folder
        this.DB_PATH = createPath(this.target_folder,'db')
        fs.mkdirSync(this.target_folder, {recursive:true})
        
        this.markdownBacklogService = new MarkdownBacklogService(this.target_folder,this.DB_PATH)
        this.markdownTimeBoxService = new MarkdownTimeBoxService(this.target_folder, this.DB_PATH)
        this.markdownRoadmapService = new MardownRoadmapService(this.target_folder, this.DB_PATH)
        
    }

    public createManagementDocumenation(){
        this.markdownTimeBoxService.create()
        this.markdownBacklogService.create()
        this.markdownRoadmapService.create()
    }

    public createSprintSummary(){
        return this.markdownTimeBoxService.createSprintSummary()
    }

 
    
     

}
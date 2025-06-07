import * as fs from 'fs';

import { MarkdownFactory } from './MarkdownFactory';
import { MarkdownBacklogService } from './MarkdownBacklogService.js';
import { MarkdownTimeBoxService } from './MarkdownTimeBoxService.js';
import { MarkdownRoadmapService } from './MarkdownRoadmapService.js';

import { createPath} from '../../../util/generator-utils.js'


export class MarkdownService {

    target_folder:string
    DB_PATH: string
    
    markdownBacklogService: MarkdownBacklogService
    markdownTimeBoxService: MarkdownTimeBoxService
    markdownRoadmapService: MarkdownRoadmapService

    constructor (target_folder: string){
       
        this.target_folder = target_folder
        this.DB_PATH = createPath(this.target_folder,'db')
        fs.mkdirSync(this.target_folder, {recursive:true})
        
        this.markdownBacklogService = MarkdownFactory.createMarkdown('Backlog', this.target_folder, this.DB_PATH) as MarkdownBacklogService
        this.markdownTimeBoxService = MarkdownFactory.createMarkdown('TimeBox', this.target_folder, this.DB_PATH) as MarkdownTimeBoxService
        this.markdownRoadmapService = MarkdownFactory.createMarkdown('Roadmap', this.target_folder, this.DB_PATH) as MarkdownRoadmapService
        
    }

    public createManagementDocumentation(){
        this.markdownTimeBoxService.create()
        this.markdownBacklogService.create()
        this.markdownRoadmapService.create()
    }

    public createSprintSummary(){
        return this.markdownTimeBoxService.createSprintSummary()
    }

    public createSprintSumaryReport(){
        return this.markdownTimeBoxService.createSprintSummaryReport()
        
    }

}

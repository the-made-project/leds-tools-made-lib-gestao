import { createPath} from '../../../util/generator-utils.js'
import * as path from 'path';
import * as fs from 'fs';
import { readdirSync } from 'fs';

import { LowSync } from 'lowdb';
import { JSONFileSync  } from 'lowdb/node';
import { IssuesDTO, TimeBox} from '../../../model/models.js'
import { CumulativeFlowDiagram } from './chart/sprint/CumulativeFlowDiagram.js';
import { SprintMonteCarlo } from "./chart/sprint/MonteCarlo.js";
import { ProjectDependencyAnalyzer } from "./chart/sprint/ProjectDependencyAnalyzer.js";
import { SprintSummary, SprintSummaryGenerator } from './sprint/SprintSummaryGenerator.js';

export class MarkdownTimeBoxService {

    target_folder:string
    TIMEBOX_PATH :string
    TIMEBOX_CHARTS_PATH :string
    jsonFile: string
    DB_PATH: string
    
    constructor ( target_folder:string, db_path:string){
     
        this.target_folder = target_folder
        this.TIMEBOX_PATH = createPath(this.target_folder,'sprints')
        this.TIMEBOX_CHARTS_PATH = createPath(this.TIMEBOX_PATH,'charts')
        this.jsonFile = "timebox.json"
        this.DB_PATH = db_path
    }
    private async createCategory(){
        return `
        {
            "label": " 🚀 Sprints",
            "position": 4,
            "link": {
                "type": "generated-index",
                "description": "Documentos sobre os sprints."
            }
            }
        `
    }

    private async createCategoryIndex(){
        return `
      {
        "label": "Gestão",
        "position": 1,
        "link": {
            "type": "generated-index",
            "description": "Documentos relativos ao planejamento."
        }
        }
        `
    }
    public async create(){

        const timeBoxes = await this.retrive(this.jsonFile);
        
        const filePathCategory = path.join(this.TIMEBOX_PATH, "_category_.json")

        const filePathCategoryxxx = path.join(this.target_folder, "_category_.json")

        fs.writeFileSync(filePathCategory, await this.createCategory())
        fs.writeFileSync(filePathCategoryxxx, await this.createCategoryIndex())

        timeBoxes.forEach (timebox  =>{
            const fileName = `/${timebox.id}.md`            
            const filePath = path.join(this.TIMEBOX_PATH, fileName)
            const exist = this.fileContainsName(this.TIMEBOX_PATH, fileName)
            // Gerar o CFD
            let generatorx = new CumulativeFlowDiagram(timebox,this.TIMEBOX_CHARTS_PATH+`/cfd-${timebox.id}.svg`);
            
            if (!exist){
                fs.writeFileSync(filePath, this.createTimeBoxExport(timebox))
                generatorx.generate();            
            }
            if (exist && timebox.status != 'CLOSED'){
                fs.writeFileSync(filePath, this.createTimeBoxExport(timebox))                        
                generatorx.generate();   
            }
            
        } );
                
    }
    private  fileContainsName(directory: string, partialName: string): boolean {
        try {
            const files = readdirSync(directory); // Lista todos os arquivos no diretório
            return files.some(file => file.includes(partialName)); // Verifica se algum arquivo contém o nome parcial
        } catch (error) {
            console.error(`Erro ao acessar o diretório: ${error}`);
            return false;
        }
    }
    private createTimeBoxExport(timeBox: TimeBox ):string {

       let monteCarloAnalysis = ""
       if (timeBox.status == "IN_PROGRESS"){
          const monteCarlo = new SprintMonteCarlo(timeBox,10000);
          monteCarloAnalysis = monteCarlo.generateMarkdownReport();
       }
      
      const analyzer = new ProjectDependencyAnalyzer(timeBox);
      const dependencyAnalysis = analyzer.generateAnalysis();

        return `# ${timeBox.name.toLocaleUpperCase()}

${timeBox.description}

## Dados do Sprint
* **Goal**:  ${timeBox.description}
* **Data Início**: ${timeBox.startDate}
* **Data Fim**: ${timeBox.endDate}
* **Status**: ${timeBox.status}
## Sprint Backlog

|Nome |Descrição|Resposável |Data de Inicío | Data Planejada | Status|
|:----|:---------|:--------  |:-------:       | :----------:  | :---: |
${timeBox.sprintItems?.map(assignee => `|${assignee.issue.title ?? "-"}|${assignee.issue.description ?? "-"}|${assignee.assignee.name}|${assignee.startDate?? ""}|${assignee.dueDate ?? ""}|${assignee.status?.toLocaleUpperCase()}|`).join("\n")}
      
${dependencyAnalysis}
        
       
## Cumulative Flow
![ Cumulative Flow](./charts/cfd-${timeBox.id}.svg)
        
${monteCarloAnalysis}
        `
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

    protected async retrive_status_in_progress(database: string) {
        const ISSUEPATH = path.join(this.DB_PATH, database);
        
        const adapter = new JSONFileSync<IssuesDTO>(ISSUEPATH);
        const defaultData: IssuesDTO = { data: [] };
    
        const db = new LowSync<IssuesDTO>(adapter, defaultData);
        await db.read();
        
        return db.data.data
            .filter(sprint => sprint.status === 'IN_PROGRESS')
            .sort((a, b) => {
                return Number(a.id) - Number(b.id);
            }); 
    }

    public async createSprintSummary(){
        const sprints = await this.retrive_status_in_progress(this.jsonFile)
        const generator = new SprintSummaryGenerator(sprints);
        const summary = await generator.generateSprintsSummary();
        return summary
    }

    public async createSprintSummaryReport(){
        const sprints = await this.retrive_status_in_progress(this.jsonFile)
        const generator = new SprintSummaryGenerator(sprints);
        let summary: SprintSummary[] = await generator.generateSprintsSummary();
        return await generator.createSprintDiscordMarkdown(summary)
    }
   

}
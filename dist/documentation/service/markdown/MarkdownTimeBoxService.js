"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownTimeBoxService = void 0;
const generator_utils_js_1 = require("../../../util/generator-utils.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const fs_2 = require("fs");
const lowdb_1 = require("lowdb");
const node_1 = require("lowdb/node");
const CumulativeFlowDiagram_js_1 = require("./chart/sprint/CumulativeFlowDiagram.js");
const MonteCarlo_js_1 = require("./chart/sprint/MonteCarlo.js");
const ProjectDependencyAnalyzer_js_1 = require("./chart/sprint/ProjectDependencyAnalyzer.js");
class MarkdownTimeBoxService {
    constructor(target_folder, db_path) {
        this.target_folder = target_folder;
        //this.MANAGEMENT_PATH = createPath(this.target_folder,'management')
        this.TIMEBOX_PATH = (0, generator_utils_js_1.createPath)(this.target_folder, 'sprints');
        this.TIMEBOX_CHARTS_PATH = (0, generator_utils_js_1.createPath)(this.TIMEBOX_PATH, 'charts');
        this.jsonFile = "timebox.json";
        this.DB_PATH = db_path;
    }
    createCategory() {
        return __awaiter(this, void 0, void 0, function* () {
            return `
        {
            "label": " 🚀 Sprints",
            "position": 4,
            "link": {
                "type": "generated-index",
                "description": "Documentos sobre os sprints."
            }
            }
        `;
        });
    }
    createCategoryIndex() {
        return __awaiter(this, void 0, void 0, function* () {
            return `
      {
        "label": "Gestão",
        "position": 1,
        "link": {
            "type": "generated-index",
            "description": "Documentos relativos ao planejamento."
        }
        }
        `;
        });
    }
    create() {
        return __awaiter(this, void 0, void 0, function* () {
            const timeBoxes = yield this.retrive(this.jsonFile);
            const filePathCategory = path_1.default.join(this.TIMEBOX_PATH, "_category_.json");
            const filePathCategoryxxx = path_1.default.join(this.target_folder, "_category_.json");
            fs_1.default.writeFileSync(filePathCategory, yield this.createCategory());
            fs_1.default.writeFileSync(filePathCategoryxxx, yield this.createCategoryIndex());
            timeBoxes.forEach(timebox => {
                const fileName = `/${timebox.id}.md`;
                const filePath = path_1.default.join(this.TIMEBOX_PATH, fileName);
                const exist = this.fileContainsName(this.TIMEBOX_PATH, fileName);
                // Gerar o CFD
                let generatorx = new CumulativeFlowDiagram_js_1.CumulativeFlowDiagram(timebox, this.TIMEBOX_CHARTS_PATH + `/cfd-${timebox.id}.svg`);
                if (!exist) {
                    fs_1.default.writeFileSync(filePath, this.createTimeBoxExport(timebox));
                    generatorx.generate();
                }
                if (exist && timebox.status != 'CLOSED') {
                    fs_1.default.writeFileSync(filePath, this.createTimeBoxExport(timebox));
                    generatorx.generate();
                }
            });
        });
    }
    fileContainsName(directory, partialName) {
        try {
            const files = (0, fs_2.readdirSync)(directory); // Lista todos os arquivos no diretório
            return files.some(file => file.includes(partialName)); // Verifica se algum arquivo contém o nome parcial
        }
        catch (error) {
            console.error(`Erro ao acessar o diretório: ${error}`);
            return false;
        }
    }
    createTimeBoxExport(timeBox) {
        var _a;
        let monteCarloAnalysis = "";
        if (timeBox.status == "IN_PROGRESS") {
            const monteCarlo = new MonteCarlo_js_1.SprintMonteCarlo(timeBox, 10000);
            monteCarloAnalysis = monteCarlo.generateMarkdownReport();
        }
        const analyzer = new ProjectDependencyAnalyzer_js_1.ProjectDependencyAnalyzer(timeBox);
        const dependencyAnalysis = analyzer.generateAnalysis();
        return `
        
        # ${timeBox.name.toLocaleUpperCase()}
        ${timeBox.description}

        ## Dados do Sprint
        * **Goal**:  ${timeBox.description}
        * **Data Início**: ${timeBox.startDate}
        * **Data Fim**: ${timeBox.endDate}
        * **Status**: ${timeBox.status}
        ## Sprint Backlog

        |ID |Nome |Resposável |Data de Inicío | Data Planejada | Status|
        |:----    |:----|:--------  |:-------:       | :----------:  | :---: |
        ${(_a = timeBox.sprintItems) === null || _a === void 0 ? void 0 : _a.map(assignee => { var _a, _b, _c, _d; return `|${assignee.issue.id.toLocaleLowerCase()}|${(_a = assignee.issue.title) !== null && _a !== void 0 ? _a : "-"}|${assignee.assignee.name}|${(_b = assignee.startDate) !== null && _b !== void 0 ? _b : ""}|${(_c = assignee.dueDate) !== null && _c !== void 0 ? _c : ""}|${(_d = assignee.status) === null || _d === void 0 ? void 0 : _d.toLocaleUpperCase()}|`; }).join("\n")}
      
        ${dependencyAnalysis}
        
       
        ## Cumulative Flow
        ![ Cumulative Flow](./charts/cfd-${timeBox.id}.svg)
        
        ${monteCarloAnalysis}
        `;
    }
    retrive(database) {
        return __awaiter(this, void 0, void 0, function* () {
            const ISSUEPATH = path_1.default.join(this.DB_PATH, database);
            const adapter = new node_1.JSONFileSync(ISSUEPATH);
            const defaultData = { data: [] };
            const db = new lowdb_1.LowSync(adapter, defaultData);
            yield db.read();
            return db.data.data.sort((a, b) => {
                return Number(a.id) - Number(b.id);
            });
        });
    }
}
exports.MarkdownTimeBoxService = MarkdownTimeBoxService;

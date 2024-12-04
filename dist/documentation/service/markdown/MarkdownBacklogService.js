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
exports.MarkdownBacklogService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const lowdb_1 = require("lowdb");
const node_1 = require("lowdb/node");
const ProjectMetricsGenerator_js_1 = require("./chart/project/ProjectMetricsGenerator.js");
const BacklogReport_js_1 = require("./report/BacklogReport.js");
class MarkdownBacklogService {
    constructor(target_folder, db_path) {
        this.target_folder = target_folder;
        this.jsonTimeBox = "timebox.json";
        this.jsonFileBacklog = "backlog.json";
        this.DB_PATH = db_path;
        this.sprintData = [];
    }
    create() {
        return __awaiter(this, void 0, void 0, function* () {
            const backlogs = yield this.retrive(this.jsonFileBacklog);
            const converter = new BacklogReport_js_1.BacklogMarkdownConverter();
            const markdown = converter.convertBacklogsToMarkdown(backlogs);
            const outputDirBacklolg = path_1.default.join(this.target_folder, '02_backlogs.md');
            fs_1.default.writeFileSync(outputDirBacklolg, markdown, 'utf8');
            this.sprintData = yield this.retrive(this.jsonTimeBox);
            const project = yield this.retrive("project.json");
            const project_x = project[0];
            const generator = new ProjectMetricsGenerator_js_1.ProjectMetricsGenerator(this.sprintData);
            try {
                yield generator.generateFiles(this.target_folder, project_x);
            }
            catch (error) {
                console.error('Erro ao gerar relatórios:', error);
            }
        });
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
exports.MarkdownBacklogService = MarkdownBacklogService;

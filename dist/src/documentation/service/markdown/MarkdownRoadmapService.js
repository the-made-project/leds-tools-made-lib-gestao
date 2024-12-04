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
exports.MardownRoadmapService = void 0;
const path_1 = __importDefault(require("path"));
const lowdb_1 = require("lowdb");
const node_1 = require("lowdb/node");
const RoadmapReportGenerator_js_1 = require("./report/RoadmapReportGenerator.js");
const fs_1 = __importDefault(require("fs"));
class MardownRoadmapService {
    constructor(target_folder, db_path) {
        this.target_folder = target_folder;
        //this.MANAGEMENT_PATH = createPath(this.target_folder,'management')        
        this.jsonFile = "roadmap.json";
        this.DB_PATH = db_path;
    }
    create() {
        return __awaiter(this, void 0, void 0, function* () {
            let roadmap = (yield this.retrive(this.jsonFile));
            const generator = new RoadmapReportGenerator_js_1.RoadmapReportGenerator(roadmap);
            fs_1.default.writeFileSync(path_1.default.join(this.target_folder, `/03_roadmap.md`), generator.generateReport());
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
exports.MardownRoadmapService = MardownRoadmapService;

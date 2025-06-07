import * as path from 'path'

import { LowSync } from 'lowdb';
import { JSONFileSync  } from 'lowdb/node';

import type { IssuesDTO, Roadmap } from '../../../model/models.js'

export abstract class AbstractMarkdown {

  target_folder:string  
  jsonFile: string
  DB_PATH: string

  constructor (target_folder: string, db_path: string) {
      this.target_folder = target_folder
      this.jsonFile = "data.json"
      this.DB_PATH = db_path
  }

  protected async retrieve(database: string) {

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

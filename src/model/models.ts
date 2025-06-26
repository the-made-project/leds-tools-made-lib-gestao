export type Project = {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  dueDate: string;
  completedDate?: string;
}


export type Backlog = {
  id: string;
  name: string;
  description: string;
  issues?: Issue[];
}


export type Roadmap = {
  id: string;
  name?: string;
  description?: string;
  milestones?: Milestone[];
}

export type Milestone = {
  id: string;
  name: string;
  description: string;
  startDate: string
  dueDate: string;
  status?: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
  dependencies?: Milestone[];
  releases?: Release[];
  
}

export type Release = {
  id: string;
  version: string;
  name: string;
  description: string;
  releasedDate?: string;
  dueDate: string;
  status?: 'PLANNED' | 'IN_DEVELOPMENT' | 'TESTING' | 'RELEASED';
  issues?: Issue[];
}

 
export type IssuesDTO = {
  data: any[];
};


export type Team = {
  id: string;  
  name: string;
  description: string
  teamMembers: Person[] 
}

export type Person = {
  id: string;  
  email: string;
  name: string;  
  discord: string;
}

 export type TimeBox = {
  id?: string;  
  description: string;
  startDate: string;
  endDate: string;
  name: string;      
  status?: 'PLANNED' | 'IN_PROGRESS' | 'CLOSED' ;
  completeDate?: string;  
  sprintItems: SprintItem[];
};

export type SprintItem = {
  id: string;
  assignee: Person;
  issue: Issue;
  startDate?: string;
  dueDate?: string;
  plannedStartDate?: string;
  plannedDueDate?: string;
  status?: string;  
}

export type Issue = {
  id: string;
  externalId?: string;
  key?: string;
  self?: string;
  type: string;
  subtype: string;
  title?: string;
  description?: string;
  status?: string;
  createdDate?: string;            
  issues?: Issue[]; 
  depends?: Issue[];
  labels?: string[];
  assignee?: Person;
  backlog?: string;
  criterions?: string[];
  observation?: string;
  requirements?: string[];
  deliverables?: string[];
};

export type Task  = {
  id?: string;  
  name: string;
  description: string
  depends?: (Process | Activity | Task)[];
}

export type Activity  = {  
  id?: string;  
  name: string;
  description: string  
  tasks: Task[]
  depends?: (Process | Activity | Task)[];
}

export type Process  = {
  id?: string;  
  name: string;
  description: string;
  activities: Activity[];
  depends?: (Process | Activity | Task)[];
}

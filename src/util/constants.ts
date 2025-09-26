/**
 * Application constants
 */

// GitHub API endpoints
export const GITHUB_API = {
  BASE_URL: 'https://api.github.com',
  GRAPHQL_ENDPOINT: 'https://api.github.com/graphql',
} as const;

// Issue types
export const ISSUE_TYPES = {
  EPIC: 'Epic',
  FEATURE: 'Feature',
  STORY: 'Story', 
  TASK: 'Task',
  BUG: 'Bug',
} as const;

// Project field names
export const PROJECT_FIELDS = {
  TYPE: 'Type',
  STATUS: 'Status',
  BACKLOG: 'Backlog',
  ASSIGNEES: 'Assignees',
  PRIORITY: 'Priority',
} as const;

// Default label colors
export const LABEL_COLORS = {
  FEATURE: '1d76db',
  TASK: 'cccccc',
  EPIC: '5319e7',
  BUG: 'd73a4a',
  ENHANCEMENT: 'a2eeef',
  DOCUMENTATION: '0075ca',
  BACKLOG: 'ededed',
  SPRINT: '0052CC',
  RELEASE: '0052CC',
  DEFAULT: 'cccccc',
  ROADMAP: '8B5CF6',
  MILESTONE: '6366F1'
} as const;

// Sprint/Timebox status colors
export const STATUS_COLORS = {
  PLANNED: 'FEF2C0',
  IN_PROGRESS: 'FBCA04',
  COMPLETED: '0E8A16',
  CLOSED: '6C757D',
  DELAYED: 'D93F0B',
} as const;

// File paths
export const DATA_PATHS = {
  PROCESSED_ISSUES: './data/db/processed_issues.json',
  PROCESSED_PROJECTS: './data/db/processed_projects.json',
  PROCESSED_TEAMS: './data/db/processed_teams.json',
  PROCESSED_TIMEBOXES: './data/db/processed_timeboxes.json',
} as const;

// Error messages
export const ERROR_MESSAGES = {
  INVALID_ISSUE: 'Issue inválida detectada',
  MISSING_TITLE: 'Issue sem título detectada',
  MISSING_ID: 'Issue sem ID detectada',
  REPOSITORY_NOT_FOUND: 'Repositório não encontrado ou sem permissões suficientes',
  LABEL_NOT_FOUND: 'Label não encontrada no repositório',
  PROJECT_NOT_FOUND: 'Projeto não encontrado',
  ORGANIZATION_NOT_FOUND: 'Organização não encontrada ou sem permissões',
} as const;
import axios from 'axios';
import dotenv from 'dotenv';

// Configuração do dotenv para carregar variáveis de ambiente
dotenv.config();

const GITHUB_API_URL = 'https://api.github.com/graphql';
const JIRA_API_V3_URL = 'https://{domain}.atlassian.net/rest/api/3/{resource}';
const JIRA_API_AGILE_URL = 'https://{domain}.atlassian.net/rest/agile/1.0/{resource}';


export function axiosInstance(github_token: string) {
    return axios.create({
        baseURL: GITHUB_API_URL,
        headers: {
            Authorization: `Bearer ${github_token}`,
            'Content-Type': 'application/json',
        },
    });
}

export function axiosJiraInstance(domain: string, userName: string, apiToken: string, resource: string, apiAgile: boolean = false) {
    const jiraApiUrl = apiAgile ? JIRA_API_AGILE_URL : JIRA_API_V3_URL
    return axios.create({
        baseURL: jiraApiUrl.replace('{domain}', domain).replace('{resource}', resource),
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Basic ${Buffer.from(`${userName}:${apiToken}`).toString('base64')}`,
        }
    });
}

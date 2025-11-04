import axios from 'axios';
import dotenv from 'dotenv';

// Configuração do dotenv para carregar variáveis de ambiente
dotenv.config();

const GITHUB_API_URL = 'https://api.github.com/graphql';
const JIRA_API_URL = 'https://{domain}.atlassian.net/rest/api/3/{resource}';

export function axiosInstance(github_token: string) {
    return axios.create({
        baseURL: GITHUB_API_URL,
        headers: {
            Authorization: `Bearer ${github_token}`,
            'Content-Type': 'application/json',
        },
    });
}

export function axiosJiraInstance(domain: string, userName: string, apiToken: string, resource: string) {
    return axios.create({
        baseURL: JIRA_API_URL.replace('{domain}', domain).replace('{resource}', resource),
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        },
        auth: {
            username: userName,
            password: apiToken
        }
    });
}

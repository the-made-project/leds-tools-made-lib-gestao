import axios from 'axios';
import dotenv from 'dotenv';

// Configuração do dotenv para carregar variáveis de ambiente
dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_API_URL = 'https://api.github.com/graphql';

if (!GITHUB_TOKEN) {
    throw new Error('❌ GITHUB_TOKEN não está definido. Configure-o como uma variável de ambiente.');
}


export const axiosInstance = axios.create({
    baseURL: GITHUB_API_URL,
    headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
    },
});
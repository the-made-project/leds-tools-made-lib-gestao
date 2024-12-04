/**
 * Capitaliza uma string
 *
 * @param str - String a ser capitalizada
 * @returns A string capitalizada
 */
export declare function capitalizeString(str: string): string;
/**
 * Aplica `path.join` nos argumentos passados, e cria o caminho gerado caso não exista
 *
 * @param args - Caminho para ser construído
 * @returns O caminho construído e normalizado, o mesmo retorno que `path.join(args)`
 */
export declare const ident_size = 4;
export declare const base_ident: string;
export declare function createPath(...args: string[]): string;

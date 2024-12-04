"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.base_ident = exports.ident_size = void 0;
exports.capitalizeString = capitalizeString;
exports.createPath = createPath;
var path_1 = require("path");
var fs_1 = require("fs");
/**
 * Capitaliza uma string
 *
 * @param str - String a ser capitalizada
 * @returns A string capitalizada
 */
function capitalizeString(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
/**
 * Aplica `path.join` nos argumentos passados, e cria o caminho gerado caso não exista
 *
 * @param args - Caminho para ser construído
 * @returns O caminho construído e normalizado, o mesmo retorno que `path.join(args)`
 */
exports.ident_size = 4;
exports.base_ident = ' '.repeat(exports.ident_size);
function createPath() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var PATH = path_1.default.join.apply(path_1.default, args);
    if (!fs_1.default.existsSync(PATH)) {
        fs_1.default.mkdirSync(PATH, { recursive: true });
    }
    return PATH;
}

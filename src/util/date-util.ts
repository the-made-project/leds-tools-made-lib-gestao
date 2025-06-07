export function parseDate(dateStr: string) {
  if (!dateStr) {
    throw new Error('Data não fornecida');
  }

  dateStr = dateStr.trim();
  let dateRegex: RegExp;
  if (dateStr.includes('-')) {
    dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;

  } else {
    dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;

  }

  const match = dateStr.match(dateRegex);

  if (!match) {
    throw new Error(`Data inválida: ${dateStr}. Formato esperado: dd/mm/yyyy ou yyyy-mm-dd`);
  }

  let day: string, month: string, year: string;

  if (dateStr.includes('-')) {
    [, year, month, day] = match;
    
  } else {
    [, day, month, year] = match;

  }

  const date = new Date(`${year}-${month}-${day}`);

  if (isNaN(date.getTime())) {
    throw new Error(`Data inválida após conversão: ${dateStr}`);
  }

  return date;
}
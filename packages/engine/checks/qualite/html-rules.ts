import { type ConfigData, HtmlValidate } from 'html-validate';
import { ESSENTIAL_RULES } from './limits.js';

const rules: ConfigData['rules'] = {};
for (const id of ESSENTIAL_RULES) {
  rules[id] =
    id === 'no-raw-characters' ? ['error', { relaxed: true }] : 'error';
}

const validator = new HtmlValidate({
  root: true,
  elements: ['html5'],
  rules,
});

/** Identifiants des règles essentielles en erreur, dans l’ordre du document. */
export function htmlErrors(html: string): string[] {
  const report = validator.validateStringSync(html);
  const found: string[] = [];
  for (const result of report.results) {
    for (const message of result.messages) {
      if (message.severity >= 2 && message.ruleId) found.push(message.ruleId);
    }
  }
  return found;
}

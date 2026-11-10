// survey-core is 394 KB gzipped: loaded only when a form opens. It runs the logic (conditions, validation,
// languages); our own components draw every field.
type Survey = typeof import('survey-core');
let loading: Promise<Survey> | undefined;

// An old version's hidden gps field is an unknown type to survey-core, so it is dropped: location is the answer's columns.
export const loadSurvey = () => (loading ??= import('survey-core').then(async (s) => (await import('survey-core/i18n/french'), s)));

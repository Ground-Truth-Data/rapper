// survey-core is 394 KB gzipped: loaded only when a form opens. It runs the logic (conditions, validation,
// languages); our own components draw every field.
type Survey = typeof import('survey-core');
let loading: Promise<Survey> | undefined;

export const loadSurvey = () =>
	(loading ??= import('survey-core').then((S) => {
		// GPS is our own field type: {lat, lng} from the phone.
		class QuestionGps extends S.Question {
			getType() {
				return 'gps';
			}
		}
		S.Serializer.addClass('gps', [], () => new QuestionGps(''), 'question');
		S.ElementFactory.Instance.registerElement('gps', (name) => new QuestionGps(name));
		return S;
	}));

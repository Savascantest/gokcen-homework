export const EFFECTIVE_DATE = "2026-09-14";
export const POLICY_VERSION = "gokcen-lesson-evidence-first@1";
export const TEMPLATE_CONTRACT_VERSION = "gokcen-six-section-interactive@1";
export const ASSESSMENT_POLICY_VERSION = "gokcen-formative-practice-and-challenge@1";
export const LEARNER_LANGUAGE_POLICY = "english-first-targeted-turkish-grammar-support";
export const FUTURE_SECTION_FUNCTIONS = new Set(["grammar", "vocabulary", "reading", "listening", "speaking-roleplay", "challenge"]);
export const INDEX_FIELDS = ["id", "date", "title", "path", "policyVersion", "templateContractVersion", "assessmentPolicyVersion"];

const prohibitedKeyParts = [
  "meetinguuid", "meetingid", "zoomid", "zoommeeting", "transcript", "teachernote",
  "privatesource", "sourceasset", "lessonrecord", "routerrun", "routerstate", "taskid",
  "executionreceipt", "privateplanning", "sourcehash", "learnerstate", "studentprofile",
  "internalrecord", "secret", "token", "password"
];

const opaquePackageId = /^\d{4}-\d{2}-\d{2}-[a-z0-9]{10,24}$/;
const uuidLike = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
const privatePath = /(?:^[a-z]:\\|^\\\\|(?:^|\/)work\/private(?:\/|$))/i;

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function keyIsPrivate(key) {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return prohibitedKeyParts.some((part) => normalized.includes(part));
}

export function validatePublicPrivacy(value, location = "package") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validatePublicPrivacy(item, `${location}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      assert(!keyIsPrivate(key), `${location}.${key} is private public-package metadata`);
      validatePublicPrivacy(item, `${location}.${key}`);
    }
    return;
  }
  if (typeof value === "string") {
    assert(!privatePath.test(value), `${location} exposes a private filesystem path`);
  }
}

function validateQuestion(question, location) {
  assert(question && typeof question === "object" && !Array.isArray(question), `${location} must be an object`);
  assert(typeof question.id === "string" && question.id.trim(), `${location}.id is required`);
  assert(typeof question.prompt === "string" && question.prompt.trim(), `${location}.prompt is required`);
  assert(Array.isArray(question.choices) && question.choices.length >= 2, `${location}.choices must contain at least two options`);
  question.choices.forEach((choice, index) => assert(typeof choice === "string" && choice.trim(), `${location}.choices[${index}] must be non-empty text`));
  assert(Number.isInteger(question.answerIndex) && question.answerIndex >= 0 && question.answerIndex < question.choices.length, `${location}.answerIndex is outside its choices`);
}

export function validateAnswerDistribution(questions, label = "question set") {
  if (questions.length < 3) return;
  const answers = questions.map((question) => question.answerIndex);
  const counts = new Map();
  answers.forEach((answer) => counts.set(answer, (counts.get(answer) ?? 0) + 1));
  const largest = Math.max(...counts.values());
  assert(largest !== questions.length, `${label} has every correct answer in one position`);
  if (questions.length >= 4) assert(largest / questions.length < 0.75, `${label} has a severely dominant answer position`);
  for (let index = 2; index < answers.length; index += 1) {
    assert(!(answers[index] === answers[index - 1] && answers[index] === answers[index - 2]), `${label} has an obvious repeated answer-position sequence`);
  }
  if (questions.length >= 4 && new Set(answers).size === 2) {
    const alternating = answers.every((answer, index) => answer === answers[index % 2]);
    assert(!alternating, `${label} has an obvious alternating answer-position sequence`);
  }
}

function collectQuestions(sections) {
  return sections.flatMap((section) => Array.isArray(section.questions) ? section.questions : []);
}

export function validateFuturePackage(pkg) {
  assert(pkg && typeof pkg === "object" && !Array.isArray(pkg), "Package must be an object");
  validatePublicPrivacy(pkg);
  assert(typeof pkg.id === "string" && opaquePackageId.test(pkg.id) && !uuidLike.test(pkg.id), "Future package id must be a privacy-safe dated opaque identifier");
  assert(typeof pkg.date === "string" && pkg.date >= EFFECTIVE_DATE, `Future package date must be on or after ${EFFECTIVE_DATE}`);
  assert(pkg.policyVersion === POLICY_VERSION, "Future package has an invalid policyVersion");
  assert(pkg.templateContractVersion === TEMPLATE_CONTRACT_VERSION, "Future package has an invalid templateContractVersion");
  assert(pkg.assessmentPolicyVersion === ASSESSMENT_POLICY_VERSION, "Future package has an invalid assessmentPolicyVersion");
  assert(pkg.learnerLanguagePolicy === LEARNER_LANGUAGE_POLICY, "Future package must declare the approved English-first learner language policy");
  assert(typeof pkg.title === "string" && pkg.title.trim(), "Future package title is required");
  assert(Array.isArray(pkg.sections) && pkg.sections.length > 0, "Future package needs at least one evidence-justified section");
  for (const [index, section] of pkg.sections.entries()) {
    assert(section && typeof section === "object" && !Array.isArray(section), `sections[${index}] must be an object`);
    assert(typeof section.id === "string" && section.id.trim(), `sections[${index}].id is required`);
    assert(typeof section.title === "string" && section.title.trim(), `sections[${index}].title is required`);
    if (section.function) assert(FUTURE_SECTION_FUNCTIONS.has(section.function), `sections[${index}].function is not an approved Gökçen function`);
    (section.questions ?? []).forEach((question, questionIndex) => validateQuestion(question, `sections[${index}].questions[${questionIndex}]`));
  }
  const questions = collectQuestions(pkg.sections);
  const ids = new Set();
  const prompts = new Set();
  for (const question of questions) {
    assert(!ids.has(question.id), `Duplicate question id: ${question.id}`);
    assert(!prompts.has(question.prompt.trim()), `Duplicate question prompt: ${question.prompt}`);
    ids.add(question.id);
    prompts.add(question.prompt.trim());
  }
  validateAnswerDistribution(questions, "Future package questions");
  return true;
}

export function validateFutureIndex(index) {
  assert(Array.isArray(index), "Future index must be an array");
  const ids = new Set();
  for (const [position, entry] of index.entries()) {
    assert(entry && typeof entry === "object" && !Array.isArray(entry), `index[${position}] must be an object`);
    validatePublicPrivacy(entry, `index[${position}]`);
    exactIndexKeys(entry, position);
    assert(opaquePackageId.test(entry.id) && !uuidLike.test(entry.id), `index[${position}].id is unsafe`);
    assert(entry.date >= EFFECTIVE_DATE, `index[${position}].date is before the future boundary`);
    assert(entry.path === `./${entry.id}/homework.json`, `index[${position}].path is not the safe package path`);
    assert(entry.policyVersion === POLICY_VERSION && entry.templateContractVersion === TEMPLATE_CONTRACT_VERSION && entry.assessmentPolicyVersion === ASSESSMENT_POLICY_VERSION, `index[${position}] has incorrect Architecture v1 identifiers`);
    assert(!ids.has(entry.id), `Duplicate index id: ${entry.id}`);
    ids.add(entry.id);
  }
  return true;
}

function exactIndexKeys(entry, position) {
  const keys = Object.keys(entry).sort();
  const expected = [...INDEX_FIELDS].sort();
  assert(JSON.stringify(keys) === JSON.stringify(expected), `index[${position}] must contain only whitelisted navigation fields`);
}

export function browserProgressKey(packageId) {
  assert(opaquePackageId.test(packageId), "Cannot namespace browser progress for an unsafe package id");
  return `gokcen-homework-package-${packageId}-v1`;
}

export function isNoHomeworkOutcome(result) {
  return result?.outcome === "NO_HOMEWORK" && result.publicPackageCreated === false;
}

export function isApprovedGokcenAlias(value) {
  return value === "Gökçen" || value === "Gokcen";
}

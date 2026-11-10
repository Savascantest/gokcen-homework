import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  ASSESSMENT_POLICY_VERSION,
  LEARNER_LANGUAGE_POLICY,
  POLICY_VERSION,
  TEMPLATE_CONTRACT_VERSION,
  browserProgressKey,
  isApprovedGokcenAlias,
  isNoHomeworkOutcome,
  validateFutureIndex,
  validateFuturePackage
} from "../scripts/lib/gokcen-architecture-v1-package.mjs";

const basePackage = () => ({
  id: "2026-09-16-k7m4n8p2q6",
  date: "2026-09-16",
  title: "Synthetic future package",
  policyVersion: POLICY_VERSION,
  templateContractVersion: TEMPLATE_CONTRACT_VERSION,
  assessmentPolicyVersion: ASSESSMENT_POLICY_VERSION,
  learnerLanguagePolicy: LEARNER_LANGUAGE_POLICY,
  sections: [{
    id: "grammar",
    title: "Grammar",
    function: "grammar",
    content: "Use the past forms in context.",
    questions: [
      { id: "q1", prompt: "Choose one.", choices: ["a", "b", "c", "d"], answerIndex: 0 },
      { id: "q2", prompt: "Choose two.", choices: ["a", "b", "c", "d"], answerIndex: 1 },
      { id: "q3", prompt: "Choose three.", choices: ["a", "b", "c", "d"], answerIndex: 2 },
      { id: "q4", prompt: "Choose four.", choices: ["a", "b", "c", "d"], answerIndex: 3 },
      { id: "q5", prompt: "Choose five.", choices: ["a", "b", "c", "d"], answerIndex: 1 }
    ]
  }]
});

const expectFail = (build, message) => assert.throws(() => validateFuturePackage(build()), message);

test("valid future package supports flexible section omission and concise Turkish grammar scaffolding", () => {
  const pkg = basePackage();
  pkg.sections[0].content = "Use the past forms in context. Türkçe not: when = -dığında.";
  assert.equal(validateFuturePackage(pkg), true);
});
test("the historical 2 September static workspace remains the legacy default", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("../docs/index.html", import.meta.url), "utf8"),
    readFile(new URL("../docs/app.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /02 SEPTEMBER 2026/);
  assert.match(app, /gokcen-homework-full-v1/);
});
test("published future packages remain privacy-safe, validated learning material", async () => {
  const ids = ["2026-09-14-r5n8c2z6w3", "2026-09-16-m4q7r2v9k6", "2026-11-04-c7n2p8v4r6"];
  const packages = await Promise.all(ids.map(async (id) => JSON.parse(await readFile(new URL(`../docs/homeworks/${id}/homework.json`, import.meta.url), "utf8"))));
  packages.forEach((pkg, index) => {
    assert.equal(pkg.id, ids[index]);
    assert.equal(validateFuturePackage(pkg), true);
    assert.ok(pkg.sections.length >= 6);
    assert.equal(JSON.stringify(pkg).includes("Savascan"), false);
    assert.equal(JSON.stringify(pkg).includes("Zoom"), false);
  });
});
test("future packages use accessible section tabs and retain device-local progress", async () => {
  const [renderer, curriculum] = await Promise.all([
    readFile(new URL("../docs/homeworks/workspace.js", import.meta.url), "utf8"),
    readFile(new URL("../docs/homeworks/curriculum.js", import.meta.url), "utf8")
  ]);
  assert.match(renderer, /role=\"tablist\"/);
  assert.match(renderer, /role=\"tabpanel\"/);
  assert.match(renderer, /state\.tab/);
  assert.match(renderer, /lesson-select/);
  assert.match(renderer, /flashcard/);
  assert.match(curriculum, /britishcouncil\.org/);
  assert.equal(curriculum.includes("Savascan"), false);
  assert.equal(curriculum.includes("Zoom"), false);
});
test("future packages require each approved Architecture v1 id", () => {
  expectFail(() => ({ ...basePackage(), policyVersion: "sumeyye-weekend-monday@1" }), "other student policy fails");
  expectFail(() => ({ ...basePackage(), templateContractVersion: "wrong@1" }), "wrong template fails");
  expectFail(() => ({ ...basePackage(), assessmentPolicyVersion: "wrong@1" }), "wrong assessment fails");
});
test("future packages require the approved English-first language contract", () => {
  expectFail(() => ({ ...basePackage(), learnerLanguagePolicy: "turkish-first" }), "unapproved language policy fails");
});
test("future package identifiers must be opaque and privacy safe", () => {
  expectFail(() => ({ ...basePackage(), id: "2026-09-16-123e4567-e89b-12d3-a456-426614174000" }), "UUID fails");
  expectFail(() => ({ ...basePackage(), id: "berra" }), "Berra identifier fails");
});
test("recursive public privacy validation rejects private structured metadata", () => {
  expectFail(() => ({ ...basePackage(), meetingUuid: "private" }), "root leak fails");
  expectFail(() => ({ ...basePackage(), sections: [{ ...basePackage().sections[0], nested: { teacherNote: "private" } }] }), "nested leak fails");
  expectFail(() => ({ ...basePackage(), sourcePath: "C:\\work\\private\\lesson.json" }), "private path fails");
});
test("valid public resource URL remains valid", () => {
  const pkg = basePackage();
  pkg.sections[0].resourceUrl = "https://example.org/listen";
  assert.equal(validateFuturePackage(pkg), true);
});
test("question structure and duplicate checks reject malformed content", () => {
  expectFail(() => ({ ...basePackage(), sections: [{ ...basePackage().sections[0], questions: [{ id: "q1", prompt: "", choices: ["a"], answerIndex: 1 }] }] }), "malformed question fails");
  expectFail(() => { const pkg = basePackage(); pkg.sections[0].questions[1].id = "q1"; return pkg; }, "duplicate id fails");
  expectFail(() => { const pkg = basePackage(); pkg.sections[0].questions[1].prompt = "Choose one."; return pkg; }, "duplicate prompt fails");
});
test("pathological answer-position patterns fail while mixed answers pass", () => {
  expectFail(() => { const pkg = basePackage(); pkg.sections[0].questions.forEach((question) => { question.answerIndex = 0; }); return pkg; }, "all first answers fail");
  expectFail(() => { const pkg = basePackage(); pkg.sections[0].questions.forEach((question, index) => { question.answerIndex = index === 4 ? 1 : 0; }); return pkg; }, "severe dominance fails");
  expectFail(() => { const pkg = basePackage(); pkg.sections[0].questions = pkg.sections[0].questions.slice(0, 4); pkg.sections[0].questions.forEach((question, index) => { question.answerIndex = index % 2; }); return pkg; }, "alternation fails");
  assert.equal(validateFuturePackage(basePackage()), true);
});
test("future index is whitelist-only and can be empty", () => {
  assert.equal(validateFutureIndex([]), true);
  const pkg = basePackage();
  const entry = { id: pkg.id, date: pkg.date, title: pkg.title, path: `./${pkg.id}/homework.json`, policyVersion: POLICY_VERSION, templateContractVersion: TEMPLATE_CONTRACT_VERSION, assessmentPolicyVersion: ASSESSMENT_POLICY_VERSION };
  assert.equal(validateFutureIndex([entry]), true);
  assert.throws(() => validateFutureIndex([{ ...entry, teacherNote: "private" }]));
});
test("BrowserProgress is package-namespaced and separate from LearnerState", () => {
  assert.equal(browserProgressKey(basePackage().id), "gokcen-homework-package-2026-09-16-k7m4n8p2q6-v1");
  assert.notEqual(browserProgressKey(basePackage().id), "gokcen-homework-full-v1");
});
test("NO_HOMEWORK creates no public package and only approved direct aliases match", () => {
  assert.equal(isNoHomeworkOutcome({ outcome: "NO_HOMEWORK", publicPackageCreated: false }), true);
  assert.equal(isNoHomeworkOutcome({ outcome: "NO_HOMEWORK", publicPackageCreated: true }), false);
  assert.equal(isApprovedGokcenAlias("Gökçen"), true);
  assert.equal(isApprovedGokcenAlias("Gokcen"), true);
  assert.equal(isApprovedGokcenAlias("berra"), false);
  assert.equal(isApprovedGokcenAlias("Berra Selin Temur"), false);
});
test("the confirmed 14 September lesson shape is representable without filler", () => {
  const pkg = basePackage();
  pkg.title = "Synthetic Past Simple and Past Continuous lesson";
  pkg.sections = [
    { id: "grammar", title: "Past Simple, Past Continuous, when and while", function: "grammar", content: "Use the forms in context.", questions: pkg.sections[0].questions },
    { id: "vocabulary", title: "Meetings and memories", function: "vocabulary", content: "Use the new words in a memory." },
    { id: "reading", title: "An unforgettable meeting", function: "reading", content: "Read for the main idea." },
    { id: "listening", title: "A memorable conversation", function: "listening", content: "Listen and replay as needed." }
  ];
  assert.equal(validateFuturePackage(pkg), true);
});

export const EDUCATION_LEVELS = [
  { value: "k2", label: "K-2" },
  { value: "grades_3_5", label: "Grades 3-5" },
  { value: "grades_6_8", label: "Grades 6-8" },
  { value: "high_school", label: "High School" },
  { value: "college", label: "College" },
  { value: "graduate", label: "Graduate" },
] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number]["value"];

export const EDUCATION_LEVEL_GUIDANCE: Record<EducationLevel, string> = {
  k2: `Reading Level: Very simple. Sentence Length: 5-10 words. Vocabulary: Common words only, define new terms inline. Concept Approach: Analogies to everyday life, no abstraction. Use simple stories and comparisons a young child would understand.`,
  grades_3_5: `Reading Level: Elementary. Sentence Length: 10-15 words. Vocabulary: Some domain terms with definitions. Concept Approach: Simple cause-and-effect, concrete examples. Build on what students already know from daily life.`,
  grades_6_8: `Reading Level: Middle school. Sentence Length: 15-20 words. Vocabulary: Domain vocabulary introduced gradually. Concept Approach: Some abstraction, structured reasoning. Students can handle "why" questions and multi-step explanations.`,
  high_school: `Reading Level: Moderate. Sentence Length: No limit. Vocabulary: Technical terms with context. Concept Approach: Full abstraction, critical analysis. Students can evaluate evidence and compare competing explanations.`,
  college: `Reading Level: Advanced. Sentence Length: No limit. Vocabulary: Assumed domain familiarity. Concept Approach: Deep analysis, primary sources. Students can engage with nuance, uncertainty, and methodological debates.`,
  graduate: `Reading Level: Expert. Sentence Length: No limit. Vocabulary: Specialist terminology. Concept Approach: Research-level, nuanced arguments. Assume strong foundational knowledge; focus on frontiers, open questions, and methodological rigor.`,
};

export function getEducationGuidance(level: string): string {
  return EDUCATION_LEVEL_GUIDANCE[level as EducationLevel] || EDUCATION_LEVEL_GUIDANCE.college;
}

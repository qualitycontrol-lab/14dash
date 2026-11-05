export const TRAINING_CATEGORIES = [
  "Hubbard College of Administration",
  "Center for Self Governance",
  "Train the Trainer",
  "Learning Forum",
  "Online Training Academy",
] as const;

export type TrainingCategory = (typeof TRAINING_CATEGORIES)[number];

export function isTrainingCategory(value: unknown): value is TrainingCategory {
  return (
    typeof value === "string" &&
    TRAINING_CATEGORIES.some((category) => category === value)
  );
}

export const answerJudgeResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    artistCorrect: {
      type: "boolean",
    },
    titleCorrect: {
      type: "boolean",
    },
    fullArtistMatch: {
      type: "boolean",
    },
    fullTitleMatch: {
      type: "boolean",
    },
    reason: {
      type: "string",
    },
  },
  required: [
    "artistCorrect",
    "titleCorrect",
    "fullArtistMatch",
    "fullTitleMatch",
    "reason",
  ],
};

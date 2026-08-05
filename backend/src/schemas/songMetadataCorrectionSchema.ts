export const songMetadataCorrectionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    artist: {
      type: "string",
    },
    title: {
      type: "string",
    },
  },
  required: ["artist", "title"],
};

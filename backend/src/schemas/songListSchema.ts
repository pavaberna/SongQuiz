export function buildSongListResponseSchema(songCount: number) {
  return {
    type: "array",
    minItems: songCount,
    maxItems: songCount,
    items: {
      type: "object",
      additionalProperties: false,
      properties: {
        artist: {
          type: "string",
        },
        title: {
          type: "string",
        },
        year: {
          type: "integer",
        },
        genres: {
          type: "array",
          minItems: 1,
          items: {
            type: "string",
          },
        },
      },
      required: ["artist", "title", "year", "genres"],
    },
  };
}

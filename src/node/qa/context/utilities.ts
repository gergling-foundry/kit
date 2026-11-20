import { deepReduce } from "@/core";
import { ContextReducer } from "../types";

export const contextReducer: ContextReducer = (state, action) => {
  const usedChars = state.usedChars + action.usedChars;
  if (usedChars <= action.maxTotalChars) return deepReduce(state, {
    usedChars,
    includedFiles: [...state.includedFiles, action.includedFile],
    sections: [
      ...state.sections,
      action.section,
    ],
  });
  return deepReduce(state, {
    truncatedFiles: [...state.truncatedFiles, action.includedFile],
  });
};

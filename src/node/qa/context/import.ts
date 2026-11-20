import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import { AsyncReducer, stackReducersAsync } from "@/core";
import { normalizeRepoPath } from "@/schema";
import { resolveLocalTsImport } from "@/node/file";
import { ContextBaseAction, ContextState } from "../types";

const RELATIVE_IMPORT_REGEX =
  /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"](?<specifier>\.[^'"]+)['"]/g;

const createImportReducer = (
  match: RegExpExecArray
): AsyncReducer<ContextState, ContextBaseAction> => async (
  state,
  { delta, maxTotalChars, rootDir, targetAbs }
) => {
    const specifier = match.groups?.specifier;
    if (!specifier) return state;

    const resolvedImportAbs = await resolveLocalTsImport(
      targetAbs,
      specifier,
      rootDir
    );
    if (!resolvedImportAbs || resolvedImportAbs === targetAbs) return state;

    const relImportPath = normalizeRepoPath(relative(rootDir, resolvedImportAbs));

    // Pure deduplication via existing reducer state (no external mutable Set)
    const alreadyProcessed =
      state.includedFiles.includes(relImportPath) ||
      state.truncatedFiles.includes(relImportPath);
    if (alreadyProcessed) return state;

    const importContent = await readFile(resolvedImportAbs, 'utf8');

    return delta(state, {
      includedFile: relImportPath,
      maxTotalChars,
      section: `<imported_dependency path="${relImportPath}">\n${importContent}\n</imported_dependency>`,
      usedChars: importContent.length,
    });
  };

export const reduceContextForLocalImports: AsyncReducer<ContextState, ContextBaseAction> = async (
  state,
  action
) => {
  if (!action.includeLocalImports) return state;

  const importReducers = [...action.targetContent.matchAll(RELATIVE_IMPORT_REGEX)]
    .map(createImportReducer);

  return stackReducersAsync(importReducers)(state, action);
};

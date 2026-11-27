import { stackReducers } from "@/core";
import {
  ParsedCoverageSummary,
  TscDiagnostic
} from "../types";
import {
  FileHealthMap,
  reduceCoverageMapping,
  reduceTscMapping
} from "./reducers";

export const transformFileHealthMap = ({ coverageSummary, tscDiagnostics }: {
  coverageSummary: ParsedCoverageSummary;
  tscDiagnostics: TscDiagnostic[];
}) => stackReducers<FileHealthMap, unknown>([
  (state) => reduceTscMapping(state, tscDiagnostics),
  (state) => reduceCoverageMapping(state, coverageSummary),
])({}, '');

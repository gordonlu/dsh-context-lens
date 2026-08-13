/**
 * dsh-context-lens — Request Context Profiler for DeepSeek Harness.
 *
 * The server half is a pure observer: it registers the `contextLens` session
 * projection (one record per real LLM request, request-to-request diffs,
 * cache-reuse correlation) and nothing else. No model tools, no prompt
 * injection, no extra LLM calls — model-visible token overhead is zero.
 *
 * @module dsh-context-lens
 */
import type { Context } from '@deepseek-ai/cordis';
import { z } from 'zod';
export declare const name = "context-lens";
/** The plugin needs no services up front; the projection registry is an optional child. */
export declare const inject: readonly string[];
export type Config = Readonly<Record<string, never>>;
export declare const Config: z.ZodType<Config>;
/**
 * Install the observer: register the `contextLens` projection unit when the
 * session-projection registry is present (it ships in the base profile). The
 * registration is an effect on this fiber, so unloading the plugin removes
 * the key from snapshots and client reads become capability absence.
 * @param ctx - the plugin context.
 */
export declare function apply(ctx: Context): void;

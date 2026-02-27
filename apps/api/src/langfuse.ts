/**
 * Langfuse + OpenTelemetry instrumentation for AI agent observability.
 * Must be imported before any other modules to ensure all spans are captured.
 */
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";

const langfuseEnabled =
  !!process.env.LANGFUSE_SECRET_KEY && !!process.env.LANGFUSE_PUBLIC_KEY;

if (langfuseEnabled) {
  const sdk = new NodeSDK({
    spanProcessors: [new LangfuseSpanProcessor()]
  });

  sdk.start();

  console.log("[Langfuse] OpenTelemetry tracing initialized");
} else {
  console.log(
    "[Langfuse] Skipped — LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY not set"
  );
}

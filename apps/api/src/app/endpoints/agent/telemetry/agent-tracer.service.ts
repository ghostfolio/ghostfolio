import { Injectable } from '@nestjs/common';
import type { SpanAttributeValue } from '@opentelemetry/api';
import { context, Span, SpanStatusCode, trace } from '@opentelemetry/api';

@Injectable()
export class AgentTracerService {
  private readonly tracer = trace.getTracer('ghostfolio-agent');

  public async withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    attributes?: Record<string, SpanAttributeValue>
  ): Promise<T> {
    return this.tracer.startActiveSpan(
      name,
      { attributes },
      async (span: Span) => {
        try {
          const result = await fn(span);
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : String(error)
          });

          if (error instanceof Error) {
            span.recordException(error);
          }

          throw error;
        } finally {
          span.end();
        }
      }
    );
  }

  public async *withSpanGenerator<T>(
    name: string,
    fn: (span: Span) => AsyncGenerator<T>,
    attributes?: Record<string, SpanAttributeValue>
  ): AsyncGenerator<T> {
    const span = this.tracer.startSpan(name, { attributes });
    const spanContext = trace.setSpan(context.active(), span);

    try {
      const generator = context.with(spanContext, () => fn(span));

      for await (const value of generator) {
        yield value;
      }

      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error)
      });

      if (error instanceof Error) {
        span.recordException(error);
      }

      throw error;
    } finally {
      span.end();
    }
  }

  public startSpan(
    name: string,
    attributes?: Record<string, SpanAttributeValue>
  ): {
    span: Span;
    setAttribute: (key: string, value: SpanAttributeValue) => void;
    setOk: () => void;
    setError: (error: unknown) => void;
    end: () => void;
  } {
    const span = this.tracer.startSpan(name, { attributes });
    return {
      span,
      setAttribute: (key: string, value: SpanAttributeValue) => {
        span.setAttribute(key, value);
      },
      setOk: () => {
        span.setStatus({ code: SpanStatusCode.OK });
      },
      setError: (error: unknown) => {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error)
        });

        if (error instanceof Error) {
          span.recordException(error);
        }
      },
      end: () => span.end()
    };
  }

  public startChildSpan(
    name: string,
    parentSpan: Span,
    attributes?: Record<string, SpanAttributeValue>
  ): {
    span: Span;
    setAttribute: (key: string, value: SpanAttributeValue) => void;
    setOk: () => void;
    setError: (error: unknown) => void;
    end: () => void;
  } {
    const parentContext = trace.setSpan(context.active(), parentSpan);
    const span = this.tracer.startSpan(name, { attributes }, parentContext);
    return {
      span,
      setAttribute: (key: string, value: SpanAttributeValue) => {
        span.setAttribute(key, value);
      },
      setOk: () => {
        span.setStatus({ code: SpanStatusCode.OK });
      },
      setError: (error: unknown) => {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error)
        });

        if (error instanceof Error) {
          span.recordException(error);
        }
      },
      end: () => span.end()
    };
  }
}

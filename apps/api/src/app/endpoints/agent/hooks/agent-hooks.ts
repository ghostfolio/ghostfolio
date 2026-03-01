import type {
  HookCallbackMatcher,
  HookEvent,
  PreToolUseHookInput,
  PostToolUseHookInput,
  SyncHookJSONOutput
} from '@anthropic-ai/claude-agent-sdk';
import type { Logger } from '@nestjs/common';

const WRITE_TOOL_PREFIXES = [
  'create_',
  'update_',
  'delete_',
  'transfer_',
  'manage_'
];

function isWriteOperation(toolName: string): boolean {
  const shortName = toolName.replace('mcp__ghostfolio__', '');
  return WRITE_TOOL_PREFIXES.some((prefix) => shortName.startsWith(prefix));
}

export function createAgentHooks(
  logger: Logger
): Partial<Record<HookEvent, HookCallbackMatcher[]>> {
  return {
    PreToolUse: [
      {
        hooks: [
          async (input: PreToolUseHookInput): Promise<SyncHookJSONOutput> => {
            const shortName = input.tool_name.replace('mcp__ghostfolio__', '');

            if (isWriteOperation(input.tool_name)) {
              logger.warn(
                `Write tool invoked: ${shortName} | input: ${JSON.stringify(input.tool_input).slice(0, 200)}`
              );

              return {
                hookSpecificOutput: {
                  hookEventName: 'PreToolUse',
                  permissionDecision: 'allow'
                }
              };
            }

            return {
              hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow'
              }
            };
          }
        ]
      }
    ],
    PostToolUse: [
      {
        hooks: [
          async (input: PostToolUseHookInput): Promise<SyncHookJSONOutput> => {
            const shortName = input.tool_name.replace('mcp__ghostfolio__', '');
            const isError =
              typeof input.tool_response === 'object' &&
              input.tool_response !== null &&
              'isError' in input.tool_response &&
              (input.tool_response as any).isError;

            logger.debug(
              `Tool completed: ${shortName} | ${isError ? 'ERROR' : 'OK'}`
            );

            return {
              hookSpecificOutput: {
                hookEventName: 'PostToolUse'
              }
            };
          }
        ]
      }
    ]
  };
}

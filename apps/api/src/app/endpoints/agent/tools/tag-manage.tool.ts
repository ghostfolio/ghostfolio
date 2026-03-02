import { TagService } from '@ghostfolio/api/services/tag/tag.service';

import { tool } from 'ai';
import { z } from 'zod';

export function createTagManageTool({
  tagService,
  userId
}: {
  tagService: TagService;
  userId: string;
}) {
  return tool({
    description:
      'Manage tags for organizing and categorizing transactions. Tags can be applied to activities to group them (e.g., "Long Term", "Tax Loss Harvest", "Retirement"). Use this to create new tags, rename existing ones, delete unused tags, or list all available tags.',
    needsApproval:
      process.env.SKIP_APPROVAL === 'true'
        ? false
        : (input) => input.action !== 'list',
    inputSchema: z.object({
      action: z
        .enum(['create', 'update', 'delete', 'list'])
        .describe(
          "Action to perform. 'create': make a new tag. 'update': rename an existing tag. 'delete': remove a tag from all transactions. 'list': show all tags."
        ),
      name: z
        .string()
        .optional()
        .describe(
          "Tag name. Required for 'create' and 'update'. E.g. 'Long Term', 'Speculative', 'Tax Loss Harvest'."
        ),
      tagId: z
        .string()
        .uuid()
        .optional()
        .describe(
          "Tag ID. Required for 'update' and 'delete'. Get this from action 'list' results."
        )
    }),
    execute: async (input) => {
      try {
        switch (input.action) {
          case 'create': {
            const tag = await tagService.createTag({
              name: input.name,
              user: { connect: { id: userId } }
            });

            return { id: tag.id, name: tag.name };
          }

          case 'update': {
            const tag = await tagService.updateTag({
              data: { name: input.name },
              where: { id: input.tagId }
            });

            return { id: tag.id, name: tag.name };
          }

          case 'delete': {
            const tag = await tagService.deleteTag({ id: input.tagId });

            return { deleted: true, name: tag.name };
          }

          case 'list': {
            const tags = await tagService.getTagsForUser(userId);

            return tags.map(({ id, name, isUsed }) => ({ id, name, isUsed }));
          }
        }
      } catch (error) {
        return {
          error: `Failed to ${input.action} tag: ${error instanceof Error ? error.message : 'unknown error'}`
        };
      }
    }
  });
}

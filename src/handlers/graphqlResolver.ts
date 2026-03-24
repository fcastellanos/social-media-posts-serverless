import * as repo from '../lib/repository';

type AppSyncEvent = {
  arguments: Record<string, any>;
  info: {
    fieldName: string;
    parentTypeName: string;
  };
};

export const handler = async (event: AppSyncEvent): Promise<any> => {
  const { fieldName } = event.info;
  const args = event.arguments || {};

  switch (fieldName) {
    case 'listProperties': {
      const items = await repo.listProperties();
      return { items };
    }
    case 'getProperty': {
      return repo.getProperty(args.id);
    }
    case 'listPosts': {
      const items = await repo.listPosts();
      return { items };
    }
    case 'getPost': {
      return repo.getPost(args.id);
    }
    default:
      throw new Error(`Unknown field: ${fieldName}`);
  }
};

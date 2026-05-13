import { socialClient } from '#/api/request';

export async function getDictPullArray() {
  return socialClient.get('/dict/pull-array');
}

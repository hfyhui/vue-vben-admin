import { socialClient } from '../request';

export type SocialPageBody = {
  businessType?: string;
  current?: number;
  size?: number;
  taskId?: string;
};

/** POST .../import-task/page */
export async function postImportTaskPageApi(data: SocialPageBody) {
  return socialClient.post<{
    code: number;
    data: { records: any[]; total: number };
    msg?: string;
  }>('/import-task/page', data);
}

/** 下载导入日志 GET /import-task/download */
export async function getImportTaskLogApi(
  taskId: string,
  fileName: string = 'import_log.xlsx',
): Promise<void> {
  const blob = await socialClient.download(`/import-task/download/${taskId}`, {
    responseReturn: 'raw',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

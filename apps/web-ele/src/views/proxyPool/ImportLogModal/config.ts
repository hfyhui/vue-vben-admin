import { postImportTaskPageApi } from '#/api/core/proxy-pool-import-log';

export interface RowType {
  businessType: string; // "网络导入"
  createTime: string; // "2026-05-08 09:31:39"
  failedReason: string; // null
  failedRecords: string; // 0
  id: string; // "87"
  originalFileName: string; // "网络配置数据.csv"
  reportFileName: string; // null
  status: string; // "PENDING"
  statusName: string; // "待处理"
  successRecords: string; // 0
  totalRecords: string; // 0
  updateTime: string; // "2026-05-08 09:31:39"
  userName: string; // "管理员"
}
export async function getImportTaskPageApi(_params: {
  businessType?: string;
  current: number;
  size: number;
  taskId?: string;
}) {
  const { current, size, businessType, taskId } = _params;

  const reqParams: Record<string, any> = {
    current: current ?? 1,
    size: size ?? 10,
  };

  if (businessType) reqParams.businessType = businessType;
  if (taskId) reqParams.taskId = taskId;

  const res = await postImportTaskPageApi(reqParams);
  const list = (res.data.records || []) as RowType[];
  console.log(res);
  return {
    list,
    total: Number(res.data.total ?? 0),
  };
}
